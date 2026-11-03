import {
  formatFetchedAt,
  INDICATIVE_NOTICE,
  INSEE_SOURCE_LABEL,
  INSEE_SOURCE_URL,
  LBB_SOURCE_LABEL,
  LBB_SOURCE_URL,
  UNOFFICIAL_NOTICE,
} from "@/lib/pistes/etalab";
import type { FooterLine } from "@/lib/footer/types";

export type LegalLink = {
  label: string;
  href: string;
  /** Faux tant que la page n'existe pas : aucun lien n'est affiché. */
  exists: boolean;
};

export const LEGAL_LINKS: readonly LegalLink[] = [
  { label: "Mentions légales", href: "/mentions-legales", exists: false },
  { label: "Confidentialité", href: "/confidentialite", exists: false },
];

export const PISTES_DATE_UNAVAILABLE = " — date de récupération indisponible";

/** Mention commune à toutes les pages du cadre, affichée une seule fois. */
export function commonFooterLines(): FooterLine[] {
  return [[{ text: UNOFFICIAL_NOTICE }]];
}

/** Liens légaux dont la page existe (aucun lien ne mène à une impasse). */
export function legalFooterLinks(
  links: readonly LegalLink[] = LEGAL_LINKS,
): { label: string; href: string }[] {
  return links
    .filter((link) => link.exists)
    .map(({ label, href }) => ({ label, href }));
}

/** Bloc de sources de /pistes : La Bonne Boîte, avertissement, annuaire Sirene. */
export function pistesFooterLines(fetchedAt?: string): FooterLine[] {
  return [
    [
      { text: "Données " },
      { text: LBB_SOURCE_LABEL, href: LBB_SOURCE_URL },
      {
        text: fetchedAt
          ? ` — récupérées le ${formatFetchedAt(fetchedAt)}`
          : PISTES_DATE_UNAVAILABLE,
      },
      { text: "." },
    ],
    [{ text: INDICATIVE_NOTICE }],
    [
      { text: "Annuaire des entreprises : " },
      { text: INSEE_SOURCE_LABEL, href: INSEE_SOURCE_URL },
      { text: "." },
    ],
  ];
}
