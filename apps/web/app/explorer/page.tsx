import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CompaniesPage } from "@sonar/api-contract";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listCompanies } from "@/lib/api/server";
import { explorerFooterLines } from "@/lib/explorer/footer-sources";
import {
  canonicalizeExplorerQuery,
  explorerPath,
  needsRedirect,
  readExplorerQuery,
  type RawSearchParams,
} from "@/lib/explorer/query";
import {
  decideExplorerState,
  EXPLORER_MESSAGES,
  formatTotal,
} from "@/lib/explorer/state";

export const metadata: Metadata = {
  title: "Explorer — Sonar",
};

const fieldClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const linkClassName =
  "font-medium text-primary underline-offset-4 hover:underline";
const NO_ACTIVITY_LABEL = "Activité non renseignée";

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const requested = readExplorerQuery(raw);

  let data: CompaniesPage | null = null;
  try {
    data = await listCompanies(requested);
  } catch {
    data = null;
  }

  // redirect() lève : hors du try/catch.
  if (data) {
    const canonical = canonicalizeExplorerQuery(
      requested,
      data.facets,
      data.hits,
      data.pageSize,
    );
    if (needsRedirect(raw, canonical)) redirect(explorerPath(canonical));
  }

  const query = data
    ? canonicalizeExplorerQuery(requested, data.facets, data.hits, data.pageSize)
    : requested;
  const state = data
    ? decideExplorerState({
        failed: false,
        hits: data.hits,
        filtered: Boolean(query.city || query.activityCode),
      })
    : decideExplorerState({ failed: true });

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader loginHref="/login" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Explorer</h1>
          <p className="text-sm text-muted-foreground">
            L&apos;annuaire des entreprises de Sonar. Une piste est un signal à
            vérifier. Le libellé d&apos;activité décrit l&apos;entreprise, il ne
            dit rien de ses projets d&apos;embauche.
          </p>
        </div>

        {data ? (
          <form
            method="get"
            action="/explorer"
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Commune
              <select
                name="city"
                defaultValue={query.city ?? ""}
                className={fieldClassName}
              >
                <option value="">Toutes les communes</option>
                {data.facets.cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Activité
              <select
                name="activityCode"
                defaultValue={query.activityCode ?? ""}
                className={fieldClassName}
              >
                <option value="">Toutes les activités</option>
                {data.facets.activities.map((activity) => (
                  <option key={activity.code} value={activity.code}>
                    {activity.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Filtrer
            </button>
          </form>
        ) : null}

        {state === "api-down" ? (
          <p role="alert" className="text-sm text-destructive">
            {EXPLORER_MESSAGES["api-down"]}
          </p>
        ) : null}
        {state === "empty" ? (
          <p className="text-sm text-muted-foreground">
            {EXPLORER_MESSAGES.empty}
          </p>
        ) : null}
        {state === "no-match" ? (
          <p className="text-sm text-muted-foreground">
            {EXPLORER_MESSAGES["no-match"]}
          </p>
        ) : null}

        {data && state === "results" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {formatTotal(data.hits)}
            </p>
            <ul className="flex flex-col gap-4">
              {data.items.map((item, index) => (
                <li
                  key={`${item.name}-${item.city}-${index}`}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <h2 className="text-base font-medium">{item.name}</h2>
                  <p className="text-sm text-muted-foreground">{item.city}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.activityLabel ?? NO_ACTIVITY_LABEL}
                  </p>
                </li>
              ))}
            </ul>
            <nav
              aria-label="Pagination"
              className="flex items-center gap-3 text-sm"
            >
              {query.page > 1 ? (
                <Link
                  href={explorerPath({ ...query, page: query.page - 1 })}
                  className={linkClassName}
                >
                  Précédent
                </Link>
              ) : (
                <span className="text-muted-foreground">Précédent</span>
              )}
              <span>Page {query.page}</span>
              {query.page * data.pageSize < data.hits ? (
                <Link
                  href={explorerPath({ ...query, page: query.page + 1 })}
                  className={linkClassName}
                >
                  Suivant
                </Link>
              ) : (
                <span className="text-muted-foreground">Suivant</span>
              )}
            </nav>
          </div>
        ) : null}
      </main>
      <SiteFooter lines={explorerFooterLines(data?.syncedAt ?? null)} />
    </div>
  );
}
