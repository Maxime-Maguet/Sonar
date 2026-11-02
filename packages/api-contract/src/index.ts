// Contrat JSON public de l'API. Une piste n'est pas une offre (GLOSSARY.md).

export type LeadItem = {
  companyId: string;
  slug: string;
  name: string;
  siren: string;
  siret: string;
  city: string | null;
  rome: string;
  hiringPotential: number | null;
  isHighPotential: boolean | null;
  source: 'LA_BONNE_BOITE';
  detectedAt: string;
};

export type LeadsPage = {
  hits: number;
  page: number;
  pageSize: number;
  fetchedAt: string;
  items: LeadItem[];
};

export type CompanyListItem = {
  name: string;
  city: string;
  /** null si la company n'a pas de code d'activité */
  activityCode: string | null;
  /** null si activityCode est null ; sinon le libellé, ou le code lui-même s'il est inconnu */
  activityLabel: string | null;
};

export type CompanyActivityFacet = { code: string; label: string };

export type CompaniesPage = {
  hits: number;
  page: number;
  pageSize: number;
  items: CompanyListItem[];
  facets: { cities: string[]; activities: CompanyActivityFacet[] };
  /** ISO 8601 ; null quand l'annuaire est vide */
  syncedAt: string | null;
};

export type ListCompaniesParams = {
  city?: string;
  activityCode?: string;
  page?: number;
  pageSize?: number;
};

export type Credentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
};

export type ListLeadsParams = {
  rome: string;
  page?: number;
  pageSize?: number;
};

export type HealthReport = {
  status: 'ok' | 'down';
  process: { postgres: 'up' | 'down' };
  dependencies: {
    sirene: 'unchecked';
    laBonneBoite: 'unchecked';
  };
};
