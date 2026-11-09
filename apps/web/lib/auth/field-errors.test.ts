import { describe, expect, it } from "vitest";
import {
  FIELD_ERROR_MESSAGES,
  validateAuthFields,
  validateField,
} from "./field-errors";

describe("validateField - email", () => {
  it("refuse un email vide", () => {
    expect(validateField("login", "email", "")).toBe(
      FIELD_ERROR_MESSAGES.emailEmpty,
    );
  });

  it("traite un email d'espaces seuls comme vide", () => {
    expect(validateField("register", "email", "   ")).toBe(
      FIELD_ERROR_MESSAGES.emailEmpty,
    );
  });

  it("refuse un email invalide", () => {
    for (const value of ["abc", "a@b", "a@@b.fr", "a b@c.fr"]) {
      expect(validateField("login", "email", value)).toBe(
        FIELD_ERROR_MESSAGES.emailInvalid,
      );
    }
  });

  it("accepte un email avec des espaces autour", () => {
    expect(validateField("login", "email", "  nom@domaine.fr  ")).toBeUndefined();
  });
});

describe("validateField - mot de passe", () => {
  it("refuse un mot de passe vide", () => {
    expect(validateField("login", "password", "")).toBe(
      FIELD_ERROR_MESSAGES.passwordEmpty,
    );
  });

  it("traite un mot de passe d'espaces seuls comme vide", () => {
    expect(validateField("login", "password", "        ")).toBe(
      FIELD_ERROR_MESSAGES.passwordEmpty,
    );
    expect(validateField("register", "password", "        ")).toBe(
      FIELD_ERROR_MESSAGES.passwordEmpty,
    );
  });

  it("impose 8 caractères minimum en inscription", () => {
    expect(validateField("register", "password", "1234567")).toBe(
      FIELD_ERROR_MESSAGES.passwordTooShort,
    );
  });

  it("n'impose pas de minimum en connexion", () => {
    expect(validateField("login", "password", "x")).toBeUndefined();
  });

  it("accepte un mot de passe de 8 caractères en inscription", () => {
    expect(validateField("register", "password", "12345678")).toBeUndefined();
  });
});

describe("validateAuthFields", () => {
  it("renvoie un objet vide quand tout est valide", () => {
    expect(
      validateAuthFields("register", {
        email: "nom@domaine.fr",
        password: "12345678",
      }),
    ).toEqual({});
  });

  it("renvoie les deux erreurs quand les deux champs sont invalides", () => {
    expect(
      validateAuthFields("register", { email: "abc", password: "123" }),
    ).toEqual({
      email: FIELD_ERROR_MESSAGES.emailInvalid,
      password: FIELD_ERROR_MESSAGES.passwordTooShort,
    });
  });

  it("ne renvoie que le champ en erreur", () => {
    expect(
      validateAuthFields("login", { email: "", password: "x" }),
    ).toEqual({ email: FIELD_ERROR_MESSAGES.emailEmpty });
  });
});
