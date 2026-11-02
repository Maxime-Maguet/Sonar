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

/**
 * Nom canonique de chaque commune de la découverte (source unique). L'INSEE
 * renvoie des libellés variables (« RAMONVILLE ST AGNE » / « RAMONVILLE-SAINT-AGNE »)
 * pour un même code ; l'import enregistre ce nom dans `city`.
 */
export const COMMUNE_NAMES: Readonly<Record<string, string>> = {
  '31555': 'Toulouse',
  '31069': 'Blagnac',
  '31149': 'Colomiers',
  '31557': 'Tournefeuille',
  '31157': 'Cugnaux',
  '31044': 'Balma',
  '31561': "L'Union",
  '31506': 'Saint-Orens-de-Gameville',
  '31446': 'Ramonville-Saint-Agne',
  '31056': 'Beauzelle',
  '31022': 'Aucamville',
};

/** Nom canonique d'une commune de la découverte, `undefined` hors découverte. */
export function getCommuneName(
  code: string | null | undefined,
): string | undefined {
  return typeof code === 'string' && Object.hasOwn(COMMUNE_NAMES, code)
    ? COMMUNE_NAMES[code]
    : undefined;
}

export const DISCOVERY_NAF_REV2_CODES = [
  '62.01Z',
  '62.02A',
  '58.29C',
  '62.09Z',
] as const;

/** Libellés officiels NAF Rév. 2 des codes de la découverte (source unique). */
export const ACTIVITY_LABELS: Readonly<Record<string, string>> = {
  '62.01Z': 'Programmation informatique',
  '62.02A': 'Conseil en systèmes et logiciels informatiques',
  '58.29C': 'Édition de logiciels applicatifs',
  '62.09Z': 'Autres activités informatiques',
};

/** Libellé d'un code d'activité ; un code inconnu s'affiche tel quel. */
export function getActivityLabel(code: string): string {
  return Object.hasOwn(ACTIVITY_LABELS, code) ? ACTIVITY_LABELS[code] : code;
}

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

/**
 * Requête de découverte : sièges d'établissements actifs et employeurs, dans
 * les communes du filet, avec un NAF tech. Ces filtres servent uniquement à
 * DÉCOUVRIR des entreprises ; ils ne disent pas qu'elle recrute.
 *
 * Les champs historisés (état administratif, activité, caractère employeur)
 * ne sont valides qu'à l'intérieur de `periode(...)` (sinon INSEE répond 400).
 * `codeCommuneEtablissement` et `etablissementSiege` restent en dehors.
 *
 * NAF25 ne peut PAS être interrogé via `q` (INSEE 400, vérifié, y compris dans
 * `periode(...)`) : il est filtré côté client après récupération, via
 * `isInDiscoveryNafScope`.
 */
export function buildDiscoverySearchQuery(
  communes: readonly string[] = DISCOVERY_COMMUNE_CODES,
  nafRev2: readonly string[] = DISCOVERY_NAF_REV2_CODES,
): string {
  const communesQ = orGroup('codeCommuneEtablissement', communes);
  const rev2Q = orGroup('activitePrincipaleEtablissement', nafRev2);
  return `periode(etatAdministratifEtablissement:A AND ${rev2Q} AND caractereEmployeurEtablissement:O) AND etablissementSiege:true AND ${communesQ}`;
}
