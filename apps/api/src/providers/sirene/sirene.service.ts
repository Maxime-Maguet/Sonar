import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeEtablissement } from './sirene.normalize.js';
import { upsertCompany } from './sirene.upsert.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const SIRENE_BASE_URL = 'https://api.insee.fr/api-sirene/3.11';

@Injectable()
export class SireneService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getEtablissementBySiret(siret: string) {
    const apiKey = this.config.get<string>('INSEE_API_KEY');
    if (!apiKey) {
      throw new Error('INSEE_API_KEY manquante');
    }

    const response = await fetch(`${SIRENE_BASE_URL}/siret/${siret}`, {
      headers: {
        Accept: 'application/json',
        'X-INSEE-Api-Key-Integration': apiKey,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Sirene INSEE a répondu ${response.status}`);
    }

    const data = await response.json();
    return normalizeEtablissement(data);
  }

  async createEtablissement(siret: string) {
    const fiche = await this.getEtablissementBySiret(siret);
    console.log('2 fiche normalisée =', fiche);
    return upsertCompany(this.prisma, fiche);
  }
}
