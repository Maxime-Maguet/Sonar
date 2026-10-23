import { ApiError } from "@/lib/api/errors";

export type PistesLoadFailure = "lbb" | "api-down" | "generic";

export const EMPTY_PISTES_MESSAGE = "Aucune piste pour ce métier.";

export const PISTES_LOAD_MESSAGES = {
  lbb: "La Bonne Boîte est indisponible. Cette page est en erreur ; le reste du site reste utilisable.",
  "api-down":
    "L'API Sonar est injoignable. Ce n'est pas une erreur de La Bonne Boîte.",
  generic: "Impossible de charger les pistes.",
} as const;

/** Classe une erreur de chargement : 502 LBB ≠ fetch raté ≠ liste vide. */
export function classifyPistesLoadError(error: unknown): PistesLoadFailure {
  if (error instanceof ApiError && error.isNetworkError) return "api-down";
  if (error instanceof ApiError && error.status === 502) return "lbb";
  return "generic";
}
