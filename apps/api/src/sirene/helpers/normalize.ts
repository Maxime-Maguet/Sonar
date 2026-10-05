import { BadGatewayException } from '@nestjs/common';

type Json = Record<string, unknown>;

function asObject(value: unknown): Json | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Json;
  }
  return undefined;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export { asObject, asText };

/** Fiche affichée / enregistrée, pas le JSON INSEE. */
export type CompanyFiche = {
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
  communeInseeCode: string | null;
  diffusionStatus: string | null;
  isHeadquarter: boolean;
};

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'etablissement';
}

function currentPeriode(etab: Json): Json | undefined {
  const periodes = etab.periodesEtablissement;
  if (!Array.isArray(periodes) || periodes.length === 0) {
    return undefined;
  }
  const ouverte = periodes.find((periode) => asObject(periode)?.dateFin == null);
  return asObject(ouverte) ?? asObject(periodes[0]);
}

function buildStreet(adresse: Json | undefined): string | null {
  if (!adresse) {
    return null;
  }
  const line = [
    asText(adresse.numeroVoieEtablissement),
    asText(adresse.indiceRepetitionEtablissement),
    asText(adresse.typeVoieEtablissement),
    asText(adresse.libelleVoieEtablissement),
  ]
    .filter(Boolean)
    .join(' ');
  return line || null;
}

function legalName(unite: Json | undefined, periode: Json | undefined): string | null {
  const fromPerson = [
    asText(unite?.prenom1UniteLegale),
    asText(unite?.nomUniteLegale),
  ]
    .filter(Boolean)
    .join(' ');
  return (
    asText(unite?.denominationUniteLegale) ??
    asText(periode?.denominationUsuelleEtablissement) ??
    asText(periode?.enseigne1Etablissement) ??
    (fromPerson || null)
  );
}

export function normalizeEtablissement(raw: unknown): CompanyFiche {
  const etab = asObject(asObject(raw)?.etablissement);
  if (!etab) {
    throw new BadGatewayException(
      'Réponse INSEE inattendue : etablissement manquant',
    );
  }

  const siren = asText(etab.siren);
  const siret = asText(etab.siret);
  if (!siren || !siret) {
    throw new BadGatewayException(
      'Réponse INSEE inattendue : siren ou siret manquant',
    );
  }

  const unite = asObject(etab.uniteLegale);
  const periode = currentPeriode(etab);
  const adresse = asObject(etab.adresseEtablissement);
  const diffusionStatus =
    asText(etab.statutDiffusionEtablissement) ??
    asText(unite?.statutDiffusionUniteLegale);

  const hideIdentity = diffusionStatus === 'P';
  const fallbackName = `Établissement ${siret}`;
  const name = hideIdentity
    ? fallbackName
    : (legalName(unite, periode) ?? fallbackName);

  return {
    siren,
    siret,
    name,
    slug: `${slugify(name)}-${siren}`,
    address: hideIdentity ? null : buildStreet(adresse),
    postalCode: asText(adresse?.codePostalEtablissement),
    city: asText(adresse?.libelleCommuneEtablissement),
    activityCode: asText(periode?.activitePrincipaleEtablissement),
    activityNomenclature: asText(
      periode?.nomenclatureActivitePrincipaleEtablissement,
    ),
    activityCodeNaf25:
      asText(periode?.activitePrincipaleNAF25Etablissement) ??
      asText(unite?.activitePrincipaleNAF25UniteLegale),
    communeInseeCode: asText(adresse?.codeCommuneEtablissement),
    diffusionStatus,
    isHeadquarter:
      etab.etablissementSiege === true || etab.etablissementSiege === 'true',
  };
}
