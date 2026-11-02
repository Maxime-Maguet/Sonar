import { describe, expect, it } from "vitest";
import {
  decideExplorerState,
  EXPLORER_MESSAGES,
  formatTotal,
} from "./state";

describe("decideExplorerState", () => {
  it("is empty when nothing is filtered and there are no hits", () => {
    expect(decideExplorerState({ failed: false, hits: 0, filtered: false })).toBe(
      "empty",
    );
  });

  it("is no-match when filtered and there are no hits", () => {
    expect(decideExplorerState({ failed: false, hits: 0, filtered: true })).toBe(
      "no-match",
    );
  });

  it("is api-down when the call failed", () => {
    expect(decideExplorerState({ failed: true })).toBe("api-down");
  });

  it("is results when there are hits, filtered or not", () => {
    expect(decideExplorerState({ failed: false, hits: 3, filtered: false })).toBe(
      "results",
    );
    expect(decideExplorerState({ failed: false, hits: 3, filtered: true })).toBe(
      "results",
    );
  });

  it("yields three distinct states for the three non-result cases", () => {
    const states = new Set([
      decideExplorerState({ failed: false, hits: 0, filtered: false }),
      decideExplorerState({ failed: false, hits: 0, filtered: true }),
      decideExplorerState({ failed: true }),
    ]);
    expect(states.size).toBe(3);
  });
});

describe("EXPLORER_MESSAGES", () => {
  it("uses the exact empty-directory copy", () => {
    expect(EXPLORER_MESSAGES.empty).toBe("L'annuaire est vide pour l'instant.");
  });

  it("has pairwise different messages", () => {
    const values = Object.values(EXPLORER_MESSAGES);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("formatTotal", () => {
  it("pluralizes from 2", () => {
    expect(formatTotal(0)).toBe("0 entreprise");
    expect(formatTotal(1)).toBe("1 entreprise");
    expect(formatTotal(2)).toBe("2 entreprises");
  });
});
