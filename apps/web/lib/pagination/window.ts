import { lastPage } from "@/lib/explorer/query";

export type PageItem = { type: "page"; page: number } | { type: "ellipsis" };

/** Nombre total de pages : au moins 1, même sans résultat. */
export function totalPages(hits: number, pageSize: number): number {
  return lastPage(hits, pageSize);
}

/** Ramène une page quelconque (NaN, décimale, hors bornes) dans [1, total]. */
export function clampPage(current: number, total: number): number {
  const last = Number.isFinite(total) && total >= 1 ? Math.floor(total) : 1;
  if (!Number.isFinite(current)) return 1;
  return Math.min(Math.max(Math.floor(current), 1), last);
}

/**
 * Liste ordonnée des pages à afficher : première, dernière, et `siblings`
 * pages de chaque côté de la page courante. Les trous sont remplacés par une
 * ellipse seulement s'ils cachent au moins 2 pages ; sinon on montre la page.
 */
export function pageWindow(
  current: number,
  total: number,
  siblings = 1,
): PageItem[] {
  const last = Number.isFinite(total) && total >= 1 ? Math.floor(total) : 1;
  const page = clampPage(current, last);

  const wanted = new Set<number>([1, last]);
  for (let p = page - siblings; p <= page + siblings; p++) {
    if (p >= 1 && p <= last) wanted.add(p);
  }
  const pages = [...wanted].sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;
  for (const p of pages) {
    const hidden = p - previous - 1;
    if (hidden === 1) items.push({ type: "page", page: previous + 1 });
    else if (hidden >= 2) items.push({ type: "ellipsis" });
    items.push({ type: "page", page: p });
    previous = p;
  }
  return items;
}
