import {
  formatFetchedAt,
  INDICATIVE_NOTICE,
  INSEE_SOURCE_LABEL,
  INSEE_SOURCE_URL,
  UNOFFICIAL_NOTICE,
} from "@/lib/pistes/etalab";

export type FooterSegment = { text: string; href?: string };
export type FooterLine = FooterSegment[];

export const ETALAB_LICENCE_URL =
  "https://www.etalab.gouv.fr/licence-ouverte-open-licence/";
export const ETALAB_LICENCE_LABEL = "Licence ouverte (Etalab)";
export const SYNC_UNAVAILABLE = " — date de synchronisation indisponible";

/** Pied de page de /explorer : Sirene, licence, avertissements, synchronisation. */
export function explorerFooterLines(syncedAt: string | null): FooterLine[] {
  return [
    [
      { text: "Données " },
      { text: INSEE_SOURCE_LABEL, href: INSEE_SOURCE_URL },
      {
        text: syncedAt
          ? ` — synchronisées le ${formatFetchedAt(syncedAt)}`
          : SYNC_UNAVAILABLE,
      },
      { text: "." },
    ],
    [
      { text: "Licence : " },
      { text: ETALAB_LICENCE_LABEL, href: ETALAB_LICENCE_URL },
      { text: "." },
    ],
    [{ text: INDICATIVE_NOTICE }],
    [{ text: UNOFFICIAL_NOTICE }],
  ];
}
