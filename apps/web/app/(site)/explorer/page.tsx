import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { CompaniesPage } from "@sonar/api-contract";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { FooterSources } from "@/components/footer-sources";
import { listCompanies } from "@/lib/api/server";
import { explorerFooterLines } from "@/lib/explorer/footer-sources";
import {
  canonicalizeExplorerQuery,
  explorerPath,
  needsRedirect,
  readExplorerQuery,
  type RawSearchParams,
} from "@/lib/explorer/query";
import { totalPages } from "@/lib/pagination/window";
import {
  decideExplorerState,
  EXPLORER_MESSAGES,
  formatTotal,
} from "@/lib/explorer/state";

export const metadata: Metadata = {
  title: "Explorer — Sonar",
};

const fieldClassName =
  "h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
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
    <>
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-8">
        <div className="flex w-full max-w-3xl flex-col gap-8">
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
              {/* Button porte le curseur, le survol et l'anneau de focus clavier */}
              <Button type="submit" variant="default" size="lg">
                Filtrer
              </Button>
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
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.items.map((item, index) => (
                  <li
                    key={`${item.name}-${item.city}-${index}`}
                    className="card-lift h-full min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5"
                  >
                    <h2 className="text-base font-medium wrap-break-word">
                      {item.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{item.city}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.activityLabel ?? NO_ACTIVITY_LABEL}
                    </p>
                  </li>
                ))}
              </ul>
              <Pagination
                page={query.page}
                totalPages={totalPages(data.hits, data.pageSize)}
                hrefForPage={(page) => explorerPath({ ...query, page })}
              />
            </div>
          ) : null}
        </div>
      </main>
      <FooterSources lines={explorerFooterLines(data?.syncedAt ?? null)} />
    </>
  );
}
