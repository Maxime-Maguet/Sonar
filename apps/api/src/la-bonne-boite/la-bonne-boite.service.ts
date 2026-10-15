import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LeadFiche } from './helpers/normalize.js';

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
