"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ACTIVE = "font-medium text-foreground";
const IDLE = "text-muted-foreground hover:text-foreground";

export function SiteHeader({ loginHref }: { loginHref: string }) {
  const pathname = usePathname();
  const isPistes = pathname === "/pistes";
  const isExplorer = pathname === "/explorer";

  return (
    <header className="border-b border-border">
      <nav
        aria-label="Navigation"
        className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4 text-sm"
      >
        <Link href="/" className={IDLE}>
          Accueil
        </Link>
        <Link
          href="/pistes"
          aria-current={isPistes ? "page" : undefined}
          className={isPistes ? ACTIVE : IDLE}
        >
          Pistes
        </Link>
        <Link
          href="/explorer"
          aria-current={isExplorer ? "page" : undefined}
          className={isExplorer ? ACTIVE : IDLE}
        >
          Explorer
        </Link>
        <Link
          href={loginHref}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          Connexion
        </Link>
      </nav>
    </header>
  );
}
