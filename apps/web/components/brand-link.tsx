import Link from "next/link";

/** Marque « Sonar », lien vers l'accueil (menu et pages de connexion/inscription). */
export function BrandLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Sonar, accueil"
      className={`rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 text-brand text-2xl leading-none font-bold lg:text-3xl tracking-tight transition-[filter] duration-300 hover:brightness-110 motion-reduce:transition-none ${className}`.trim()}
    >
      Sonar
    </Link>
  );
}
