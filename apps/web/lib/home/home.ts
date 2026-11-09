import { INSEE_SOURCE_LABEL } from "@/lib/pistes/etalab";
import { signInHref } from "@/lib/navigation/navigation";
import type { SessionState } from "@/lib/session/session";

/** Textes de l'accueil. Aucun chiffre ni le mot « offre » : les nombres viennent de l'API. */
export const HOME_BADGE = "Toulouse";
export const HOME_TITLE = "Sonar";
export const HOME_TAGLINE = "L'écosystème tech toulousain, enfin lisible.";
export const HOME_INTRO =
  "Sonar réunit les entreprises tech de Toulouse issues des données publiques et vous aide à repérer celles à approcher par candidature spontanée.";

/** Taille commune des deux boutons de l'accueil (principal et secondaire, y compris l'emplacement invisible). */
export const HOME_ACTION_SIZE_CLASS = "h-11 gap-2 px-6 text-base";

export const FEATURES_EYEBROW = "Ce que fait Sonar";
export const FEATURES_TITLE = "Un point de départ pour votre recherche";
export const FEATURES_SUBTITLE =
  "Deux outils sont déjà disponibles. D'autres sont prévus : ils arriveront bientôt.";
export const FEATURE_AVAILABLE_BADGE = "Disponible";
export const FEATURE_SOON_BADGE = "Bientôt";

export type HomeFeature = {
  key: "directory" | "pistes" | "agenda" | "radar" | "crm";
  title: string;
  description: string;
  status: "available" | "soon";
  /** Présents seulement pour les fonctions disponibles. */
  href?: string;
  ctaLabel?: string;
};

export const HOME_FEATURES: readonly HomeFeature[] = [
  {
    key: "directory",
    title: "Annuaire",
    description:
      "Les entreprises tech de Toulouse, issues de la base publique Sirene. Un moyen de les découvrir, pas la preuve qu'elles recrutent.",
    status: "available",
    href: "/explorer",
    ctaLabel: "Explorer l'annuaire",
  },
  {
    key: "pistes",
    title: "Pistes",
    description:
      "Des entreprises susceptibles de recruter, à approcher par candidature spontanée. Ce n'est jamais une annonce : le premier pas vous revient. Potentiel d'embauche fourni par La Bonne Boîte.",
    status: "available",
    href: "/pistes",
    ctaLabel: "Voir les pistes",
  },
  {
    key: "agenda",
    title: "Agenda",
    description: "Les événements tech de Toulouse (meetups, conférences) seront réunis au même endroit.",
    status: "soon",
  },
  {
    key: "radar",
    title: "Radar",
    description: "Le radar signalera les entreprises qui bougent, avec la source de chaque signal.",
    status: "soon",
  },
  {
    key: "crm",
    title: "Suivi des candidatures",
    description: "Un tableau Kanban suivra vos candidatures spontanées, de l'envoi à la réponse.",
    status: "soon",
  },
];

export const STEPS_TITLE = "Comment ça marche";
export const HOME_STEPS: readonly { title: string; description: string }[] = [
  {
    title: "Explorez l'annuaire",
    description: "Parcourez les entreprises tech de Toulouse, d'après les données Sirene.",
  },
  {
    title: "Repérez des pistes",
    description: "Identifiez les entreprises susceptibles de recruter, d'après La Bonne Boîte.",
  },
  {
    title: "Candidatez spontanément",
    description: "Contactez l'entreprise de votre choix. Sonar n'envoie rien à votre place.",
  },
];

export const CTA_TITLE = "Prêt à explorer l'écosystème tech toulousain ?";
export const CTA_TEXT =
  "Commencez par l'annuaire. L'agenda, le radar et le suivi des candidatures arriveront bientôt.";
export const COUNTERS_LABEL = "Chiffres clés";

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
  const hasValidDate = summary.syncedAt !== null && !Number.isNaN(Date.parse(summary.syncedAt));
  const date = hasValidDate ? ` · mis à jour le ${formatSyncDate(summary.syncedAt as string)}` : "";
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
