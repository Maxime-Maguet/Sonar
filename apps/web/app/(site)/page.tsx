import Link from "next/link";
import { HomeSecondaryAction } from "@/components/home-secondary-action";
import { buttonVariants } from "@/components/ui/button";
import { listCompanies } from "@/lib/api/server";
import {
  HOME_BADGE,
  HOME_INTRO,
  HOME_PARAGRAPHS,
  HOME_TITLE,
  homeCounters,
  PRIMARY_ACTION,
  type CompaniesSummary,
} from "@/lib/home/home";

// Le compteur reflète l'annuaire au moment de la requête.
export const dynamic = "force-dynamic";

/** Total et date de synchronisation ; `null` si l'API est injoignable (la page se charge quand même). */
async function readCompaniesSummary(): Promise<CompaniesSummary | null> {
  try {
    const page = await listCompanies({ page: 1, pageSize: 1 });
    return { hits: page.hits, syncedAt: page.syncedAt };
  } catch {
    return null;
  }
}

export default async function Home() {
  const counters = homeCounters(await readCompaniesSummary());

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
        {HOME_BADGE}
      </span>

      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">{HOME_TITLE}</h1>
        <p className="max-w-xl text-lg text-foreground">{HOME_INTRO}</p>
        {HOME_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph} className="max-w-xl text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {counters.map((counter) => (
          <div key={counter.key} className="rounded-xl border border-border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{counter.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight">{counter.value}</dd>
            {counter.caption ? (
              <dd className="mt-1 text-xs text-muted-foreground">{counter.caption}</dd>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-3">
        <Link href={PRIMARY_ACTION.href} className={buttonVariants({ size: "lg" })}>
          {PRIMARY_ACTION.label}
        </Link>
        <HomeSecondaryAction />
      </div>
    </main>
  );
}
