/** Villes du filet + codes NAF tech. Le NAF ne veut pas dire « recrute ». */

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

function hasCode(set: ReadonlySet<string>, code: string | null | undefined) {
  return typeof code === 'string' && set.has(code);
}

export function isAllowedCommune(code: string | null | undefined): boolean {
  return hasCode(DISCOVERY_COMMUNES, code);
}

export function isAllowedNaf(rev2: string | null | undefined): boolean {
  return hasCode(DISCOVERY_NAF_REV2, rev2);
}

export function isAllowedNaf25(naf25: string | null | undefined): boolean {
  return hasCode(DISCOVERY_NAF_25, naf25);
}

export function isInDiscoveryNafScope(fiche: {
  activityCode?: string | null;
  activityCodeNaf25?: string | null;
}): boolean {
  return (
    hasCode(DISCOVERY_NAF_REV2, fiche.activityCode) ||
    hasCode(DISCOVERY_NAF_25, fiche.activityCodeNaf25)
  );
}

function orGroup(field: string, codes: readonly string[]): string {
  return `${field}:(${codes.join(' OR ')})`;
}

export function buildDiscoverySearchQuery(
  communes: readonly string[] = DISCOVERY_COMMUNE_CODES,
  nafRev2: readonly string[] = DISCOVERY_NAF_REV2_CODES,
  naf25: readonly string[] = DISCOVERY_NAF_25_CODES,
): string {
  const communesQ = orGroup('codeCommuneEtablissement', communes);
  const rev2Q = orGroup('activitePrincipaleEtablissement', nafRev2);
  const nafQ =
    naf25.length > 0
      ? `(${rev2Q} OR ${orGroup('activitePrincipaleNAF25Etablissement', naf25)})`
      : `(${rev2Q})`;
  return `periode(etatAdministratifEtablissement:A) AND etablissementSiege:true AND ${communesQ} AND ${nafQ}`;
}
