export type LeadItemDto = {
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

export type LeadsPageDto = {
  hits: number;
  page: number;
  pageSize: number;
  fetchedAt: string;
  items: LeadItemDto[];
};
