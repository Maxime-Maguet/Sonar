"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LeadsPage } from "@sonar/api-contract";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listLeads } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { metierOptions } from "@/lib/pistes/metiers";
import {
  classifyPistesLoadError,
  EMPTY_PISTES_MESSAGE,
  PISTES_LOAD_MESSAGES,
  type PistesLoadFailure,
} from "@/lib/pistes/load-error";
import {
  DEFAULT_ROME,
  loginPathForPistes,
  pistesPath,
  readPage,
  readRome,
} from "@/lib/pistes/query";

function formatHiringPotential(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

const fieldClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: LeadsPage }
  | { status: "error"; kind: PistesLoadFailure };

export function PistesFallback() {
  return (
    <PistesFrame loginHref={loginPathForPistes(DEFAULT_ROME, 1)}>
      <PistesSkeleton />
    </PistesFrame>
  );
}

export function PistesBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rome = readRome(searchParams.get("rome"));
  const page = readPage(searchParams.get("page"));
  const [fetchedAt, setFetchedAt] = useState<string>();

  useEffect(() => {
    const canonical = pistesPath(rome, page);
    const current = searchParams.toString();
    const currentPath = current === "" ? "/pistes" : `/pistes?${current}`;
    if (currentPath !== canonical) router.replace(canonical);
  }, [rome, page, router, searchParams]);

  return (
    <PistesFrame
      loginHref={loginPathForPistes(rome, page)}
      fetchedAt={fetchedAt}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Pistes</h1>
        <p className="text-sm text-muted-foreground">
          Entreprises de Toulouse qui peuvent embaucher sur ce métier. Une
          piste n&apos;est pas une offre d&apos;emploi.
        </p>
        <p className="text-sm text-muted-foreground">
          Le potentiel d&apos;embauche (0-100) est attribué à La Bonne Boîte.
          Ce n&apos;est pas un score Sonar.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="rome" className="text-sm font-medium">
          Métier
        </label>
        <select
          id="rome"
          className={fieldClassName}
          value={rome}
          onChange={(event) => {
            router.push(pistesPath(event.target.value, 1));
          }}
        >
          {metierOptions(rome).map((metier) => (
            <option key={metier.rome} value={metier.rome}>
              {metier.rome} — {metier.label}
            </option>
          ))}
        </select>
      </div>

      <PistesLoader
        key={`${rome}:${page}`}
        rome={rome}
        page={page}
        onFetchedAt={setFetchedAt}
      />
    </PistesFrame>
  );
}

function PistesLoader({
  rome,
  page,
  onFetchedAt,
}: {
  rome: string;
  page: number;
  onFetchedAt: (iso: string | undefined) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    onFetchedAt(undefined);
    listLeads({ rome, page })
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", data });
        onFetchedAt(data.fetchedAt);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace(loginPathForPistes(rome, page));
          return;
        }
        setState({
          status: "error",
          kind: classifyPistesLoadError(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [rome, page, router, onFetchedAt]);

  if (state.status === "loading") return <PistesSkeleton />;
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {PISTES_LOAD_MESSAGES[state.kind]}
      </p>
    );
  }
  return <PistesResults rome={rome} page={page} data={state.data} />;
}

function PistesFrame({
  loginHref,
  fetchedAt,
  children,
}: {
  loginHref: string;
  fetchedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader loginHref={loginHref} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
      <SiteFooter fetchedAt={fetchedAt} />
    </div>
  );
}

function PistesSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <p className="text-sm text-muted-foreground">Chargement des pistes…</p>
      {["a", "b", "c"].map((key) => (
        <div
          key={key}
          className="h-28 animate-pulse rounded-xl border border-border bg-muted"
        />
      ))}
    </div>
  );
}

function PistesResults({
  rome,
  page,
  data,
}: {
  rome: string;
  page: number;
  data: LeadsPage;
}) {
  const hasPrevious = page > 1;
  const hasNext = page * data.pageSize < data.hits;

  return (
    <div className="space-y-4">
      {data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {EMPTY_PISTES_MESSAGE}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((item) => (
            <li key={`${item.companyId}:${item.rome}`}>
              <article className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-medium">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {item.city ?? "Ville non renseignée"}
                    </p>
                  </div>
                  {item.isHighPotential === true ? (
                    <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
                      Fort potentiel
                    </span>
                  ) : null}
                </div>
                <p className="text-sm">
                  Potentiel d&apos;embauche La Bonne Boîte :{" "}
                  {item.hiringPotential === null
                    ? "non communiqué"
                    : `${formatHiringPotential(item.hiringPotential)} / 100`}
                </p>
                <Button type="button" disabled>
                  Ajouter au CRM
                  <span className="text-xs font-normal">bientôt</span>
                </Button>
              </article>
            </li>
          ))}
        </ul>
      )}

      <nav aria-label="Pagination" className="flex items-center gap-3 text-sm">
        {hasPrevious ? (
          <Link
            href={pistesPath(rome, page - 1)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Page précédente
          </Link>
        ) : (
          <span className="text-muted-foreground">Page précédente</span>
        )}
        <span>Page {data.page}</span>
        {hasNext ? (
          <Link
            href={pistesPath(rome, page + 1)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Page suivante
          </Link>
        ) : (
          <span className="text-muted-foreground">Page suivante</span>
        )}
      </nav>
    </div>
  );
}
