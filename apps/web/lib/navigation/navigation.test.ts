import { describe, expect, it } from "vitest";
import { destinationAfterAuth } from "@/lib/auth/safe-next";
import { activeEntryHref, NAV_ENTRIES, signInHref } from "./navigation";

describe("NAV_ENTRIES", () => {
  it("lists the five entries in order", () => {
    expect(NAV_ENTRIES.map((entry) => entry.label)).toEqual([
      "Explorer",
      "Pistes",
      "Événements",
      "Radar",
      "CRM",
    ]);
  });

  it("flags only Explorer and Pistes as existing", () => {
    expect(
      NAV_ENTRIES.map((entry) => [entry.label, entry.exists]),
    ).toEqual([
      ["Explorer", true],
      ["Pistes", true],
      ["Événements", false],
      ["Radar", false],
      ["CRM", false],
    ]);
  });
});

describe("activeEntryHref", () => {
  it("marks nothing on the home", () => {
    expect(activeEntryHref("/")).toBeNull();
  });

  it("marks the entry of the exact address", () => {
    expect(activeEntryHref("/explorer")).toBe("/explorer");
    expect(activeEntryHref("/pistes")).toBe("/pistes");
  });

  it("marks the entry for an address below it", () => {
    expect(activeEntryHref("/explorer/42")).toBe("/explorer");
  });

  it("does not match a mere string prefix", () => {
    expect(activeEntryHref("/explorerx")).toBeNull();
  });

  it("never marks an entry that does not exist yet", () => {
    expect(activeEntryHref("/crm")).toBeNull();
    expect(activeEntryHref("/radar")).toBeNull();
  });
});

describe("signInHref", () => {
  it("carries path and query as next", () => {
    const href = signInHref("/explorer", "city=TOULOUSE&page=2");
    expect(href).toBe(
      `/login?${new URLSearchParams({ next: "/explorer?city=TOULOUSE&page=2" })}`,
    );
    const next = new URL(href, "http://x").searchParams.get("next");
    expect(destinationAfterAuth(next)).toBe("/explorer?city=TOULOUSE&page=2");
  });

  it("carries the path alone when there is no query", () => {
    const next = new URL(signInHref("/", ""), "http://x").searchParams.get(
      "next",
    );
    expect(next).toBe("/");
  });

  it("falls back to Pistes after sign-in for an unsafe or absolute next", () => {
    expect(destinationAfterAuth("https://evil.example")).toBe("/pistes");
    expect(destinationAfterAuth("//evil.example")).toBe("/pistes");
  });
});
