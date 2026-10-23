import Link from "next/link";

export function SiteHeader({ loginHref }: { loginHref: string }) {
  return (
    <header className="border-b border-border">
      <nav
        aria-label="Navigation"
        className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4 text-sm"
      >
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Accueil
        </Link>
        <Link
          href="/pistes"
          aria-current="page"
          className="font-medium text-foreground"
        >
          Pistes
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
