import type { AuthMode } from "@/lib/auth/failure-copy";

export const FIELD_ERROR_MESSAGES = {
  emailEmpty: "Saisissez votre adresse email.",
  emailInvalid: "Saisissez une adresse email valide, par exemple nom@domaine.fr.",
  passwordEmpty: "Saisissez votre mot de passe.",
  passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
} as const;

export type AuthField = "email" | "password";
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

// Contrôle volontairement indulgent (quelque chose@domaine.tld) :
// le serveur (class-validator IsEmail) reste l'arbitre.
const OBVIOUS_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Message d'erreur d'un champ, ou undefined s'il est valide. */
export function validateField(
  mode: AuthMode,
  field: AuthField,
  value: string,
): string | undefined {
  if (field === "email") {
    const email = value.trim();
    if (email === "") return FIELD_ERROR_MESSAGES.emailEmpty;
    if (!OBVIOUS_EMAIL.test(email)) return FIELD_ERROR_MESSAGES.emailInvalid;
    return undefined;
  }
  // Le mot de passe n'est jamais trimmé ; il faut au moins un caractère non blanc.
  if (!/\S/.test(value)) return FIELD_ERROR_MESSAGES.passwordEmpty;
  if (mode === "register" && value.length < 8) {
    return FIELD_ERROR_MESSAGES.passwordTooShort;
  }
  return undefined;
}

/** Erreurs de tous les champs ; objet vide si tout est valide. */
export function validateAuthFields(
  mode: AuthMode,
  values: { email: string; password: string },
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = validateField(mode, "email", values.email);
  const password = validateField(mode, "password", values.password);
  if (email) errors.email = email;
  if (password) errors.password = password;
  return errors;
}
