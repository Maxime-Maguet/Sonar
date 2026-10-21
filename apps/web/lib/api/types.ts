// Dupliqué côté web (contrat apps/api). Une « Piste » = lead (voir GLOSSARY.md).

export interface LeadItem {
  companyId: string;
  slug: string;
  name: string;
  siren: string;
  siret: string;
  city: string | null;
  rome: string;
  hiringPotential: number | null;
  isHighPotential: boolean | null;
  source: "LA_BONNE_BOITE";
  detectedAt: string;
}

export interface LeadsPage {
  hits: number;
  page: number;
  pageSize: number;
  fetchedAt: string;
  items: LeadItem[];
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface ListLeadsParams {
  rome: string;
  page?: number;
  pageSize?: number;
}
