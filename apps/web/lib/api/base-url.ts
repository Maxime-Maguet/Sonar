/**
 * Résolution des adresses de l'API, sans dépendance à Next (module pur).
 *
 * Une seule origine côté site : en production, le navigateur appelle
 * `/api/...` (même origine) et Next relaie vers l'API via une réécriture.
 */

/** Préfixe de chemin relayé vers l'API. */
export const API_PROXY_PREFIX = "/api";

function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function isAbsoluteHttp(value: string): boolean {
  return /^https?:\/\/[^/\s]/i.test(value);
}

/**
 * Base du client navigateur : relative (`/api`) ou absolue (dev local).
 * Le slash final est retiré.
 */
export function resolveBrowserBaseUrl(publicUrl: string | undefined): string {
  const base = clean(publicUrl);
  if (!base || !(base.startsWith("/") || isAbsoluteHttp(base))) {
    throw new Error(
      "NEXT_PUBLIC_API_URL doit être défini : chemin relatif (ex: /api) ou URL absolue (ex: http://localhost:3001)",
    );
  }
  return base;
}

/**
 * Base de l'appel côté serveur : adresse serveur seule si définie, sinon
 * l'adresse publique si elle est absolue, sinon erreur claire.
 */
export function resolveServerBaseUrl(env: {
  directUrl: string | undefined;
  publicUrl: string | undefined;
}): string {
  const direct = clean(env.directUrl);
  if (direct) return direct;
  const pub = clean(env.publicUrl);
  if (isAbsoluteHttp(pub)) return pub;
  throw new Error(
    "Adresse de l'API introuvable côté serveur : définir API_DIRECT_URL (ex: http://localhost:3001) ou une NEXT_PUBLIC_API_URL absolue",
  );
}

export type ApiRewrite = { source: string; destination: string };

/** Règles de réécriture : vide sans adresse serveur, sinon relais du préfixe. */
export function buildApiRewrites(directUrl: string | undefined): ApiRewrite[] {
  const direct = clean(directUrl);
  if (!direct) return [];
  return [
    {
      source: `${API_PROXY_PREFIX}/:path*`,
      destination: `${direct}/:path*`,
    },
  ];
}
