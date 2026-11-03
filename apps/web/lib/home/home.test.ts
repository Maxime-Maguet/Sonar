import { describe, expect, it } from "vitest";
import {
  companiesCounter,
  formatSyncDate,
  HOME_BADGE,
  HOME_INTRO,
  HOME_PARAGRAPHS,
  HOME_TITLE,
  homeCounters,
  PISTES_ACTION,
  PRIMARY_ACTION,
  SIGN_IN_LABEL,
  secondaryAction,
} from "./home";

const copy = [HOME_BADGE, HOME_TITLE, HOME_INTRO, ...HOME_PARAGRAPHS];

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
  it("never says offre", () => {
    for (const text of [...copy, PRIMARY_ACTION.label, PISTES_ACTION.label]) {
      expect(text).not.toMatch(/offre/i);
    }
  });

  it("contains no hard-coded figure", () => {
    for (const text of copy) expect(text).not.toMatch(/\d/);
  });

  it("describes agenda, radar and CRM as planned", () => {
    expect(HOME_PARAGRAPHS.join(" ")).toMatch(/bientôt/);
  });
});
