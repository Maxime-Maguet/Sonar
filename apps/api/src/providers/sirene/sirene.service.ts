import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { normalizeEtablissement } from './lib/normalize.js';
import { upsertCompany } from './lib/upsert.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SireneInseeClient } from './sirene-insee.client.js';
import {
  buildDiscoverySearchQuery,
  isAllowedCommune,
  isInDiscoveryNafScope,
} from './sirene-discovery.config.js';

export type SireneSyncResult = {
  scanned: number;
  upserted: number;
  skipped: number;
  skippedOutOfScope: number;
};

@Injectable()
export class SireneService {
  private readonly logger = new Logger(SireneService.name);
  private syncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly insee: SireneInseeClient,
  ) {}

  async getEtablissementBySiret(siret: string) {
    const data = await this.insee.getSiret(siret);
    return normalizeEtablissement(data);
  }

  async createEtablissement(siret: string) {
    const fiche = await this.getEtablissementBySiret(siret);
    return upsertCompany(this.prisma, fiche);
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
    };
    try {
      const q = buildDiscoverySearchQuery();
      const rows = await this.insee.searchEtablissements(q);
      for (const row of rows) {
        result.scanned += 1;
        let fiche;
        try {
          fiche = normalizeEtablissement({ etablissement: row });
        } catch {
          result.skipped += 1;
          continue;
        }
        if (
          !isAllowedCommune(fiche.communeInseeCode) ||
          !isInDiscoveryNafScope(fiche)
        ) {
          result.skippedOutOfScope += 1;
          this.logger.log(
            `sync skip out of scope siret=${fiche.siret} siren=${fiche.siren} status=${fiche.diffusionStatus}`,
          );
          continue;
        }
        try {
          await upsertCompany(this.prisma, fiche);
          result.upserted += 1;
        } catch (error) {
          result.skipped += 1;
          this.logger.warn(
            `sync skip upsert siret=${fiche.siret} siren=${fiche.siren} status=${fiche.diffusionStatus}`,
          );
          this.logger.debug(
            error instanceof Error ? error.message : 'upsert failed',
          );
        }
      }
      return result;
    } finally {
      this.syncRunning = false;
    }
  }
}
