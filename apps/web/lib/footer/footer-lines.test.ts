import { describe, expect, it } from "vitest";
import { LBB_SOURCE_URL, INSEE_SOURCE_URL } from "../pistes/etalab";
import {
  commonFooterLines,
  legalFooterLinks,
  LEGAL_LINKS,
  pistesFooterLines,
} from "./footer-lines";

const FETCHED_AT = "2026-03-15T10:30:00.000Z";

function text(lines: ReturnType<typeof pistesFooterLines>): string {
  return lines.map((line) => line.map((s) => s.text).join("")).join("\n");
}

describe("commonFooterLines", () => {
  it("states once that Sonar is not an official service", () => {
    const joined = text(commonFooterLines());
    expect(joined).toBe("Sonar n'est pas un service officiel.");
  });

  it("is a single plain line without link and without « offre »", () => {
    const lines = commonFooterLines();
    expect(lines).toHaveLength(1);
    expect(lines.flat().some((s) => s.href)).toBe(false);
    expect(text(lines)).not.toMatch(/offre/i);
  });
});

describe("legalFooterLinks", () => {
  it("shows no legal link while no legal page exists", () => {
    expect(legalFooterLinks()).toEqual([]);
    expect(LEGAL_LINKS.every((link) => !link.exists)).toBe(true);
  });

  it("shows a link as soon as its page exists", () => {
    const links = LEGAL_LINKS.map((link) =>
      link.href === "/confidentialite" ? { ...link, exists: true } : link,
    );
    expect(legalFooterLinks(links)).toEqual([
      { label: "Confidentialité", href: "/confidentialite" },
    ]);
  });
});

describe("legalFooterLinks (all pages present)", () => {
  it("lists every link, in order, without the internal flag", () => {
    const all = LEGAL_LINKS.map((link) => ({ ...link, exists: true }));
    expect(legalFooterLinks(all)).toEqual([
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
    ]);
  });

  it("returns nothing for an empty list", () => {
    expect(legalFooterLinks([])).toEqual([]);
  });
});

describe("pistesFooterLines (content)", () => {
  it("names the sources and the Sirene directory line", () => {
    const joined = text(pistesFooterLines(FETCHED_AT));
    expect(joined).toContain("France Travail / La Bonne Boîte");
    expect(joined).toContain("Annuaire des entreprises : INSEE / Sirene.");
  });

  it("falls back when the date is an empty string", () => {
    expect(text(pistesFooterLines(""))).toContain(
      "date de récupération indisponible",
    );
  });
});

describe("pistesFooterLines", () => {
  it("links France Travail / La Bonne Boîte and the Sirene directory", () => {
    const hrefs = pistesFooterLines(FETCHED_AT)
      .flat()
      .flatMap((s) => (s.href ? [s.href] : []));
    expect(hrefs).toContain(LBB_SOURCE_URL);
    expect(hrefs).toContain(INSEE_SOURCE_URL);
  });

  it("shows the formatted retrieval date", () => {
    const joined = text(pistesFooterLines(FETCHED_AT));
    expect(joined).toContain("récupérées le");
    expect(joined).toMatch(/15 mars 2026/);
    expect(joined).not.toContain("indisponible");
  });

  it("falls back to « date de récupération indisponible »", () => {
    const joined = text(pistesFooterLines());
    expect(joined).toContain("date de récupération indisponible");
    expect(joined).not.toContain("récupérées le");
  });

  it("keeps the indicative notice and the common line out of the block", () => {
    const joined = text(pistesFooterLines(FETCHED_AT));
    expect(joined).toContain("Ces informations sont indicatives.");
    expect(joined).not.toContain("service officiel");
  });

  it("never speaks of job offers", () => {
    expect(text(pistesFooterLines(FETCHED_AT))).not.toMatch(/offre/i);
    expect(text(pistesFooterLines())).not.toMatch(/offre/i);
  });
});
