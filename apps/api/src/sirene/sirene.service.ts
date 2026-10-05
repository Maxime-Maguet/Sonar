import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  asObject,
  asText,
  normalizeEtablissement,
  type CompanyFiche,
} from './helpers/normalize.js';
import {
  buildDiscoverySearchQuery,
  isAllowedCommune,
  isInDiscoveryNafScope,
} from './helpers/discovery.js';
import { InseeClient } from './helpers/insee.js';

export const COMPANY_SOURCE_SIRENE = 'SIRENE_INSEE';

export type SireneSyncResult = {
  scanned: number;
  upserted: number;
  skipped: number;
  skippedOutOfScope: number;
  truncated: boolean;
};

export async function saveCompany(prisma: PrismaService, fiche: CompanyFiche) {
  if (!fiche.siren) {
    throw new BadRequestException('Siren is required');
  }

  const lastSyncedAt = new Date();
  const fields = {
    ...(fiche.isHeadquarter ? { siretHeadquarter: fiche.siret } : {}),
    name: fiche.name,
    slug: fiche.slug,
    address: fiche.address,
    postalCode: fiche.postalCode,
    city: fiche.city ?? 'Toulouse',
    activityCode: fiche.activityCode,
    activityNomenclature: fiche.activityNomenclature,
    activityCodeNaf25: fiche.activityCodeNaf25,
    diffusionStatus: fiche.diffusionStatus,
    source: COMPANY_SOURCE_SIRENE,
    externalId: fiche.siren,
    lastSyncedAt,
  };

  return prisma.company.upsert({
    where: { siren: fiche.siren },
    create: { siren: fiche.siren, ...fields },
    update: fields,
  });
}

@Injectable()
export class SireneService {
  private readonly logger = new Logger(SireneService.name);
  private syncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly insee: InseeClient,
  ) {}

  async getEtablissementBySiret(siret: string) {
    return normalizeEtablissement(await this.insee.getSiret(siret));
  }

  async createEtablissement(siret: string) {
    return saveCompany(this.prisma, await this.getEtablissementBySiret(siret));
  }

  async syncDiscovery(): Promise<SireneSyncResult> {
    if (this.syncRunning) {
      throw new ConflictException('Synchronisation Sirene déjà en cours');
    }
    this.syncRunning = true;
    const result: SireneSyncResult = {
      scanned: 0,
      upserted: 0,
      skipped: 0,
      skippedOutOfScope: 0,
      truncated: false,
    };

    try {
      const search = await this.insee.searchEtablissements(
        buildDiscoverySearchQuery(),
      );
      result.truncated = search.truncated;
      for (const row of search.etablissements) {
        result.scanned += 1;
        await this.syncOneRow(row, result);
      }
      return result;
    } finally {
      this.syncRunning = false;
    }
  }

  private async syncOneRow(row: unknown, result: SireneSyncResult) {
    let fiche: CompanyFiche;
    try {
      fiche = normalizeEtablissement({ etablissement: row });
    } catch (error) {
      result.skipped += 1;
      this.logSkip('normalize', row, error);
      return;
    }

    if (
      !isAllowedCommune(fiche.communeInseeCode) ||
      !isInDiscoveryNafScope(fiche)
    ) {
      result.skippedOutOfScope += 1;
      this.logger.log(
        `sync skip out of scope siret=${fiche.siret} siren=${fiche.siren} status=${fiche.diffusionStatus}`,
      );
      return;
    }

    try {
      await saveCompany(this.prisma, fiche);
      result.upserted += 1;
    } catch (error) {
      result.skipped += 1;
      const reason =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
          ? 'unique'
          : 'other';
      this.logSkip(reason, row, error, fiche);
    }
  }

  private logSkip(
    reason: string,
    row: unknown,
    error: unknown,
    fiche?: CompanyFiche,
  ) {
    const rec = asObject(row);
    const unite = asObject(rec?.uniteLegale);
    const siret = fiche?.siret ?? asText(rec?.siret);
    const siren = fiche?.siren ?? asText(rec?.siren);
    const status =
      fiche?.diffusionStatus ??
      asText(rec?.statutDiffusionEtablissement) ??
      asText(unite?.statutDiffusionUniteLegale);

    this.logger.warn(
      `sync skip ${reason} siret=${siret ?? ''} siren=${siren ?? ''} status=${status ?? ''}`,
    );
    if (status !== 'P') {
      this.logger.debug(
        error instanceof Error ? error.message : `${reason} failed`,
      );
    }
  }
}
