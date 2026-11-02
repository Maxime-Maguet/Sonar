export type ExplorerState = "empty" | "no-match" | "results" | "api-down";

export const EXPLORER_MESSAGES = {
  empty: "L'annuaire est vide pour l'instant.",
  "no-match": "Aucune entreprise ne correspond à ces filtres.",
  "api-down": "L'API Sonar est injoignable. Réessayez dans un instant.",
} as const;

export type ExplorerStateInput =
  | { failed: true }
  | { failed: false; hits: number; filtered: boolean };

export function decideExplorerState(input: ExplorerStateInput): ExplorerState {
  if (input.failed) return "api-down";
  if (input.hits > 0) return "results";
  return input.filtered ? "no-match" : "empty";
}

export function formatTotal(hits: number): string {
  return `${hits} ${hits > 1 ? "entreprises" : "entreprise"}`;
}
