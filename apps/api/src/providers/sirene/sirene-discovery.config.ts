/**
 * Filet de découverte SIRENE (Toulouse + 1re couronne + NAF).
 * Le NAF sert à attraper des entreprises tech, pas à dire qu’elles recrutent.
 *
 * NAF Rev2 : codes APE encore en vigueur dans activitePrincipaleEtablissement.
 * NAF 2025 : liste parallèle, vide tant que le mapping Rev2 → NAF25 n’est pas
 * figé. Après janvier 2027, remplacer la liste Rev2 : ne pas supposer que les
 * codes APE 2026 restent valides dans le champ APE courant.
 */

export const DISCOVERY_COMMUNE_CODES = [
  '31555', // Toulouse
  '31069', // Blagnac
  '31149', // Colomiers
  '31557', // Tournefeuille
  '31157', // Cugnaux
  '31044', // Balma
  '31561', // L'Union
  '31506', // Saint-Orens-de-Gameville
  '31446', // Ramonville-Saint-Agne
  '31056', // Beauzelle
  '31022', // Aucamville
] as const;

export const DISCOVERY_NAF_REV2_CODES = [
  '62.01Z',
  '62.02A',
  '58.29C',
  '62.09Z',
] as const;

/** Vide jusqu’au mapping NAF25. Ne pas y copier les codes Rev2 « au cas où ». */
export const DISCOVERY_NAF_25_CODES: readonly string[] = [];

export const DISCOVERY_COMMUNES: ReadonlySet<string> = new Set(
  DISCOVERY_COMMUNE_CODES,
);
export const DISCOVERY_NAF_REV2: ReadonlySet<string> = new Set(
  DISCOVERY_NAF_REV2_CODES,
);
export const DISCOVERY_NAF_25: ReadonlySet<string> = new Set(
  DISCOVERY_NAF_25_CODES,
);

export type DiscoveryNafFiche = {
  activityCode?: string | null;
  activityCodeNaf25?: string | null;
};

export type DiscoveryNafAllowlists = {
  nafRev2?: ReadonlySet<string>;
  naf25?: ReadonlySet<string>;
};

function hasCode(set: ReadonlySet<string>, code: string | null | undefined) {
  return typeof code === 'string' && set.has(code);
}

export function isAllowedCommune(
  code: string | null | undefined,
): boolean {
  return hasCode(DISCOVERY_COMMUNES, code);
}

export function isAllowedNaf(rev2: string | null | undefined): boolean {
  return hasCode(DISCOVERY_NAF_REV2, rev2);
}

export function isAllowedNaf25(naf25: string | null | undefined): boolean {
  return hasCode(DISCOVERY_NAF_25, naf25);
}

export function isInDiscoveryNafScope(
  fiche: DiscoveryNafFiche,
  allowlists: DiscoveryNafAllowlists = {},
): boolean {
  const nafRev2 = allowlists.nafRev2 ?? DISCOVERY_NAF_REV2;
  const naf25 = allowlists.naf25 ?? DISCOVERY_NAF_25;
  return (
    hasCode(nafRev2, fiche.activityCode) ||
    hasCode(naf25, fiche.activityCodeNaf25)
  );
}

function luceneOrGroup(field: string, codes: readonly string[]): string {
  return `${field}:(${codes.join(' OR ')})`;
}

/**
 * Requête Lucene 3.11 : communes + NAF Rev2, et NAF25 seulement si la
 * liste parallèle n’est pas vide. Le filtre local `isInDiscoveryNafScope`
 * s’applique toujours (y compris liste NAF25 vide).
 */
export function buildDiscoverySearchQuery(
  communes: readonly string[] = DISCOVERY_COMMUNE_CODES,
  nafRev2: readonly string[] = DISCOVERY_NAF_REV2_CODES,
  naf25: readonly string[] = DISCOVERY_NAF_25_CODES,
): string {
  const communeClause = luceneOrGroup('codeCommuneEtablissement', communes);
  const rev2Clause = luceneOrGroup('activitePrincipaleEtablissement', nafRev2);
  const nafClause =
    naf25.length > 0
      ? `(${rev2Clause} OR ${luceneOrGroup('activitePrincipaleNAF25Etablissement', naf25)})`
      : `(${rev2Clause})`;
  return `periode(etatAdministratifEtablissement:A) AND ${communeClause} AND ${nafClause}`;
}
