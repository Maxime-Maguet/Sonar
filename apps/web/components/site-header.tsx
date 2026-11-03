"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandLink } from "@/components/brand-link";
import { ModeToggle } from "@/components/mode-toggle";
import { useSession } from "@/components/session-provider";
import {
  activeEntryHref,
  NAV_ENTRIES,
  signInHref,
} from "@/lib/navigation/navigation";

const FOCUS =
  "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const ACTIVE = "font-medium text-foreground";
const IDLE = "text-muted-foreground hover:text-foreground";
const ROW = "flex min-h-11 items-center px-6";

export function SiteHeader() {
  const pathname = usePathname();
  const active = activeEntryHref(pathname);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    menuButton.current?.focus();
  }

  // Échap ferme le panneau où que soit le focus ; le focus revient au bouton.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Passage à md : le panneau mobile est masqué, on réinitialise l'état.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="border-b border-border">
      <nav aria-label="Navigation">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm">
          <BrandLink />
          <ul className="hidden flex-wrap items-center gap-x-6 gap-y-2 md:flex">
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
                    className="cursor-not-allowed italic text-muted-foreground"
                  >
                    {entry.label} <span className="text-xs">bientôt</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-3">
            <ModeToggle />
            <div className="hidden min-w-0 md:block">
              <SessionSlot pathname={pathname} className="flex items-center" />
            </div>
            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((value) => !value)}
              className={`${FOCUS} inline-flex min-h-11 items-center rounded-lg border border-border px-3 font-medium text-foreground hover:bg-muted md:hidden`}
            >
              Menu
            </button>
          </div>
        </div>

        <div
          id={panelId}
          hidden={!open}
          className="border-t border-border md:hidden"
        >
          <ul className="text-sm">
            {NAV_ENTRIES.map((entry) => (
              <li key={entry.href}>
                {entry.exists ? (
                  <Link
                    href={entry.href}
                    aria-current={active === entry.href ? "page" : undefined}
                    onClick={close}
                    className={`${ROW} ${FOCUS} ${active === entry.href ? ACTIVE : IDLE}`}
                  >
                    {entry.label}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={`${ROW} cursor-not-allowed gap-2 italic text-muted-foreground`}
                  >
                    {entry.label}
                    <span className="text-xs">bientôt</span>
                  </span>
                )}
              </li>
            ))}
            {/* Dernier élément : le slot session. */}
            <li>
              <SessionSlot pathname={pathname} className={ROW} onNavigate={close} />
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

/** Slot session : réserve la place pendant le chargement, puis Connexion ou email + Déconnexion. */
function SessionSlot({
  pathname,
  className = "",
  onNavigate,
}: {
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const { session, signOut } = useSession();

  if (session.status === "loading") {
    return (
      <span aria-hidden="true" className={`${className} invisible`}>
        Connexion
      </span>
    );
  }

  if (session.status === "signedOut") {
    return (
      <SignIn pathname={pathname} className={className} onNavigate={onNavigate} />
    );
  }

  return (
    <div className={`${className} min-w-0 gap-3`}>
      <span
        title={session.email}
        className="min-w-0 max-w-32 truncate text-muted-foreground sm:max-w-48"
      >
        {session.email}
      </span>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          void signOut();
        }}
        className={`${FOCUS} ${IDLE} shrink-0`}
      >
        Déconnexion
      </button>
    </div>
  );
}

function SignIn({
  pathname,
  className = "",
  onNavigate,
}: {
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <SignInLink
          href={signInHref(pathname, "")}
          className={className}
          onNavigate={onNavigate}
        />
      }
    >
      <SignInFromLocation
        pathname={pathname}
        className={className}
        onNavigate={onNavigate}
      />
    </Suspense>
  );
}

function SignInFromLocation({
  pathname,
  className,
  onNavigate,
}: {
  pathname: string;
  className: string;
  onNavigate?: () => void;
}) {
  const search = useSearchParams().toString();
  return (
    <SignInLink
      href={signInHref(pathname, search)}
      className={className}
      onNavigate={onNavigate}
    />
  );
}

function SignInLink({
  href,
  className,
  onNavigate,
}: {
  href: string;
  className: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`${className} ${FOCUS} ${IDLE}`}
    >
      Connexion
    </Link>
  );
}
