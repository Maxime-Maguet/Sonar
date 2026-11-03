import type { AuthUser } from "@sonar/api-contract";
import { ApiError } from "@/lib/api/errors";

/** État de session partagé avec le menu. */
export type SessionState =
  | { status: "loading" }
  | { status: "signedIn"; email: string }
  | { status: "signedOut" };

/**
 * Issue de l'appel « qui suis-je » : soit l'utilisateur, soit un échec.
 * `status` vaut 0 pour une panne réseau, sinon le code HTTP (401, 5xx…).
 */
export type MeOutcome =
  | { ok: true; user: AuthUser }
  | { ok: false; status: number };

export const SESSION_LOADING: SessionState = { status: "loading" };
export const SESSION_SIGNED_OUT: SessionState = { status: "signedOut" };

/**
 * Convertit l'issue de « qui suis-je » en état du menu.
 * Tout échec (401, réseau, 5xx) vaut « déconnecté » : « Connexion » reste accessible.
 */
export function sessionFromOutcome(outcome: MeOutcome): SessionState {
  if (outcome.ok) return { status: "signedIn", email: outcome.user.email };
  return SESSION_SIGNED_OUT;
}

/** Convertit une erreur d'« qui suis-je » en issue : code HTTP d'une ApiError, sinon 0. */
export function outcomeFromError(error: unknown): MeOutcome {
  return { ok: false, status: error instanceof ApiError ? error.status : 0 };
}

/**
 * Après un échec de déconnexion : seule une 401 (session déjà terminée) vide l'état.
 * Réseau, 5xx ou autre : on reste connecté et le visiteur peut réessayer.
 */
export function shouldClearSessionAfterLogoutError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Un 401 reçu par n'importe quel appel navigateur met fin à la session côté menu. */
export function sessionAfterUnauthorized(): SessionState {
  return SESSION_SIGNED_OUT;
}
