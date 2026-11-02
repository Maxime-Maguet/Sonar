import { ApiError } from "@/lib/api/errors";

export type AuthMode = "login" | "register";

export const AUTH_FAILURE_MESSAGES = {
  loginRefused: "Email ou mot de passe incorrect.",
  loginOther: "Impossible de se connecter. Réessayez.",
  registerConflict: "Un compte existe déjà avec cet email.",
  registerInvalid:
    "Email invalide, ou mot de passe de moins de 8 caractères.",
  registerOther: "Impossible de créer le compte. Réessayez.",
  apiDown: "L'API Sonar est injoignable. Réessayez.",
} as const;

/** Choisit la phrase d'échec : absence de réponse HTTP ≠ refus ≠ autre statut. */
export function authFailureSentence(mode: AuthMode, error: unknown): string {
  if (error instanceof ApiError && error.isNetworkError) {
    return AUTH_FAILURE_MESSAGES.apiDown;
  }
  if (mode === "login") {
    if (error instanceof ApiError && error.status === 401) {
      return AUTH_FAILURE_MESSAGES.loginRefused;
    }
    return AUTH_FAILURE_MESSAGES.loginOther;
  }
  if (error instanceof ApiError && error.status === 409) {
    return AUTH_FAILURE_MESSAGES.registerConflict;
  }
  if (error instanceof ApiError && error.status === 400) {
    return AUTH_FAILURE_MESSAGES.registerInvalid;
  }
  return AUTH_FAILURE_MESSAGES.registerOther;
}
