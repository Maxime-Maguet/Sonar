export type SiteErrorHomeAction = {
  label: "Accueil";
  kind: "home";
  href: "/";
};

export type SiteErrorRetryAction = {
  label: "Réessayer";
  kind: "retry";
};

export type SiteErrorPageCopy = {
  siteName: "Sonar";
  sentence: string;
  actions: readonly (SiteErrorHomeAction | SiteErrorRetryAction)[];
};

export type SiteErrorPageKind =
  | "unknown-address"
  | "render-crash"
  | "frame-crash";

const homeAction = {
  label: "Accueil",
  kind: "home",
  href: "/",
} as const satisfies SiteErrorHomeAction;

const retryAction = {
  label: "Réessayer",
  kind: "retry",
} as const satisfies SiteErrorRetryAction;

const crashPage = {
  siteName: "Sonar",
  sentence: "Cette page n'a pas pu s'afficher.",
  actions: [retryAction, homeAction],
} as const satisfies SiteErrorPageCopy;

export function siteErrorPage(kind: SiteErrorPageKind): SiteErrorPageCopy {
  if (kind === "unknown-address") {
    return {
      siteName: "Sonar",
      sentence: "Cette adresse n'existe pas sur Sonar.",
      actions: [homeAction],
    };
  }

  if (kind === "render-crash" || kind === "frame-crash") {
    return crashPage;
  }

  throw new Error(`Unsupported site error page: ${kind}`);
}
