import { describe, expect, it } from "vitest";
import { INSEE_SOURCE_URL } from "../pistes/etalab";
import { ETALAB_LICENCE_URL, explorerFooterLines } from "./footer-sources";
import { EXPLORER_MESSAGES } from "./state";

const SYNCED_AT = "2026-03-15T10:30:00.000Z";

function flatten(syncedAt: string | null): string {
  return explorerFooterLines(syncedAt)
    .map((line) => line.map((s) => s.text).join(""))
    .join("\n");
}

function hrefs(syncedAt: string | null): string[] {
  return explorerFooterLines(syncedAt)
    .flat()
    .flatMap((s) => (s.href ? [s.href] : []));
}

describe("explorerFooterLines", () => {
  it("links the INSEE source and the open licence", () => {
    for (const date of [SYNCED_AT, null]) {
      expect(hrefs(date)).toContain(INSEE_SOURCE_URL);
      expect(hrefs(date)).toContain(ETALAB_LICENCE_URL);
    }
  });

  it("states that Sonar is not an official service", () => {
    expect(flatten(SYNCED_AT)).toContain("Sonar n'est pas un service officiel");
    expect(flatten(null)).toContain("Sonar n'est pas un service officiel");
  });

  it("falls back to an explicit message when syncedAt is null", () => {
    const text = flatten(null);
    expect(text).toContain("date de synchronisation indisponible");
    expect(text).not.toContain("synchronisées le");
  });

  it("shows a formatted date when syncedAt is set", () => {
    const text = flatten(SYNCED_AT);
    expect(text).toContain("synchronisées le");
    expect(text).toMatch(/15 mars 2026/);
    expect(text).not.toContain("indisponible");
    expect(text).not.toContain(SYNCED_AT);
  });
});

describe("copy guard", () => {
  const forbidden = [/offre/i, /bonne bo[iî]te/i];
  const texts: [string, string][] = [
    ...Object.entries(EXPLORER_MESSAGES),
    ["footer (date)", flatten(SYNCED_AT)],
    ["footer (null)", flatten(null)],
  ];

  it.each(texts)("%s mentions neither job offers nor La Bonne Boite", (_n, t) => {
    for (const pattern of forbidden) expect(t).not.toMatch(pattern);
  });
});
