import {
  HOME_SOURCES,
  SOURCES_INTRO,
  SOURCES_LICENSE,
  SOURCES_TITLE,
  SOURCES_UNOFFICIAL,
} from "@/lib/home/home";

/** Provenance des données : texte seulement, aucun logo officiel. */
export function SourcesBlock({ className }: { className: string }) {
  return (
    <section aria-labelledby="sources-titre" className="py-12 md:py-20">
      <div className={className}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="sources-titre" className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {SOURCES_TITLE}
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">{SOURCES_INTRO}</p>
          <ul className="mt-6 space-y-3 text-left">
            {HOME_SOURCES.map((source) => (
              <li key={source.href} className="rounded-xl border border-border bg-card p-4">
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-from underline-offset-4 hover:underline"
                >
                  {source.label}
                </a>
                <p className="mt-1 text-sm text-muted-foreground">{source.description}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">{SOURCES_LICENSE}</p>
          <p className="mt-1 text-sm font-medium">{SOURCES_UNOFFICIAL}</p>
        </div>
      </div>
    </section>
  );
}
