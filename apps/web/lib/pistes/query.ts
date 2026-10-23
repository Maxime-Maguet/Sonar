/** Métier par défaut : études et développement informatique. */
export const DEFAULT_ROME = "M1805";

const ROME_PATTERN = /^[A-Za-z]\d{4}$/;

export function readRome(value: string | null): string {
  if (value !== null && ROME_PATTERN.test(value)) return value.toUpperCase();
  return DEFAULT_ROME;
}

export function readPage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return page < 1 ? 1 : page;
}

/** Chemin de la liste. La page 1 reste implicite : `/pistes?rome=M1805`. */
export function pistesPath(rome: string, page: number): string {
  const query = new URLSearchParams({ rome });
  if (page > 1) query.set("page", String(page));
  return `/pistes?${query.toString()}`;
}

/** Redirection connexion : chemin relatif, métier et page conservés. */
export function loginPathForPistes(rome: string, page: number): string {
  const next = pistesPath(rome, page);
  return `/login?${new URLSearchParams({ next }).toString()}`;
}
