"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";
import { activeEntryHref, NAV_ENTRIES, signInHref } from "@/lib/navigation/navigation";

const FOCUS =
  "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const ACTIVE = "font-medium text-foreground";
const IDLE = "text-muted-foreground hover:text-foreground";

export function SiteHeader() {
  const pathname = usePathname();
  const active = activeEntryHref(pathname);

  return (
    <header className="border-b border-border">
      <nav
        aria-label="Navigation"
        className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm"
      >
        <Link
          href="/"
          aria-label="Sonar, accueil"
          className={`${FOCUS} text-base font-semibold tracking-tight text-foreground`}
        >
          Sonar
        </Link>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {NAV_ENTRIES.map((entry) => (
            <li key={entry.href}>
              {entry.exists ? (
                <Link
                  href={entry.href}
                  aria-current={active === entry.href ? "page" : undefined}
                  className={`${FOCUS} ${active === entry.href ? ACTIVE : IDLE}`}
                >
                  {entry.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="cursor-not-allowed text-muted-foreground/60"
                >
                  {entry.label}{" "}
                  <span className="text-xs">bientôt</span>
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-3">
          <ModeToggle />
          <Suspense fallback={<SignInLink href={signInHref(pathname, "")} />}>
            <SignInFromLocation pathname={pathname} />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

function SignInFromLocation({ pathname }: { pathname: string }) {
  const search = useSearchParams().toString();
  return <SignInLink href={signInHref(pathname, search)} />;
}

function SignInLink({ href }: { href: string }) {
  return (
    <Link href={href} className={`${FOCUS} ${IDLE}`}>
      Connexion
    </Link>
  );
}
