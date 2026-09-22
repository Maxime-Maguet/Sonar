import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeEtablissement } from './sirene.normalize.js';

const SIRENE_BASE_URL = 'https://api.insee.fr/api-sirene/3.11';

@Injectable()
export class SireneService {
  constructor(private readonly config: ConfigService) {}

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
}
