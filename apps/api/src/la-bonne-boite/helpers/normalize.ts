import { asObject, asText, slugify } from '../../common/json.js';

const SIRET_PATTERN = /^[0-9]{14}$/;

/** Fiche piste Sonar — pas le JSON LBB. */
export type LeadFiche = {
  siret: string;
  siren: string;
  name: string;
  slug: string;
  city: string | null;
  postalCode: string | null;
  communeInseeCode: string | null;
  rome: string | null;
  naf: string | null;
};

/** JSON LBB (item) → fiche, ou null si l’item est inutilisable. */
export function normalizeLead(raw: unknown): LeadFiche | null {
  const item = asObject(raw);
  if (item == null) {
    return null;
  }

  const siret = asText(item.siret);
  if (siret == null || !SIRET_PATTERN.test(siret)) {
    return null;
  }

  const siren = siret.slice(0, 9);
  const name = asText(item.company_name) ?? asText(item.office_name);
  if (name == null) {
    return null;
  }

  return {
    siret,
    siren,
    name,
    slug: `${slugify(name)}-${siren}`,
    city: asText(item.city),
    postalCode: asText(item.postcode),
    communeInseeCode: asText(item.citycode),
    rome: asText(item.rome),
    naf: asText(item.naf),
  };
}
