export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ExplorerQuery = {
  city?: string;
  activityCode?: string;
  page: number;
};

export type ExplorerFacets = {
  cities: readonly string[];
  activities: readonly { code: string }[];
};

// Bornes et formes alignées sur ListCompaniesQueryDto (API).
export const CITY_MAX_LENGTH = 100;
export const PAGE_MAX = 10000;
const NAF_PATTERN = /^\d{2}\.\d{2}[A-Z]$/;
const POSITIVE_INT_PATTERN = /^\d+$/;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Première lecture, avant l'appel API : ne garde que des valeurs que l'API
 * accepte (sinon elle répondrait 400). Un tableau compte comme absent.
 */
export function readExplorerQuery(raw: RawSearchParams): ExplorerQuery {
  const query: ExplorerQuery = { page: 1 };

  const city = single(raw.city)?.trim();
  if (city && city.length <= CITY_MAX_LENGTH) query.city = city;

  const activityCode = single(raw.activityCode);
  if (activityCode !== undefined && NAF_PATTERN.test(activityCode)) {
    query.activityCode = activityCode;
  }

  const page = single(raw.page);
  if (page !== undefined && POSITIVE_INT_PATTERN.test(page)) {
    const n = Number(page);
    if (n >= 1) query.page = Math.min(n, PAGE_MAX);
  }
  return query;
}

export function lastPage(hits: number, pageSize: number): number {
  if (!(hits > 0) || !(pageSize > 0)) return 1;
  return Math.max(1, Math.ceil(hits / pageSize));
}

/** Adresse valide : filtres absents des choix retirés, page ramenée à [1, dernière]. */
export function canonicalizeExplorerQuery(
  query: ExplorerQuery,
  facets: ExplorerFacets,
  hits: number,
  pageSize: number,
): ExplorerQuery {
  const result: ExplorerQuery = { page: 1 };
  if (query.city !== undefined && facets.cities.includes(query.city)) {
    result.city = query.city;
  }
  if (
    query.activityCode !== undefined &&
    facets.activities.some((a) => a.code === query.activityCode)
  ) {
    result.activityCode = query.activityCode;
  }
  const page = Number.isInteger(query.page) && query.page >= 1 ? query.page : 1;
  result.page = Math.min(page, lastPage(hits, pageSize));
  return result;
}

/** `/explorer?city=..&activityCode=..&page=..` ; page 1 implicite, vides omis. */
export function explorerPath(query: ExplorerQuery): string {
  const params = new URLSearchParams();
  if (query.city) params.set("city", query.city);
  if (query.activityCode) params.set("activityCode", query.activityCode);
  if (query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `/explorer?${qs}` : "/explorer";
}

/** Vrai si l'adresse reçue n'est pas exactement l'adresse valide. */
export function needsRedirect(
  raw: RawSearchParams,
  canonical: ExplorerQuery,
): boolean {
  const expected: Record<string, string | undefined> = {
    city: canonical.city,
    activityCode: canonical.activityCode,
    page: canonical.page > 1 ? String(canonical.page) : undefined,
  };
  return Object.entries(expected).some(([key, value]) => raw[key] !== value);
}
