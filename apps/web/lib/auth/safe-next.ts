const PISTES = "/pistes";
/** Origine factice : sert uniquement à parser le chemin, ce n'est pas l'hôte de l'app. */
const parseOrigin = "http://sonar.local";

/**
 * Chemin relatif interne après connexion ou inscription.
 * Toute adresse absolue ou externe retombe sur les pistes.
 */
export function destinationAfterAuth(next: string | null): string {
  if (next === null || next === "" || !next.startsWith("/")) return PISTES;
  if (next.startsWith("//") || next.includes("\\")) return PISTES;

  let url: URL;
  try {
    url = new URL(next, parseOrigin);
  } catch {
    return PISTES;
  }
  if (url.origin !== parseOrigin) return PISTES;
  return `${url.pathname}${url.search}${url.hash}`;
}
