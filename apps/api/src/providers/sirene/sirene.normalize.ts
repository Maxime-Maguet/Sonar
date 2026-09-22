// Fiche Sonar (ce qu'on REND), pas le JSON brut de l'INSEE.
export type NormalizedEtablissement = {
  siren: string;
  siret: string;
  name: string;
  slug: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  activityCode: string | null;
  activityNomenclature: string | null;
  activityCodeNaf25: string | null;
  diffusionStatus: string | null;
};

// "Un objet dont on ne connaît pas encore le contenu."
type JsonRecord = Record<string, unknown>;

// True si c'est un objet { ... } — false si c'est une liste, un texte, rien.
function asRecord(value: unknown): JsonRecord | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return undefined;
}

// True si c'est un vrai texte non vide (espaces enlevés). Sinon null.
function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Nom lisible en URL : "SARL Dupont" → "sarl-dupont"
function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'etablissement';
}

// L'INSEE garde l'historique (plusieurs "périodes").
// Celle d'aujourd'hui = pas de date de fin. Sinon on prend la première.
function currentPeriode(etab: JsonRecord): JsonRecord | undefined {
  const periodes = etab.periodesEtablissement;
  if (!Array.isArray(periodes) || periodes.length === 0) {
    return undefined;
  }
  const ouverte = periodes.find(
    (periode) => asRecord(periode)?.dateFin == null,
  );
  return asRecord(ouverte) ?? asRecord(periodes[0]);
}

// Colle numéro + type + nom de rue en une seule ligne.
function buildStreet(adresse: JsonRecord | undefined): string | null {
  if (!adresse) {
    return null;
  }
  const line = [
    asString(adresse.numeroVoieEtablissement),
    asString(adresse.indiceRepetitionEtablissement),
    asString(adresse.typeVoieEtablissement),
    asString(adresse.libelleVoieEtablissement),
  ]
    .filter(Boolean)
    .join(' ');
  return line || null;
}

// Trouve un nom : raison sociale, sinon enseigne, sinon prénom+nom (auto-entrepreneur).
function legalName(
  unite: JsonRecord | undefined,
  periode: JsonRecord | undefined,
): string | null {
  const fromPerson = [
    asString(unite?.prenom1UniteLegale),
    asString(unite?.nomUniteLegale),
  ]
    .filter(Boolean)
    .join(' ');
  return (
    asString(unite?.denominationUniteLegale) ??
    asString(periode?.denominationUsuelleEtablissement) ??
    asString(periode?.enseigne1Etablissement) ??
    (fromPerson || null)
  );
}

// Code APE "nouvelle norme 2025" s'il est déjà dans la réponse, sinon null.
function pickNaf25(
  periode: JsonRecord | undefined,
  unite: JsonRecord | undefined,
): string | null {
  return (
    asString(periode?.activitePrincipaleNAF25Etablissement) ??
    asString(unite?.activitePrincipaleNAF25UniteLegale) ??
    null
  );
}

// Point d'entrée : JSON INSEE → fiche Sonar.
export function normalizeEtablissement(raw: unknown): NormalizedEtablissement {
  const root = asRecord(raw);
  const etab = asRecord(root?.etablissement);
  if (!etab) {
    throw new Error('Réponse INSEE inattendue : etablissement manquant');
  }

  const siren = asString(etab.siren) ?? '';
  const siret = asString(etab.siret) ?? '';
  const unite = asRecord(etab.uniteLegale);
  const periode = currentPeriode(etab);
  const adresse = asRecord(etab.adresseEtablissement);

  const diffusionStatus =
    asString(etab.statutDiffusionEtablissement) ??
    asString(unite?.statutDiffusionUniteLegale);

  // "P" = on n'a pas le droit d'afficher nom et rue. Ville / métier : ok.
  const isPartial = diffusionStatus === 'P';
  const fallbackName = `Établissement ${siret || siren}`.trim();
  const name = isPartial
    ? fallbackName
    : (legalName(unite, periode) ?? fallbackName);

  return {
    siren,
    siret,
    name,
    slug: slugify(name),
    address: isPartial ? null : buildStreet(adresse),
    postalCode: asString(adresse?.codePostalEtablissement),
    city: asString(adresse?.libelleCommuneEtablissement),
    activityCode: asString(periode?.activitePrincipaleEtablissement),
    activityNomenclature: asString(
      periode?.nomenclatureActivitePrincipaleEtablissement,
    ),
    activityCodeNaf25: pickNaf25(periode, unite),
    diffusionStatus,
  };
}
