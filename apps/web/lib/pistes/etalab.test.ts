import { describe, expect, it } from "vitest";
import { formatFetchedAt } from "./etalab";

describe("formatFetchedAt", () => {
  it("formats a retrieval instant in French, Europe/Paris", () => {
    expect(formatFetchedAt("2026-10-23T08:30:00.000Z")).toBe(
      "23 octobre 2026 à 10:30",
    );
  });
});
