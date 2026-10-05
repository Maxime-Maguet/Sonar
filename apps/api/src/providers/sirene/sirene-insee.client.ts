import {
  BadGatewayException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const SIRENE_BASE_URL = 'https://api.insee.fr/api-sirene/3.11';

/** At most 50 pages × default nombre 20 = 1000 établissements per search. */
export const SIRENE_SEARCH_MAX_PAGES = 50;
export const SIRENE_SEARCH_PAGE_SIZE = 20;
export const SIRENE_INSEE_DELAY = Symbol('SIRENE_INSEE_DELAY');

export type SireneDelayFn = (ms: number) => Promise<void>;

const defaultDelay: SireneDelayFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function sireneBackoffMs(attemptIndex: number): number {
  return 200 * 2 ** attemptIndex;
}

function isTimeout(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false;
  }
  const name = (error as { name: unknown }).name;
  return name === 'TimeoutError' || name === 'AbortError';
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return undefined;
}

@Injectable()
export class SireneInseeClient {
  private readonly delay: SireneDelayFn;

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(SIRENE_INSEE_DELAY) delay?: SireneDelayFn,
  ) {
    this.delay = delay ?? defaultDelay;
  }

  async getSiret(siret: string): Promise<unknown> {
    return this.getJson(`${SIRENE_BASE_URL}/siret/${siret}`);
  }

  /**
   * GET /siret?q=&nombre=&debut= until JSON `header.total`, empty page, or
   * {@link SIRENE_SEARCH_MAX_PAGES}.
   */
  async searchEtablissements(
    q: string,
    nombre: number = SIRENE_SEARCH_PAGE_SIZE,
  ): Promise<unknown[]> {
    const collected: unknown[] = [];
    let debut = 0;
    let total: number | undefined;

    for (let page = 0; page < SIRENE_SEARCH_MAX_PAGES; page += 1) {
      const url = new URL(`${SIRENE_BASE_URL}/siret`);
      url.searchParams.set('q', q);
      url.searchParams.set('nombre', String(nombre));
      url.searchParams.set('debut', String(debut));

      const body = asRecord(await this.getJson(url.toString()));
      const rows = Array.isArray(body?.etablissements)
        ? body.etablissements
        : [];
      if (rows.length === 0) {
        break;
      }
      collected.push(...rows);

      const header = asRecord(body?.header);
      if (typeof header?.total === 'number') {
        total = header.total;
      }
      if (total !== undefined && collected.length >= total) {
        break;
      }
      debut += nombre;
    }

    return collected;
  }

  private apiKey(): string {
    const apiKey = this.config.get<string>('INSEE_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('INSEE_API_KEY manquante', {
        cause: new Error('INSEE_API_KEY manquante'),
      });
    }
    return apiKey;
  }

  private async getJson(url: string): Promise<unknown> {
    const apiKey = this.apiKey();
    let lastTimeout = false;
    let lastStatus: number | undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'X-INSEE-Api-Key-Integration': apiKey,
          },
          signal: AbortSignal.timeout(10_000),
        });

        if (response.ok) {
          return await response.json();
        }

        if (!isRetryableStatus(response.status)) {
          throw new BadGatewayException(
            `Sirene INSEE a répondu ${response.status}`,
            {
              cause: new Error(`Sirene INSEE a répondu ${response.status}`),
            },
          );
        }

        lastStatus = response.status;
        lastTimeout = false;
      } catch (error) {
        if (
          error instanceof BadGatewayException ||
          error instanceof GatewayTimeoutException ||
          error instanceof ServiceUnavailableException
        ) {
          throw error;
        }
        if (isTimeout(error)) {
          lastTimeout = true;
          lastStatus = undefined;
        } else {
          throw new BadGatewayException('Sirene INSEE est injoignable');
        }
      }

      if (attempt < 2) {
        await this.delay(sireneBackoffMs(attempt));
      }
    }

    if (lastTimeout) {
      throw new GatewayTimeoutException(
        'Sirene INSEE n’a pas répondu à temps',
      );
    }
    if (lastStatus !== undefined) {
      throw new BadGatewayException(
        `Sirene INSEE a répondu ${lastStatus}`,
        {
          cause: new Error(`Sirene INSEE a répondu ${lastStatus}`),
        },
      );
    }
    throw new BadGatewayException('Sirene INSEE est injoignable');
  }
}
