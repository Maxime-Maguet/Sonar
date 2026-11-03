/**
 * Indice de session : cookie non HttpOnly posé par l'API (valeur `1`).
 * Ce n'est PAS une preuve d'authentification, seulement une optimisation :
 * sans indice, on évite l'appel réseau « qui suis-je ».
 */
export const SESSION_HINT_COOKIE = "sonar_session_hint";

/** Vrai si l'en-tête `document.cookie` contient exactement `sonar_session_hint=1`. */
export function hasSessionHint(cookieHeader: string): boolean {
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (name === SESSION_HINT_COOKIE && value === "1") return true;
  }
  return false;
}

/** Chaîne à affecter à `document.cookie` pour effacer l'indice. */
export function buildClearSessionHintCookie(secure: boolean): string {
  const base = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  return secure ? `${base}; Secure` : base;
}

/** Lit l'indice dans le navigateur ; faux hors navigateur. */
export function readSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return hasSessionHint(document.cookie);
}

/** Efface l'indice dans le navigateur ; sans effet hors navigateur. */
export function clearSessionHint(): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = buildClearSessionHintCookie(secure);
}
