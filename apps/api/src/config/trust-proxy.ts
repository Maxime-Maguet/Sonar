// Nombre de proxies devant l'API (TRUST_PROXY_HOPS), traduit en réglage
// `trust proxy` d'Express. Les messages d'erreur ne reprennent jamais la valeur.

// Absent ou vide = aucun proxy (undefined). Sinon un entier >= 0, sinon erreur.
export function parseTrustProxyHops(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = typeof raw === 'string' ? raw.trim() : raw;
  if (value === '') return undefined;

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('TRUST_PROXY_HOPS : entier positif ou nul attendu');
  }
  const hops = Number(value);
  if (!Number.isSafeInteger(hops)) {
    throw new Error('TRUST_PROXY_HOPS : entier positif ou nul attendu');
  }
  return hops;
}

// false = ne fait confiance à aucun proxy (comportement par défaut d'Express).
export function resolveTrustProxy(hops: number | undefined): number | false {
  return hops === undefined ? false : hops;
}
