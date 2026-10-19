import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeLead, type LeadFiche } from './helpers/normalize.js';
import { FranceTravailClient } from './helpers/france-travail.client.js';
import type { ListLeadsQueryDto } from './dto/list-leads-query.dto.js';
import type { LeadItemDto, LeadsPageDto } from './dto/lead-response.dto.js';
import { asNumber, asObject } from '../common/json.js';

export const COMPANY_SOURCE_LBB = 'LA_BONNE_BOITE';

// Fonction pour enregistrer une piste spontanée dans la base de données
export async function saveLead(prisma: PrismaService, lead: LeadFiche) {
  if (!lead.rome) {
    throw new BadRequestException('Rome is required');
  }
  // tx = transaction object (prisma) pour faire des opérations atomiques sur la base de données (tout ou rien)
  return prisma.$transaction(async (tx) => {
    const lastSyncedAt = new Date();
    let companyId: string;
    // on cherche la company par siren
    const bySiren = await tx.company.findUnique({
      where: { siren: lead.siren },
    });

    // si la company existe, on l'utilise
    if (bySiren) {
      companyId = bySiren.id;
    } else {
      // sinon, on cherche la company par siret
      const bySiret = await tx.company.findUnique({
        where: { siretHeadquarter: lead.siret },
      });
      // si la company existe, on l'utilise
      if (bySiret) {
        companyId = bySiret.id;
      } else {
        // sinon, on crée la company
        const company = await tx.company.create({
          data: {
            name: lead.name,
            slug: lead.slug,
            siren: lead.siren,
            siretHeadquarter: lead.siret,
            city: lead.city ?? 'Toulouse',
            source: COMPANY_SOURCE_LBB,
            externalId: lead.siren,
            lastSyncedAt,
          },
        });
        companyId = company.id;
      }
    }

    // on crée le signal dans la base de données
    await tx.recruitmentSignal.upsert({
      where: {
        source_externalId: {
          source: COMPANY_SOURCE_LBB,
          externalId: `${lead.siret}:${lead.rome}`,
        },
      },
      create: {
        companyId,
        type: 'POTENTIAL_RECRUITMENT',
        title: `Piste spontanée — ${lead.rome}`,
        source: COMPANY_SOURCE_LBB,
        externalId: `${lead.siret}:${lead.rome}`,
        detectedAt: lastSyncedAt,
        metadata: {
          rome: lead.rome,
          hiringPotential: lead.hiringPotential,
          isHighPotential: lead.isHighPotential,
        },
      },
      update: {
        companyId,
        detectedAt: lastSyncedAt,
        title: `Piste spontanée — ${lead.rome}`,
        metadata: {
          rome: lead.rome,
          hiringPotential: lead.hiringPotential,
          isHighPotential: lead.isHighPotential,
        },
      },
    });

    // on retourne l'id de la company
    return { companyId };
  });
}

@Injectable()
export class LaBonneBoiteService {
  // logger pour logguer les erreurs et les informations
  private readonly logger = new Logger(LaBonneBoiteService.name);
  constructor(
    private readonly franceTravailClient: FranceTravailClient,
    private readonly prisma: PrismaService,
  ) {}
  async list(query: ListLeadsQueryDto): Promise<LeadsPageDto> {
    const raw = await this.franceTravailClient.search({
      rome: query.rome,
      citycode: '31555',
      distance: 10,
      page: query.page,
      page_size: query.pageSize ?? 10, // default to 10
    });
    // on extrait les données de la réponse
    let hits = 0;
    let rawItems: unknown[] = []; // items de la réponse brute
    const body = asObject(raw); // on transforme la réponse brute en objet

    if (body) {
      // si la réponse est valide
      hits = asNumber(body.hits) ?? 0; // on extrait le nombre de hits
      rawItems = Array.isArray(body.items) ? body.items : []; // on extrait les items
    }
    this.logger.debug({ hits, rawCount: rawItems.length, rome: query.rome });
    const items: LeadItemDto[] = [];
    let skipped = 0;
    for (const item of rawItems) {
      const lead = normalizeLead(item); // on normalise l'item
      if (!lead || !lead.rome) {
        // si l'item n'est pas valide, on passe au suivant
        skipped++;
        this.logger.debug({ skip: true, reason: 'normalize' }); // pas le nom
        continue;
      }
      const { companyId } = await saveLead(this.prisma, lead); // on enregistre la piste spontanée dans la base de données
      this.logger.debug({ companyId }); // on loggue l'id de la company
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      }); // on cherche la company par id
      if (!company) {
        skipped++;
        continue; // si la company n'existe pas, on passe au suivant
      }
      items.push({
        // on ajoute l'item à la liste
        companyId,
        slug: company.slug,
        name: company.name,
        siren: lead.siren,
        siret: lead.siret,
        city: company.city,
        rome: lead.rome,
        hiringPotential: lead.hiringPotential,
        isHighPotential: lead.isHighPotential,
        source: COMPANY_SOURCE_LBB,
        detectedAt: new Date().toISOString(),
      });
    }
    this.logger.log({ rome: query.rome, page: query.page, hits, skipped }); // on loggue les informations
    return {
      hits, // on retourne le nombre de hits
      page: query.page, // on retourne le numéro de page
      pageSize: query.pageSize ?? 10, // on retourne la taille de page
      fetchedAt: new Date().toISOString(), // on retourne la date de récupération
      items, // on retourne les items
    };
  }
}
