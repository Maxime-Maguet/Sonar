import { describe, expect, it } from "vitest";
import type { CompaniesPage, CompanyListItem } from "@sonar/api-contract";
import type { SessionState } from "@/lib/session/session";
import * as home from "./home";
import {
  companiesCounter,
  companiesSummary,
  directoryPreview,
  DIRECTORY_PREVIEW_COUNT,
  formatSyncDate,
  HOME_FEATURES,
  HOME_STEPS,
  CTA_TEXT,
  FEATURES_SUBTITLE,
  homeCounters,
  PISTES_ACTION,
  PRIMARY_ACTION,
  SIGN_IN_LABEL,
  secondaryAction,
  sirenSourceLine,
} from "./home";

/** Tous les textes exportés du module (parcours récursif), hors classes CSS. */
function collectTexts(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectTexts(v, out);
  else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) collectTexts(v, out);
  }
  return out;
}

const { HOME_ACTION_SIZE_CLASS, ...exportedValues } = home;
void HOME_ACTION_SIZE_CLASS;
const exportedTexts = collectTexts(
  Object.values(exportedValues).filter((v) => typeof v !== "function"),
);
const copy = [
  ...exportedTexts,
  ...home.homeCounters(null).flatMap((c) => [c.label, c.caption ?? ""]),
  ...[{ status: "signedOut" }, { status: "signedIn", email: "a@b.fr" }].map(
    (session) => home.secondaryAction(session as SessionState)?.label ?? "",
  ),
];

/** Les URL des sources contiennent des chiffres : on les écarte du contrôle « aucun chiffre ». */
const sourceHrefs = new Set(home.HOME_SOURCES.map((source) => source.href));
const copyWithoutUrls = copy.filter((text) => !sourceHrefs.has(text));

/** Fabrique une entreprise de test. */
function company(name: string): CompanyListItem {
  return { name, city: "Toulouse", activityCode: null, activityLabel: null };
}

/** Fabrique une page d'annuaire de test avec `count` entreprises (E1, E2, …). */
function page(count: number, overrides: Partial<CompaniesPage> = {}): CompaniesPage {
  return {
    hits: count,
    page: 1,
    pageSize: 20,
    items: Array.from({ length: count }, (_, i) => company(`E${i + 1}`)),
    facets: { cities: [], activities: [] },
    syncedAt: "2026-11-02T09:00:00.000Z",
    ...overrides,
  };
}

describe("companiesCounter", () => {
  it("shows the total, the source and the sync date", () => {
    const counter = companiesCounter({ hits: 1234, syncedAt: "2026-11-02T09:00:00.000Z" });
    expect(counter.value.replace(/\s/g, " ")).toBe("1 234");
    expect(counter.caption).toBe("Source : INSEE / Sirene · mis à jour le 2 novembre 2026");
  });

  it("shows the source without date when the sync date is missing", () => {
    const counter = companiesCounter({ hits: 5, syncedAt: null });
    expect(counter.value).toBe("5");
    expect(counter.caption).toBe("Source : INSEE / Sirene");
  });

  it("shows the source without date when the sync date is invalid", () => {
    const counter = companiesCounter({ hits: 5, syncedAt: "pas une date" });
    expect(counter.value).toBe("5");
    expect(counter.caption).toBe("Source : INSEE / Sirene");
  });

  it("shows a dash, never 0, for an empty annuaire", () => {
    const counter = companiesCounter({ hits: 0, syncedAt: null });
    expect(counter.value).toBe("—");
    expect(counter.caption).toBeNull();
  });

  it("shows a dash without source line when the annuaire is unreadable", () => {
    const counter = companiesCounter(null);
    expect(counter.value).toBe("—");
    expect(counter.caption).toBeNull();
  });
});

describe("homeCounters", () => {
  it("lists companies, technologies and events; the last two are a dash and soon", () => {
    const counters = homeCounters(null);
    expect(counters.map((c) => c.key)).toEqual(["companies", "technologies", "events"]);
    for (const counter of counters.slice(1)) {
      expect(counter.value).toBe("—");
      expect(counter.caption).toBe("Bientôt");
    }
  });

  it("never shows 0", () => {
    for (const summary of [null, { hits: 0, syncedAt: null }]) {
      expect(homeCounters(summary).map((c) => c.value)).not.toContain("0");
    }
  });

  it("shows a dash and never 0 on every counter when there is no data", () => {
    const summaries = [null, { hits: 0, syncedAt: null }, { hits: Number.NaN, syncedAt: null }];
    for (const summary of summaries) {
      for (const counter of homeCounters(summary)) {
        expect(counter.value).toBe("—");
        expect(counter.value).not.toBe("0");
      }
    }
  });
});

describe("formatSyncDate", () => {
  it("formats a date only, in French, Europe/Paris", () => {
    expect(formatSyncDate("2026-10-23T23:30:00.000Z")).toBe("24 octobre 2026");
  });
});

describe("sirenSourceLine", () => {
  it("cites the source and the update date", () => {
    expect(sirenSourceLine("2026-11-02T09:00:00.000Z")).toBe(
      "Source : INSEE / Sirene · mis à jour le 2 novembre 2026",
    );
  });

  it("cites the source alone without date", () => {
    expect(sirenSourceLine(null)).toBe("Source : INSEE / Sirene");
  });

  it("ignores an invalid date instead of printing « Invalid Date »", () => {
    expect(sirenSourceLine("pas une date")).toBe("Source : INSEE / Sirene");
  });
});

describe("companiesSummary", () => {
  it("keeps only hits and syncedAt", () => {
    expect(companiesSummary(page(3, { hits: 120 }))).toEqual({
      hits: 120,
      syncedAt: "2026-11-02T09:00:00.000Z",
    });
  });

  it("returns null when the API failed", () => {
    expect(companiesSummary(null)).toBeNull();
  });

  it("feeds the counter: a dash, never 0, when there is no data", () => {
    expect(companiesCounter(companiesSummary(null)).value).toBe("—");
    const empty = companiesCounter(companiesSummary(page(0, { hits: 0, syncedAt: null })));
    expect(empty.value).toBe("—");
    expect(empty.value).not.toBe("0");
  });
});

describe("directoryPreview", () => {
  it("shows the first companies in API order", () => {
    const preview = directoryPreview(page(10));
    expect(DIRECTORY_PREVIEW_COUNT).toBe(4);
    expect(preview?.companies.map((c) => c.name)).toEqual(["E1", "E2", "E3", "E4"]);
  });

  it("is stable: same page, same preview", () => {
    const input = page(10);
    expect(directoryPreview(input)).toEqual(directoryPreview(input));
  });

  it("does not mutate the page items", () => {
    const input = page(10);
    directoryPreview(input);
    expect(input.items).toHaveLength(10);
  });

  it("is hidden (null) when the API failed", () => {
    expect(directoryPreview(null)).toBeNull();
  });

  it("is hidden (null) when there is no item", () => {
    expect(directoryPreview(page(0))).toBeNull();
  });

  it("shows fewer than 4 companies when the API returns fewer", () => {
    expect(directoryPreview(page(2))?.companies.map((c) => c.name)).toEqual(["E1", "E2"]);
  });

  it("carries the source line with the update date", () => {
    expect(directoryPreview(page(4))?.sourceLine).toBe(
      "Source : INSEE / Sirene · mis à jour le 2 novembre 2026",
    );
  });

  it("carries the source line without date when syncedAt is null", () => {
    expect(directoryPreview(page(4, { syncedAt: null }))?.sourceLine).toBe("Source : INSEE / Sirene");
  });
});

describe("secondaryAction", () => {
  it("offers sign-in with next=/ when signed out", () => {
    expect(secondaryAction({ status: "signedOut" })).toEqual({
      label: SIGN_IN_LABEL,
      href: "/login?next=%2F",
    });
  });

  it("offers the pistes when signed in", () => {
    expect(secondaryAction({ status: "signedIn", email: "a@b.fr" })).toEqual(PISTES_ACTION);
  });

  it("offers nothing while loading, so a signed-in visitor never sees sign-in", () => {
    expect(secondaryAction({ status: "loading" })).toBeNull();
  });
});

describe("page copy", () => {
  it("covers every exported text", () => {
    expect(exportedTexts.length).toBeGreaterThan(30);
    expect(exportedTexts).toContain(HOME_FEATURES[0].ctaLabel);
    expect(exportedTexts).toContain(home.COUNTERS_LABEL);
    expect(exportedTexts).toContain(home.FEATURE_SOON_BADGE);
  });

  it("never says job, and offre only where it is denied", () => {
    for (const text of copy) expect(text).not.toMatch(/job/i);
    // « offre » n'est permis que dans « n'est pas une offre » et « offre d'emploi » (question de la FAQ).
    const allowed = /n['’]est pas une offre|offre d['’]emploi/gi;
    for (const text of copy) expect(text.replace(allowed, "")).not.toMatch(/offre/i);
  });

  it("keeps « offre d'emploi » to the FAQ question, never in the features", () => {
    const withOffer = copy.filter((text) => /offre d['’]emploi/i.test(text));
    expect(new Set(withOffer)).toEqual(new Set([home.HOME_FAQ[0].question]));
    for (const feature of HOME_FEATURES) {
      expect(`${feature.title} ${feature.description}`).not.toMatch(/offre/i);
    }
  });

  it("avoids published-announcement wording", () => {
    for (const text of copy) expect(text).not.toMatch(/annonce publi/i);
  });

  it("contains no hard-coded figure (source URLs excepted)", () => {
    for (const text of copyWithoutUrls) expect(text).not.toMatch(/\d/);
  });

  it("has 5 features and 3 steps", () => {
    expect(HOME_FEATURES.map((f) => f.key)).toEqual(["directory", "pistes", "agenda", "radar", "crm"]);
    expect(HOME_STEPS).toHaveLength(3);
  });

  it("describes agenda, radar and CRM as planned, in the future tense, without link", () => {
    expect(CTA_TEXT).toMatch(/bientôt/);
    expect(FEATURES_SUBTITLE).toMatch(/bientôt/);
    const soon = HOME_FEATURES.filter((f) => f.status === "soon");
    expect(soon.map((f) => f.key)).toEqual(["agenda", "radar", "crm"]);
    for (const feature of soon) {
      expect(feature.href).toBeUndefined();
      expect(feature.ctaLabel).toBeUndefined();
      expect(feature.description).toMatch(/seront|signalera|suivra/);
    }
  });

  it("links only the available features, to /explorer and /pistes", () => {
    for (const feature of HOME_FEATURES) {
      expect(feature.status === "available").toBe(feature.href !== undefined);
      expect(feature.status === "available").toBe(feature.ctaLabel !== undefined);
    }
    const hrefs = Object.fromEntries(HOME_FEATURES.map((f) => [f.key, f.href]));
    expect(hrefs).toEqual({
      directory: "/explorer",
      pistes: "/pistes",
      agenda: undefined,
      radar: undefined,
      crm: undefined,
    });
    expect(PRIMARY_ACTION.href).toBe("/explorer");
    expect(PISTES_ACTION.href).toBe("/pistes");
  });
});

describe("FAQ", () => {
  it("has exactly 4 questions, each with a question mark and a non-empty answer", () => {
    expect(home.HOME_FAQ).toHaveLength(4);
    for (const item of home.HOME_FAQ) {
      expect(item.question).toMatch(/\?$/);
      expect(item.answer.trim()).not.toBe("");
    }
  });

  it("answers « offre d'emploi » with a no", () => {
    expect(home.HOME_FAQ[0].question).toMatch(/offre d['’]emploi/i);
    expect(home.HOME_FAQ[0].answer).toMatch(/^Non/);
  });
});

describe("sources", () => {
  it("lists INSEE and La Bonne Boîte, with a description and an https link", () => {
    expect(home.HOME_SOURCES.map((s) => s.label)).toEqual([
      "INSEE / Sirene",
      "France Travail / La Bonne Boîte",
    ]);
    for (const source of home.HOME_SOURCES) {
      expect(source.description.trim()).not.toBe("");
      expect(source.href).toMatch(/^https:\/\//);
    }
  });

  it("cites the Etalab license", () => {
    expect(home.SOURCES_LICENSE).toMatch(/Etalab/);
  });

  it("states that Sonar is not an official service", () => {
    expect(home.SOURCES_UNOFFICIAL).toMatch(/n['’]est pas un service officiel/);
  });

  it("is plain text: no markup or link syntax in the texts", () => {
    const texts = [
      home.SOURCES_TITLE,
      home.SOURCES_INTRO,
      home.SOURCES_LICENSE,
      home.SOURCES_UNOFFICIAL,
      ...home.HOME_SOURCES.flatMap((s) => [s.label, s.description]),
    ];
    for (const text of texts) expect(text).not.toMatch(/<|>|\]\(|https?:/);
  });
});

describe("piste mockup", () => {
  it("contains no figure, so it cannot pass for a real score", () => {
    for (const text of collectTexts(home.PISTE_MOCKUP)) expect(text).not.toMatch(/\d/);
  });

  it("attributes the potential to La Bonne Boîte", () => {
    expect(home.PISTE_MOCKUP.gaugeLabel).toMatch(/La Bonne Boîte/);
  });

  it("is labelled as an example and recalls that a piste is not an offre", () => {
    expect(home.PISTE_MOCKUP.badge).toBe("Exemple");
    expect(home.PISTE_MOCKUP.reminder).toMatch(/n['’]est pas une offre/);
    expect(home.PISTE_SUBTITLE).toMatch(/n['’]est pas une offre/);
  });
});

describe("about text", () => {
  it("is a single sentence", () => {
    expect(home.ABOUT_TEXT.match(/[.!?]/g)).toHaveLength(1);
    expect(home.ABOUT_TEXT.endsWith(".")).toBe(true);
  });

  it("mentions neither github nor a name", () => {
    expect(home.ABOUT_TEXT).not.toMatch(/github/i);
    expect(home.ABOUT_TEXT).not.toMatch(/maxime|maguet/i);
  });
});
