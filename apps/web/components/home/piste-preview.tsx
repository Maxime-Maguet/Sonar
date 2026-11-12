import { PISTE_EYEBROW, PISTE_MOCKUP, PISTE_SUBTITLE, PISTE_TITLE } from "@/lib/home/home";

/** Maquette statique d'une piste : aucun chiffre, aucun appel API. */
export function PistePreview({ className }: { className: string }) {
  return (
    <section aria-labelledby="piste-titre" className="py-12 md:py-20">
      <div className={className}>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-medium tracking-wide text-brand-from uppercase">{PISTE_EYEBROW}</p>
          <h2 id="piste-titre" className="mt-2 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {PISTE_TITLE}
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">{PISTE_SUBTITLE}</p>
        </div>
        <article className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-dashed border-border bg-card p-6 shadow-card">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold wrap-break-word">{PISTE_MOCKUP.companyName}</h3>
              <p className="text-sm text-muted-foreground">{PISTE_MOCKUP.city}</p>
              <p className="text-sm text-muted-foreground">{PISTE_MOCKUP.activity}</p>
            </div>
            <span className="ml-auto inline-flex w-fit shrink-0 items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-brand-from">
              {PISTE_MOCKUP.badge}
            </span>
          </div>
          <div className="space-y-2">
            <div aria-hidden="true" className="h-2 w-full rounded-full bg-muted" />
            <p className="text-xs text-muted-foreground">{PISTE_MOCKUP.gaugeLabel}</p>
            <p className="text-xs text-muted-foreground">{PISTE_MOCKUP.gaugeHint}</p>
          </div>
          <p className="border-t border-border pt-4 text-sm text-muted-foreground text-pretty">
            {PISTE_MOCKUP.reminder}
          </p>
        </article>
      </div>
    </section>
  );
}
