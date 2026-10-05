import {
  BadGatewayException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asObject } from './normalize.js';

export const SIRENE_BASE_URL = 'https://api.insee.fr/api-sirene/3.11';
export const SIRENE_SEARCH_MAX_PAGES = 5;
export const SIRENE_SEARCH_PAGE_SIZE = 1000;
export const SIRENE_INSEE_DELAY = Symbol('SIRENE_INSEE_DELAY');

export type SireneDelayFn = (ms: number) => Promise<void>;

export type SireneSearchResult = {
  etablissements: unknown[];
  total?: number;
  truncated: boolean;
};

const sleep: SireneDelayFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function sireneBackoffMs(attemptIndex: number): number {
  return 200 * 2 ** attemptIndex;
}

function isTimeout(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

/** Appels HTTP vers l'API Sirene 3.11. */
@Injectable()
export class InseeClient {
  private readonly delay: SireneDelayFn;

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(SIRENE_INSEE_DELAY) delay?: SireneDelayFn,
  ) {
    this.delay = delay ?? sleep;
  }

  async getSiret(siret: string): Promise<unknown> {
    return this.getJson(`${SIRENE_BASE_URL}/siret/${siret}`);
  }

  async searchEtablissements(
    q: string,
    nombre: number = SIRENE_SEARCH_PAGE_SIZE,
  ): Promise<SireneSearchResult> {
    const collected: unknown[] = [];
    let debut = 0;
    let total: number | undefined;

    for (let page = 0; page < SIRENE_SEARCH_MAX_PAGES; page += 1) {
      const url = new URL(`${SIRENE_BASE_URL}/siret`);
      url.searchParams.set('q', q);
      url.searchParams.set('nombre', String(nombre));
      url.searchParams.set('debut', String(debut));

      const body = asObject(await this.getJson(url.toString()));
      const rows = Array.isArray(body?.etablissements)
        ? body.etablissements
        : [];
      const header = asObject(body?.header);
      if (typeof header?.total === 'number') {
        total = header.total;
      }
      if (rows.length === 0) {
        break;
      }
      collected.push(...rows);
      if (total !== undefined && collected.length >= total) {
        break;
      }
      debut += nombre;
    }

    return {
      etablissements: collected,
      total,
      truncated: typeof total === 'number' && collected.length < total,
    };
  }

  private apiKey(): string {
    const apiKey = this.config.get<string>('INSEE_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('INSEE_API_KEY manquante');
    }
    return apiKey;
  }

  private failHttp(status: number): never {
    const message = `Sirene INSEE a répondu ${status}`;
    if (status === 404) {
      throw new NotFoundException(message);
    }
    throw new BadGatewayException(message);
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
        if (response.status === 429 || response.status >= 500) {
          lastStatus = response.status;
          lastTimeout = false;
        } else {
          this.failHttp(response.status);
        }
      } catch (error) {
        if (
          error instanceof BadGatewayException ||
          error instanceof GatewayTimeoutException ||
          error instanceof ServiceUnavailableException ||
          error instanceof NotFoundException
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
      throw new GatewayTimeoutException('Sirene INSEE n’a pas répondu à temps');
    }
    if (lastStatus !== undefined) {
      this.failHttp(lastStatus);
    }
    throw new BadGatewayException('Sirene INSEE est injoignable');
  }
}
