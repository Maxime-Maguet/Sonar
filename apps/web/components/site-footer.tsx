"use client";

import Link from "next/link";
import { usePageFooterLines } from "@/components/footer-sources";
import { commonFooterLines, legalFooterLinks } from "@/lib/footer/footer-lines";

const LINK_CLASS =
  "font-medium text-foreground underline-offset-4 hover:underline";
const FOCUS = "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Pied de page commun : bloc de sources de la page, puis mention commune et liens légaux. */
export function SiteFooter() {
  const pageLines = usePageFooterLines() ?? [];
  const lines = [...pageLines, ...commonFooterLines()];
  const legal = legalFooterLinks();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground md:px-8">
        {lines.map((line, i) => (
          <p key={i}>
            {line.map((segment, j) =>
              segment.href ? (
                <a
                  key={j}
                  href={segment.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${LINK_CLASS} ${FOCUS}`}
                >
                  {segment.text}
                  <span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
                </a>
              ) : (
                segment.text
              ),
            )}
          </p>
        ))}
        {legal.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={`${LINK_CLASS} ${FOCUS}`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  );
}
