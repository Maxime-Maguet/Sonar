export const LBB_SOURCE_URL =
  "https://francetravail.io/produits-partages/catalogue/bonne-boite-v2";
export const LBB_SOURCE_LABEL = "France Travail / La Bonne Boîte";
export const INSEE_SOURCE_URL = "https://www.sirene.fr/";
export const INSEE_SOURCE_LABEL = "INSEE / Sirene";
export const INDICATIVE_NOTICE = "Ces informations sont indicatives.";
export const UNOFFICIAL_NOTICE = "Sonar n'est pas un service officiel.";

export function formatFetchedAt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}
