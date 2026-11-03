import Link from "next/link";

/** Marque « Sonar », lien vers l'accueil (menu et pages de connexion/inscription). */
export function BrandLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Sonar, accueil"
      className={`rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 text-base font-semibold tracking-tight text-foreground ${className}`.trim()}
    >
      Sonar
    </Link>
  );
}
