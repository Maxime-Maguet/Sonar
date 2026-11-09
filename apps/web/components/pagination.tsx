import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { clampPage, pageWindow } from "@/lib/pagination/window";

type PaginationProps = {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

const cellClassName = cn(
  buttonVariants({ variant: "outline", size: "icon" }),
  "w-auto min-w-7 px-1.5 sm:min-w-8 sm:px-2",
);

/** Contrôle indisponible : présent mais grisé, ni lien ni focus. */
function Disabled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-label={label}
      className={cn(cellClassName, "pointer-events-none opacity-50")}
    >
      {children}
    </span>
  );
}

function Control({
  target,
  label,
  href,
  children,
}: {
  target: number | null;
  label: string;
  href: (page: number) => string;
  children: React.ReactNode;
}) {
  if (target === null) return <Disabled label={label}>{children}</Disabled>;
  return (
    <Link
      href={href(target)}
      aria-label={label}
      className={cn(cellClassName, "cursor-pointer")}
    >
      {children}
    </Link>
  );
}

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  const total = Math.max(1, Math.floor(totalPages) || 1);
  const current = clampPage(page, total);
  const previous = current > 1 ? current - 1 : null;
  const next = current < total ? current + 1 : null;

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-2 text-sm">
      <p className="text-muted-foreground">
        Page {current} sur {total}
      </p>
      <ul className="flex flex-wrap items-center gap-0.5 sm:gap-1">
        <li>
          <Control target={previous === null ? null : 1} label="Première page" href={hrefForPage}>
            <ChevronsLeft aria-hidden="true" />
          </Control>
        </li>
        <li>
          <Control target={previous} label="Page précédente" href={hrefForPage}>
            <ChevronLeft aria-hidden="true" />
          </Control>
        </li>
        {pageWindow(current, total).map((item, index) =>
          item.type === "ellipsis" ? (
            <li key={`e${index}`} aria-hidden="true" className="px-0.5 text-muted-foreground sm:px-1">
              …
            </li>
          ) : (
            <li key={item.page}>
              {item.page === current ? (
                <span
                  aria-current="page"
                  className={cn(
                    buttonVariants({ variant: "default", size: "icon" }),
                    "w-auto min-w-7 px-1.5 sm:min-w-8 sm:px-2",
                  )}
                >
                  {item.page}
                </span>
              ) : (
                <Link
                  href={hrefForPage(item.page)}
                  aria-label={`Page ${item.page}`}
                  className={cn(cellClassName, "cursor-pointer")}
                >
                  {item.page}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          <Control target={next} label="Page suivante" href={hrefForPage}>
            <ChevronRight aria-hidden="true" />
          </Control>
        </li>
        <li>
          <Control target={next === null ? null : total} label="Dernière page" href={hrefForPage}>
            <ChevronsRight aria-hidden="true" />
          </Control>
        </li>
      </ul>
    </nav>
  );
}
