import type { CompaniesPage, CompanyListItem } from "@sonar/api-contract";
import {
  INSEE_SOURCE_LABEL,
  INSEE_SOURCE_URL,
  LBB_SOURCE_LABEL,
  LBB_SOURCE_URL,
  UNOFFICIAL_NOTICE,
} from "@/lib/pistes/etalab";
import { signInHref } from "@/lib/navigation/navigation";
import type { SessionState } from "@/lib/session/session";

/** Textes de l'accueil. Aucun chiffre ; « offre » seulement dans la FAQ qui la nie et dans « n'est pas une offre ». */
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

/** Ligne de source Sirene, avec la date de MAJ quand elle est valide. */
export function sirenSourceLine(syncedAt: string | null): string {
  const hasValidDate = syncedAt !== null && !Number.isNaN(Date.parse(syncedAt));
  const date = hasValidDate ? ` · mis à jour le ${formatSyncDate(syncedAt)}` : "";
  return `Source : ${INSEE_SOURCE_LABEL}${date}`;
}

export function companiesCounter(summary: CompaniesSummary | null): HomeCounter {
  if (summary === null || !Number.isFinite(summary.hits) || summary.hits <= 0) {
    return { key: "companies", label: COMPANIES_LABEL, value: COUNTER_NO_DATA, caption: null };
  }
  return {
    key: "companies",
    label: COMPANIES_LABEL,
    value: new Intl.NumberFormat("fr-FR").format(summary.hits),
    caption: sirenSourceLine(summary.syncedAt),
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

/** Nombre d'entreprises montrées dans l'aperçu de l'annuaire. */
export const DIRECTORY_PREVIEW_COUNT = 4;
export const DIRECTORY_EYEBROW = "L'annuaire";
export const DIRECTORY_TITLE = "Un aperçu des entreprises tech de Toulouse";
export const DIRECTORY_LINK = { label: "Voir tout l'annuaire", href: "/explorer" } as const;

/** Réduit la réponse de GET /companies aux champs du compteur ; `null` si l'API a échoué. */
export function companiesSummary(page: CompaniesPage | null): CompaniesSummary | null {
  return page === null ? null : { hits: page.hits, syncedAt: page.syncedAt };
}

export type DirectoryPreview = { companies: CompanyListItem[]; sourceLine: string };

/**
 * Aperçu de l'annuaire : les premières entreprises, dans l'ordre de l'API (stable).
 * `null` (bloc masqué) si l'API a échoué ou n'a rien renvoyé.
 */
export function directoryPreview(page: CompaniesPage | null): DirectoryPreview | null {
  if (page === null || !Array.isArray(page.items) || page.items.length === 0) return null;
  return {
    companies: page.items.slice(0, DIRECTORY_PREVIEW_COUNT),
    sourceLine: sirenSourceLine(page.syncedAt),
  };
}

export const PISTE_EYEBROW = "Les pistes";
export const PISTE_TITLE = "À quoi ressemble une piste";
export const PISTE_SUBTITLE =
  "Une piste est une entreprise qui peut embaucher, à approcher par candidature spontanée. Ce n'est pas une offre.";
export const PISTE_MOCKUP = {
  badge: "Exemple",
  companyName: "Entreprise Exemple",
  city: "Toulouse",
  activity: "Activité de l'entreprise",
  gaugeLabel: "Potentiel d'embauche fourni par La Bonne Boîte",
  gaugeHint: "Le potentiel est affiché sur vos pistes une fois connecté.",
  reminder: "Une piste n'est pas une offre : aucune annonce n'est publiée, le premier pas vous revient.",
} as const;

export const SOURCES_TITLE = "D'où viennent les données";
export const SOURCES_INTRO = "Sonar s'appuie sur deux sources publiques.";
export const HOME_SOURCES: readonly { label: string; description: string; href: string }[] = [
  {
    label: INSEE_SOURCE_LABEL,
    description: "Le répertoire des entreprises, qui alimente l'annuaire.",
    href: INSEE_SOURCE_URL,
  },
  {
    label: LBB_SOURCE_LABEL,
    description: "Les entreprises susceptibles de recruter, qui alimentent les pistes.",
    href: LBB_SOURCE_URL,
  },
];
export const SOURCES_LICENSE = "Ces données sont réutilisées sous Licence Ouverte Etalab.";
export const SOURCES_UNOFFICIAL = UNOFFICIAL_NOTICE;

export const FAQ_TITLE = "Questions fréquentes";
export const HOME_FAQ: readonly { question: string; answer: string }[] = [
  {
    question: "Est-ce une offre d'emploi ?",
    answer:
      "Non. Une piste est une entreprise qui peut embaucher, pas une annonce : aucun poste n'est publié, le premier pas vous revient.",
  },
  {
    question: "Sonar est-il un service officiel ?",
    answer:
      "Non. Sonar réutilise des données publiques de l'INSEE et de France Travail. C'est un projet personnel.",
  },
  {
    question: "Pourquoi un compte pour les pistes ?",
    answer:
      "Les pistes viennent d'une API dont le nombre de requêtes est limité. Le compte protège ce quota.",
  },
  {
    question: "Un employeur recrute-t-il forcément ?",
    answer:
      "Non. « Employeur » aide à découvrir une entreprise, ce n'est pas un signal de recrutement.",
  },
];

export const ABOUT_TEXT = "Sonar est un projet personnel, réalisé dans le cadre d'un portfolio.";
