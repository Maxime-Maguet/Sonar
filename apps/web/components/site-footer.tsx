import {
  formatFetchedAt,
  INDICATIVE_NOTICE,
  INSEE_SOURCE_LABEL,
  INSEE_SOURCE_URL,
  LBB_SOURCE_LABEL,
  LBB_SOURCE_URL,
  UNOFFICIAL_NOTICE,
} from "@/lib/pistes/etalab";
import type { FooterLine } from "@/lib/explorer/footer-sources";

const LINK_CLASS =
  "font-medium text-foreground underline-offset-4 hover:underline";

export function SiteFooter({
  fetchedAt,
  lines,
}: {
  fetchedAt?: string;
  /** Contenu propre à une page ; sans lui, pied de page des pistes. */
  lines?: FooterLine[];
}) {
  if (lines) {
    return (
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground">
          {lines.map((line, i) => (
            <p key={i}>
              {line.map((segment, j) =>
                segment.href ? (
                  <a key={j} href={segment.href} className={LINK_CLASS}>
                    {segment.text}
                  </a>
                ) : (
                  segment.text
                ),
              )}
            </p>
          ))}
        </div>
      </footer>
    );
  }
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground">
        <p>
          Données{" "}
          <a
            href={LBB_SOURCE_URL}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {LBB_SOURCE_LABEL}
          </a>
          {fetchedAt
            ? ` — récupérées le ${formatFetchedAt(fetchedAt)}`
            : " — date de récupération indisponible"}
          .
        </p>
        <p>{INDICATIVE_NOTICE}</p>
        <p>{UNOFFICIAL_NOTICE}</p>
        <p>
          Annuaire des entreprises :{" "}
          <a
            href={INSEE_SOURCE_URL}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {INSEE_SOURCE_LABEL}
          </a>.
        </p>
      </div>
    </footer>
  );
}
