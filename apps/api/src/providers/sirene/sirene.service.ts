import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeEtablissement } from './lib/normalize.js';
import { upsertCompany } from './lib/upsert.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const SIRENE_BASE_URL = 'https://api.insee.fr/api-sirene/3.11';

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

@Injectable()
export class SireneService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getEtablissementBySiret(siret: string) {
    const apiKey = this.config.get<string>('INSEE_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('INSEE_API_KEY manquante', {
        cause: new Error('INSEE_API_KEY manquante'),
      });
    }

    let response: Response;
    try {
      response = await fetch(`${SIRENE_BASE_URL}/siret/${siret}`, {
        headers: {
          Accept: 'application/json',
          'X-INSEE-Api-Key-Integration': apiKey,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (isTimeout(error)) {
        throw new GatewayTimeoutException(
          'Sirene INSEE n’a pas répondu à temps',
        );
      }
      throw new BadGatewayException('Sirene INSEE est injoignable');
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Sirene INSEE a répondu ${response.status}`,
        {
          cause: new Error(`Sirene INSEE a répondu ${response.status}`),
        },
      );
    }

    const data = await response.json();
    return normalizeEtablissement(data);
  }

  async createEtablissement(siret: string) {
    const fiche = await this.getEtablissementBySiret(siret);
    return upsertCompany(this.prisma, fiche);
  }
}
