import { describe, expect, it } from "vitest";
import { ApiError, NETWORK_ERROR_CODE } from "../api/errors";
import { authFailureSentence } from "./failure-copy";

const API_DOWN = "L'API Sonar est injoignable. Réessayez.";
const LOGIN_REFUSED = "Email ou mot de passe incorrect.";
const LOGIN_OTHER = "Impossible de se connecter. Réessayez.";
const REGISTER_CONFLICT = "Un compte existe déjà avec cet email.";
const REGISTER_INVALID =
  "Email invalide, ou mot de passe de moins de 8 caractères.";
const REGISTER_OTHER = "Impossible de créer le compte. Réessayez.";

describe("authFailureSentence - login", () => {
  it("says credentials are wrong on HTTP 401", () => {
    expect(authFailureSentence("login", new ApiError(401, "HTTP_401"))).toBe(
      LOGIN_REFUSED,
    );
  });

  it("says the API is unreachable on a network failure, not a 401 refusal", () => {
    const sentence = authFailureSentence(
      "login",
      new ApiError(0, NETWORK_ERROR_CODE),
    );
    expect(sentence).toBe(API_DOWN);
    expect(sentence).not.toBe(LOGIN_REFUSED);
  });

  it.each([500, 502])("uses the generic sentence on HTTP %i", (status) => {
    expect(
      authFailureSentence("login", new ApiError(status, `HTTP_${status}`)),
    ).toBe(LOGIN_OTHER);
  });

  it("uses the generic sentence for a non-ApiError value", () => {
    expect(authFailureSentence("login", new Error("boom"))).toBe(LOGIN_OTHER);
    expect(authFailureSentence("login", undefined)).toBe(LOGIN_OTHER);
  });
});

describe("authFailureSentence - register", () => {
  it("says the account already exists on HTTP 409", () => {
    expect(
      authFailureSentence("register", new ApiError(409, "HTTP_409")),
    ).toBe(REGISTER_CONFLICT);
  });

  it("says email or password is invalid on HTTP 400", () => {
    expect(
      authFailureSentence("register", new ApiError(400, "HTTP_400")),
    ).toBe(REGISTER_INVALID);
  });

  it("says the API is unreachable on a network failure", () => {
    expect(
      authFailureSentence("register", new ApiError(0, NETWORK_ERROR_CODE)),
    ).toBe(API_DOWN);
  });

  it("uses the generic sentence on another status", () => {
    expect(
      authFailureSentence("register", new ApiError(500, "HTTP_500")),
    ).toBe(REGISTER_OTHER);
  });

  it("uses the generic sentence for a non-ApiError value", () => {
    expect(authFailureSentence("register", new Error("boom"))).toBe(
      REGISTER_OTHER,
    );
    expect(authFailureSentence("register", "oops")).toBe(REGISTER_OTHER);
  });
});
