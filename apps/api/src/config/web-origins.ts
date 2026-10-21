// Parseur unique de WEB_ORIGIN, partagé par la validation d'env, CORS et CSRF.
// Les messages d'erreur ne reprennent jamais la valeur saisie.

export type WebOrigins = readonly string[];

export function parseWebOrigins(raw: string): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error('WEB_ORIGIN : liste vide');
  }

  const origins = raw.split(',').map((entry, index) => {
    const value = entry.trim();
    if (value === '') {
      throw new Error(`WEB_ORIGIN : entrée ${index + 1} vide`);
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`WEB_ORIGIN : entrée ${index + 1} n'est pas une URL`);
    }

    const hasExtra =
      url.pathname !== '/' ||
      url.search !== '' ||
      url.hash !== '' ||
      url.username !== '' ||
      url.password !== '';
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.hostname === '' ||
      hasExtra
    ) {
      throw new Error(
        `WEB_ORIGIN : entrée ${index + 1} doit être une origine http(s) sans chemin`,
      );
    }
    return url.origin;
  });

  return [...new Set(origins)];
}

// Accepte un hostname tel que fourni par URL.hostname (IPv6 entre crochets).
export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');

  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    return (
      a === 127 ||
      a === 10 ||
      a === 0 ||
      a >= 224 || // multicast, réservé, broadcast
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }

  if (host.includes(':')) {
    return (
      /^::([0-9a-f]{1,4})?(:[0-9a-f]{1,4})?$/.test(host) || // ::/96 (:: et ::1 inclus)
      host.startsWith('64:ff9b:') || // NAT64
      /^f[cd][0-9a-f]{2}:/.test(host) || // fc00::/7
      /^fe[89ab][0-9a-f]:/.test(host) || // fe80::/10
      host.startsWith('::ffff:') // IPv4 mappée : refusée par prudence
    );
  }

  return false;
}

export function hasPrivateOrLocalOrigin(origins: WebOrigins): boolean {
  return origins.some((origin) => isPrivateOrLocalHost(new URL(origin).hostname));
}

export function isProduction(nodeEnv?: string): boolean {
  return typeof nodeEnv === 'string' && nodeEnv.trim().toLowerCase() === 'production';
}

// Refuse localhost / IP privée en production. Message sans la valeur saisie.
export function assertWebOriginsAllowed(
  origins: WebOrigins,
  nodeEnv?: string,
): void {
  if (isProduction(nodeEnv) && hasPrivateOrLocalOrigin(origins)) {
    throw new Error(
      'WEB_ORIGIN : origine locale ou privée interdite en production',
    );
  }
}

// Point d'entrée unique : parse + règle de production.
export function resolveWebOrigins(raw: string, nodeEnv?: string): WebOrigins {
  const origins = parseWebOrigins(raw);
  assertWebOriginsAllowed(origins, nodeEnv);
  return origins;
}
