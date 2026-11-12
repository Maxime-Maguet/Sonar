import {
  ArrowRight,
  Building2,
  CalendarDays,
  Compass,
  Cpu,
  KanbanSquare,
  MapPin,
  Radar,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { HomeSecondaryAction } from "@/components/home-secondary-action";
import { buttonVariants } from "@/components/ui/button";
import { listCompanies } from "@/lib/api/server";
import {
  COUNTER_NO_DATA,
  COUNTER_SOON,
  COUNTERS_LABEL,
  CTA_TEXT,
  CTA_TITLE,
  FEATURE_AVAILABLE_BADGE,
  FEATURE_SOON_BADGE,
  FEATURES_EYEBROW,
  FEATURES_SUBTITLE,
  FEATURES_TITLE,
  HOME_ACTION_SIZE_CLASS,
  HOME_BADGE,
  HOME_FEATURES,
  HOME_INTRO,
  HOME_STEPS,
  HOME_TAGLINE,
  HOME_TITLE,
  homeCounters,
  PRIMARY_ACTION,
  STEPS_TITLE,
  type CompaniesSummary,
  type HomeCounter,
  type HomeFeature,
} from "@/lib/home/home";
import { cn } from "cn";

// Le compteur reflète l'annuaire au moment de la requête.
export const dynamic = "force-dynamic";

const COUNTER_ICONS: Record<HomeCounter["key"], LucideIcon> = {
  companies: Building2,
  technologies: Cpu,
  events: CalendarDays,
};

const FEATURE_ICONS: Record<HomeFeature["key"], LucideIcon> = {
  directory: Building2,
  pistes: Compass,
  agenda: CalendarDays,
  radar: Radar,
  crm: KanbanSquare,
};

const INNER = "mx-auto w-full max-w-6xl px-6 md:px-8";
const PRIMARY_CLASS = cn(
  buttonVariants({ size: "lg" }),
  HOME_ACTION_SIZE_CLASS,
  "font-semibold shadow-md transition-[color,background-color,border-color,box-shadow,translate] duration-500 ease-in-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-px motion-reduce:hover:translate-y-0",
);
const BADGE_SOON =
  "inline-flex w-fit items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground";

/** Total et date de synchronisation ; `null` si l'API est injoignable (la page se charge quand même). */
async function readCompaniesSummary(): Promise<CompaniesSummary | null> {
  try {
    const page = await listCompanies({ page: 1, pageSize: 1 });
    return { hits: page.hits, syncedAt: page.syncedAt };
  } catch {
    return null;
  }
}

function HomeActions({ className }: { className: string }) {
  return (
    <div className={className}>
      <Link href={PRIMARY_ACTION.href} className={PRIMARY_CLASS}>
        {PRIMARY_ACTION.label}
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-300 ease-calm group-hover/button:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/button:translate-x-0"
        />
      </Link>
      <HomeSecondaryAction />
    </div>
  );
}

function FeatureCard({ feature }: { feature: HomeFeature }) {
  const Icon = FEATURE_ICONS[feature.key];
  const available = feature.status === "available";
  const span = available ? "lg:col-span-3" : "lg:col-span-2";

  const header = (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-primary/10",
          available ? "size-10" : "size-9",
        )}
      >
        <Icon aria-hidden="true" className="size-5 text-primary" />
      </span>
      <span
        className={cn(
          "ml-auto",
          available
            ? "inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-brand-from"
            : BADGE_SOON,
        )}
      >
        {available ? FEATURE_AVAILABLE_BADGE : FEATURE_SOON_BADGE}
      </span>
    </div>
  );

  if (!available || !feature.href) {
    return (
      <li className={span}>
        <article className="relative flex h-full flex-col gap-3 rounded-xl border border-dashed border-border bg-card/50 p-6">
          {header}
          <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
          <p className="text-sm text-muted-foreground text-pretty">{feature.description}</p>
        </article>
      </li>
    );
  }

  return (
    <li className={span}>
      <article className="group relative flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-6 card-lift has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        {header}
        <h3 className="text-lg font-semibold tracking-tight">
          <Link href={feature.href} className="outline-none after:absolute after:inset-0 after:rounded-xl">
            {feature.title}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground text-pretty">{feature.description}</p>
        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-brand-from"
        >
          {feature.ctaLabel}
          <ArrowRight className="size-4 transition-transform duration-300 ease-calm group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </span>
      </article>
    </li>
  );
}

export default async function Home() {
  const counters = homeCounters(await readCompaniesSummary());

  return (
    <main id="contenu" className="flex w-full flex-1 flex-col overflow-x-clip">
      <div className="relative isolate pt-12 pb-10 md:pt-20 md:pb-16">
        <div aria-hidden className="bg-brand-glow pointer-events-none absolute inset-x-0 -top-14 -z-10 h-full" />
        <div className={INNER}>
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-brand-from uppercase">
              <MapPin aria-hidden="true" className="size-3.5" />
              {HOME_BADGE}
            </span>
            <h1 className="text-5xl font-semibold tracking-tight text-balance md:text-6xl">
              <span className="text-brand pb-1 leading-tight font-bold">{HOME_TITLE}</span>
            </h1>
            <p className="text-xl font-medium text-balance md:text-2xl">{HOME_TAGLINE}</p>
            <p className="max-w-2xl text-lg text-muted-foreground text-pretty">{HOME_INTRO}</p>
            <HomeActions className="mt-2 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center" />
          </div>
        </div>
      </div>

      <section aria-label={COUNTERS_LABEL} className="py-12 md:py-20">
        <div className={INNER}>
          <dl className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            {counters.map((counter) => {
              const Icon = COUNTER_ICONS[counter.key];
              return (
                <div key={counter.key} className="rounded-xl border border-border bg-card p-5 text-left shadow-card">
                  <span className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon aria-hidden="true" className="size-5 text-primary" />
                  </span>
                  <dt className="text-sm font-medium text-muted-foreground">{counter.label}</dt>
                  <dd
                    className={cn(
                      "mt-1 text-4xl font-semibold tracking-tight tabular-nums",
                      counter.value === COUNTER_NO_DATA && "text-muted-foreground",
                    )}
                  >
                    {counter.value}
                  </dd>
                  {counter.caption === COUNTER_SOON ? (
                    <dd className={cn(BADGE_SOON, "mt-2")}>{counter.caption}</dd>
                  ) : counter.caption ? (
                    <dd className="mt-2 text-xs text-muted-foreground text-balance">{counter.caption}</dd>
                  ) : null}
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <section aria-labelledby="fonctions-titre" className="py-12 md:py-20">
        <div className={INNER}>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-medium tracking-wide text-brand-from uppercase">{FEATURES_EYEBROW}</p>
            <h2 id="fonctions-titre" className="mt-2 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
              {FEATURES_TITLE}
            </h2>
            <p className="mt-3 text-muted-foreground text-pretty">{FEATURES_SUBTITLE}</p>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {HOME_FEATURES.map((feature) => (
              <FeatureCard key={feature.key} feature={feature} />
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="etapes-titre" className="py-12 md:py-20">
        <div className={INNER}>
          <div className="rounded-2xl border border-border bg-muted/40 p-6 md:p-10">
            <h2 id="etapes-titre" className="text-center text-2xl font-semibold tracking-tight text-balance md:text-3xl">
              {STEPS_TITLE}
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {HOME_STEPS.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-brand-from tabular-nums">
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className={cn(INNER, "mb-12 md:mb-20")}>
        <section
          aria-labelledby="cta-titre"
          className="relative isolate overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-card md:py-16"
        >
          <div aria-hidden className="bg-brand-glow pointer-events-none absolute inset-0 -z-10" />
          <h2 id="cta-titre" className="text-3xl font-semibold tracking-tight text-balance">
            {CTA_TITLE}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{CTA_TEXT}</p>
          <HomeActions className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center" />
        </section>
      </div>
    </main>
  );
}
