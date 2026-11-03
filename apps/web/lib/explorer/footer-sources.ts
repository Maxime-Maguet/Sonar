import {
  formatFetchedAt,
  INDICATIVE_NOTICE,
  INSEE_SOURCE_LABEL,
  INSEE_SOURCE_URL,
} from "@/lib/pistes/etalab";

import type { FooterLine } from "@/lib/footer/types";

export type { FooterLine, FooterSegment } from "@/lib/footer/types";

export const ETALAB_LICENCE_URL =
  "https://www.etalab.gouv.fr/licence-ouverte-open-licence/";
export const ETALAB_LICENCE_LABEL = "Licence ouverte (Etalab)";
export const SYNC_UNAVAILABLE = " — date de synchronisation indisponible";

/** Bloc de sources de /explorer : Sirene, licence, avertissement, synchronisation. */
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
  ];
}
