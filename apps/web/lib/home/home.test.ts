import { describe, expect, it } from "vitest";
import type { SessionState } from "@/lib/session/session";
import * as home from "./home";
import {
  companiesCounter,
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
});

describe("formatSyncDate", () => {
  it("formats a date only, in French, Europe/Paris", () => {
    expect(formatSyncDate("2026-10-23T23:30:00.000Z")).toBe("24 octobre 2026");
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

  it("never says offre or job in any text", () => {
    for (const text of copy) expect(text).not.toMatch(/offre|job/i);
  });

  it("avoids published-announcement wording", () => {
    for (const text of copy) expect(text).not.toMatch(/annonce publi/i);
  });

  it("contains no hard-coded figure", () => {
    for (const text of copy) expect(text).not.toMatch(/\d/);
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
