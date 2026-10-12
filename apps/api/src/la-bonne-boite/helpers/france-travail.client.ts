import {
  Injectable,
  Optional,
  BadGatewayException,
  Inject,
  ServiceUnavailableException,
  GatewayTimeoutException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Liste LBB v2 (OpenAPI GET /recherche). */
export const FT_BASE_URL =
  'https://api.francetravail.io/partenaire/labonneboite/v2/recherche';
/** OAuth client_credentials — URL partenaire, pas le host legacy entreprise.francetravail.fr. */
export const FT_TOKEN_URL =
  'https://authentification-partenaire.francetravail.io/connexion/oauth2/access_token?realm=/partenaire';
export const FT_SCOPE = 'search office api_labonneboitev2';
export const FT_SEARCH_MAX_ATTEMPTS = 3;
export const FT_SEARCH_TIMEOUT = 10_000;
/** Doc LBB : ≤ 2 req/s → 500 ms mini entre deux fetch (token ou métier). */
export const FT_MIN_GAP_MS = 500;
export const FT_TOKEN_SKEW_MS = 60_000;
export const FT_DELAY = Symbol('FT_DELAY');

export type FranceTravailSearchParams = {
  rome: string;
  citycode: string;
  distance: number;
  page: number;
  page_size: number;
};

export type FranceTravailDelayFn = (ms: number) => Promise<void>;

const sleep: FranceTravailDelayFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Backoff 500, 1000, 2000 ms (aligné sur le plancher 2 req/s). */
export function ftBackoffMs(attemptIndex: number): number {
  return FT_MIN_GAP_MS * 2 ** attemptIndex;
}
/** Vérifie si l'erreur est un timeout ou un abort. */
function isTimeout(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

/** Vérifie si l'erreur est une erreur HTTP connue. */
function isNestHttpError(error: unknown): boolean {
  return (
    error instanceof BadGatewayException ||
    error instanceof GatewayTimeoutException ||
    error instanceof ServiceUnavailableException ||
    error instanceof NotFoundException
  );
}

/** HTTP France Travail uniquement — pas de Prisma, pas de normalize. */
@Injectable()
export class FranceTravailClient {
  private readonly delay: FranceTravailDelayFn;
  /** Token d'accès en cache. */
  private cachedToken?: { accessToken: string; expiresAt: number };
  /** Horodatage du dernier fetch FT, pour respecter FT_MIN_GAP_MS. */
  private lastRequestAt = 0;

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(FT_DELAY) delay?: FranceTravailDelayFn,
  ) {
    this.delay = delay ?? sleep;
  }

  /**
   * Attend si le fetch précédent est trop récent (quota 2 req/s).
   * En test, `delay` est mocké : on n’attend pas vraiment.
   */
  private async pace(): Promise<void> {
    if (this.lastRequestAt > 0) {
      const wait = FT_MIN_GAP_MS - (Date.now() - this.lastRequestAt);
      if (wait > 0) {
        await this.delay(wait);
      }
    }
    this.lastRequestAt = Date.now();
  }

  /** Jeton en cache, ou POST client_credentials. Marge 60 s avant expires_in. */
  private async getToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken;
    }
    // Récupère le client ID et le client secret.
    const clientId = this.config.get<string>('FT_CLIENT_ID');
    const clientSecret = this.config.get<string>('FT_CLIENT_SECRET');
    // Si le client ID ou le client secret n'est pas défini, relance une exception ServiceUnavailableException.
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'FT_CLIENT_ID ou FT_CLIENT_SECRET manquant',
      );
    }

    // Construit le body de la requête.
    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('scope', FT_SCOPE);

    // Variables pour stocker les erreurs.
    let lastTimeout = false;
    let lastStatus: number | undefined;

    // Boucle pour réessayer jusqu'à 3 fois.
    for (let attempt = 0; attempt < FT_SEARCH_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.pace();
        // Appel HTTP vers l'API France Travail.
        const response = await fetch(FT_TOKEN_URL, {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(FT_SEARCH_TIMEOUT),
        });

        // Si la réponse est OK, récupère les données.
        if (response.ok) {
          const data = (await response.json()) as {
            access_token?: unknown;
            expires_in?: unknown;
          };
          // Si le token ou la durée d'expiration n'est pas défini, relance une exception BadGatewayException.
          if (
            typeof data.access_token !== 'string' ||
            !data.access_token ||
            typeof data.expires_in !== 'number'
          ) {
            throw new BadGatewayException(
              'Réponse token France Travail invalide',
            );
          }
          // Stocke le token et la durée d'expiration dans le cache.
          this.cachedToken = {
            accessToken: data.access_token,
            expiresAt: Date.now() + data.expires_in * 1000 - FT_TOKEN_SKEW_MS,
          };
          return this.cachedToken.accessToken; // Retourne le token.
        }

        // Si la réponse est 429 ou >= 500, stock les erreurs.
        if (response.status === 429 || response.status >= 500) {
          lastStatus = response.status;
          lastTimeout = false;
        } else {
          // Sinon, relance une exception BadGatewayException.
          throw new BadGatewayException(
            `France Travail token a répondu ${response.status}`,
          );
        }
      } catch (error) {
        // Si l'erreur est une erreur HTTP connue, relance l'erreur.
        if (isNestHttpError(error)) {
          throw error;
        }
        // Si l'erreur est un timeout ou un abort, stock les erreurs.
        if (isTimeout(error)) {
          lastTimeout = true;
          lastStatus = undefined;
        } else {
          // Sinon, relance une exception BadGatewayException.
          throw new BadGatewayException('France Travail est injoignable');
        }
      }

      if (attempt < FT_SEARCH_MAX_ATTEMPTS - 1) {
        await this.delay(ftBackoffMs(attempt)); // Attend le délai d'attente.
      }
    }

    // Si le timeout est atteint, relance une exception GatewayTimeoutException.
    if (lastTimeout) {
      throw new GatewayTimeoutException(
        'France Travail n’a pas répondu à temps',
      );
    }
    // Si le status n'est pas défini, relance une exception BadGatewayException.
    if (lastStatus !== undefined) {
      throw new BadGatewayException(
        `France Travail token a répondu ${lastStatus}`,
      );
    }
    throw new BadGatewayException('France Travail est injoignable'); // On relance l'erreur si le timeout ou le status n'est pas défini.
  }

  /** GET /recherche — JSON brut LBB. */
  async search(params: FranceTravailSearchParams): Promise<unknown> {
    // Construit l'URL de la requête.
    const url = new URL(FT_BASE_URL);
    url.searchParams.set('rome', params.rome);
    url.searchParams.set('citycode', params.citycode);
    url.searchParams.set('distance', String(params.distance));
    url.searchParams.set('page', String(params.page));
    url.searchParams.set('page_size', String(params.page_size));
    return this.getJson(url.toString()); // Appel HTTP vers l'API France Travail.
  }

  /** Gère les erreurs HTTP. */
  private failHttp(status: number): never {
    // Si le status est 404, relance une exception NotFoundException.
    const message = `France Travail a répondu ${status}`;
    if (status === 404) {
      throw new NotFoundException(message);
    }
    throw new BadGatewayException(message); // On relance l'erreur si le status n'est pas 404.
  }

  /**
   * GET métier + Bearer.
   * 401 : on jette le cache, un seul nouveau token, un retry.
   * 429 / 5xx / timeout : jusqu’à 3 essais (comme InseeClient).
   */
  private async getJson(url: string): Promise<unknown> {
    // Variables pour stocker les erreurs.
    let lastTimeout = false;
    let lastStatus: number | undefined;
    let retried401 = false;

    for (let attempt = 0; attempt < FT_SEARCH_MAX_ATTEMPTS; attempt += 1) {
      try {
        const token = await this.getToken(); // Récupère le token d'accès.
        await this.pace();
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(FT_SEARCH_TIMEOUT),
        });

        // Si la réponse est OK, récupère les données.
        if (response.ok) {
          return await response.json();
        }

        // Si le jeton est refusé, invalide le cache, un retry (pas failHttp tout de suite).
        if (response.status === 401 && !retried401) {
          this.cachedToken = undefined;
          retried401 = true;
          lastStatus = 401;
          lastTimeout = false;
        } else if (response.status === 429 || response.status >= 500) {
          // Si la réponse est 429 ou >= 500, stock les erreurs.
          lastStatus = response.status;
          lastTimeout = false;
        } else {
          this.failHttp(response.status); // Sinon, relance une exception BadGatewayException.
        }
      } catch (error) {
        // Si l'erreur est une erreur HTTP connue, relance l'erreur.
        if (isNestHttpError(error)) {
          throw error;
        }
        // Si l'erreur est un timeout ou un abort, stock les erreurs.
        if (isTimeout(error)) {
          lastTimeout = true;
          lastStatus = undefined;
        } else {
          throw new BadGatewayException('France Travail est injoignable'); // Sinon, relance une exception BadGatewayException.
        }
      }

      if (attempt < FT_SEARCH_MAX_ATTEMPTS - 1) {
        await this.delay(ftBackoffMs(attempt)); // Attend le délai d'attente.
      }
    }

    // Si le timeout est atteint, relance une exception GatewayTimeoutException.
    if (lastTimeout) {
      throw new GatewayTimeoutException(
        'France Travail n’a pas répondu à temps',
      );
    }
    // Si le status n'est pas défini, relance une exception BadGatewayException.
    if (lastStatus !== undefined) {
      this.failHttp(lastStatus); // Sinon, relance une exception BadGatewayException.
    }
    throw new BadGatewayException('France Travail est injoignable'); // On relance l'erreur si le timeout ou le status n'est pas défini.
  }
}
