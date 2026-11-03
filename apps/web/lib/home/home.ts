import { INSEE_SOURCE_LABEL } from "@/lib/pistes/etalab";
import { signInHref } from "@/lib/navigation/navigation";
import type { SessionState } from "@/lib/session/session";

/** Textes de l'accueil. Aucun chiffre ni le mot « offre » : les nombres viennent de l'API. */
export const HOME_BADGE = "Toulouse";
export const HOME_TITLE = "Sonar";
export const HOME_INTRO =
  "Sonar éclaire l'écosystème tech de Toulouse : les entreprises du territoire, leurs technologies, les rendez-vous à ne pas manquer.";
export const HOME_PARAGRAPHS: readonly string[] = [
  "L'annuaire recense les entreprises toulousaines à partir des données publiques Sirene. Il est consultable dès maintenant.",
  "Une piste est une entreprise susceptible de recruter, à approcher par candidature spontanée. Ce n'est jamais une annonce publiée : c'est à vous de faire le premier pas.",
  "L'agenda des événements, le radar et le CRM de suivi des candidatures arriveront bientôt.",
];

export const COMPANIES_LABEL = "Entreprises";
export const TECHNOLOGIES_LABEL = "Technologies";
export const EVENTS_LABEL = "Événements";
export const COUNTER_NO_DATA = "—";
export const COUNTER_SOON = "Bientôt";

export const PRIMARY_ACTION = { label: "Explorer l'annuaire", href: "/explorer" } as const;
export const SIGN_IN_LABEL = "Se connecter";
export const PISTES_ACTION = { label: "Voir les pistes", href: "/pistes" } as const;

export type HomeCounter = {
  key: "companies" | "technologies" | "events";
  label: string;
  /** Nombre formaté, ou « — » quand il n'y a pas de donnée (jamais « 0 »). */
  value: string;
  /** Ligne sous le chiffre : source et date, « Bientôt », ou absente. */
  caption: string | null;
};

/** Ce que la page retient de GET /companies ; `null` quand l'annuaire est illisible. */
export type CompaniesSummary = { hits: number; syncedAt: string | null };

/** Date seule (jour, mois, année) en français, fuseau de Paris. */
export function formatSyncDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export function companiesCounter(summary: CompaniesSummary | null): HomeCounter {
  if (summary === null || !Number.isFinite(summary.hits) || summary.hits <= 0) {
    return { key: "companies", label: COMPANIES_LABEL, value: COUNTER_NO_DATA, caption: null };
  }
  const date = summary.syncedAt ? ` · mis à jour le ${formatSyncDate(summary.syncedAt)}` : "";
  return {
    key: "companies",
    label: COMPANIES_LABEL,
    value: new Intl.NumberFormat("fr-FR").format(summary.hits),
    caption: `Source : ${INSEE_SOURCE_LABEL}${date}`,
  };
}

export function homeCounters(summary: CompaniesSummary | null): HomeCounter[] {
  return [
    companiesCounter(summary),
    { key: "technologies", label: TECHNOLOGIES_LABEL, value: COUNTER_NO_DATA, caption: COUNTER_SOON },
    { key: "events", label: EVENTS_LABEL, value: COUNTER_NO_DATA, caption: COUNTER_SOON },
  ];
}

export type SecondaryAction = { label: string; href: string };

/** Action secondaire ; `null` pendant le chargement (emplacement vide réservé). */
export function secondaryAction(session: SessionState): SecondaryAction | null {
  switch (session.status) {
    case "signedOut":
      return { label: SIGN_IN_LABEL, href: signInHref("/", "") };
    case "signedIn":
      return PISTES_ACTION;
    case "loading":
      return null;
  }
}
