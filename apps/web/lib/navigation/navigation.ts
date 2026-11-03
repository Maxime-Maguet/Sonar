export type NavEntry = {
  label: string;
  href: string;
  /** Faux tant que la page n'existe pas : l'entrée est affichée « bientôt ». */
  exists: boolean;
};

export const NAV_ENTRIES: readonly NavEntry[] = [
  { label: "Explorer", href: "/explorer", exists: true },
  { label: "Pistes", href: "/pistes", exists: true },
  { label: "Événements", href: "/evenements", exists: false },
  { label: "Radar", href: "/radar", exists: false },
  { label: "CRM", href: "/crm", exists: false },
];

/** Entrée de la page courante, par préfixe d'adresse ; l'accueil n'en marque aucune. */
export function activeEntryHref(pathname: string): string | null {
  const entry = NAV_ENTRIES.find(
    (candidate) =>
      candidate.exists &&
      (pathname === candidate.href || pathname.startsWith(`${candidate.href}/`)),
  );
  return entry ? entry.href : null;
}

/** Lien « Connexion » : l'adresse courante (chemin et requête) devient `next`. */
export function signInHref(pathname: string, search: string): string {
  const current = search === "" ? pathname : `${pathname}?${search}`;
  return `/login?${new URLSearchParams({ next: current }).toString()}`;
}
