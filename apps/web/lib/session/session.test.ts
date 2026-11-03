import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  outcomeFromError,
  SESSION_LOADING,
  sessionAfterUnauthorized,
  sessionFromOutcome,
  shouldClearSessionAfterLogoutError,
} from "./session";

describe("sessionFromOutcome", () => {
  it("l'état initial est « chargement »", () => {
    expect(SESSION_LOADING).toEqual({ status: "loading" });
  });

  it("200 : connecté avec l'email", () => {
    expect(
      sessionFromOutcome({ ok: true, user: { id: "1", email: "a@b.co" } }),
    ).toEqual({ status: "signedIn", email: "a@b.co" });
  });

  it("401 : déconnecté", () => {
    expect(sessionFromOutcome({ ok: false, status: 401 })).toEqual({
      status: "signedOut",
    });
  });

  it("panne réseau : déconnecté", () => {
    expect(sessionFromOutcome({ ok: false, status: 0 })).toEqual({
      status: "signedOut",
    });
  });

  it.each([500, 502, 503])("erreur serveur %i : déconnecté", (status) => {
    expect(sessionFromOutcome({ ok: false, status })).toEqual({
      status: "signedOut",
    });
  });
});

describe("outcomeFromError", () => {
  it("ApiError : reprend le code HTTP", () => {
    expect(outcomeFromError(new ApiError(503, "UNAVAILABLE"))).toEqual({
      ok: false,
      status: 503,
    });
  });

  it("autre erreur : status 0", () => {
    expect(outcomeFromError(new TypeError("fetch failed"))).toEqual({
      ok: false,
      status: 0,
    });
    expect(outcomeFromError("boom")).toEqual({ ok: false, status: 0 });
  });
});

describe("shouldClearSessionAfterLogoutError", () => {
  it("401 : vide la session", () => {
    expect(
      shouldClearSessionAfterLogoutError(new ApiError(401, "UNAUTHORIZED")),
    ).toBe(true);
  });

  it.each([0, 403, 500, 502])("ApiError %i : reste connecté", (status) => {
    expect(
      shouldClearSessionAfterLogoutError(new ApiError(status, "X")),
    ).toBe(false);
  });

  it("erreur non ApiError : reste connecté", () => {
    expect(shouldClearSessionAfterLogoutError(new TypeError("x"))).toBe(false);
    expect(shouldClearSessionAfterLogoutError(undefined)).toBe(false);
  });
});

describe("sessionAfterUnauthorized", () => {
  it("un 401 ultérieur fait passer de connecté à déconnecté", () => {
    const signedIn = sessionFromOutcome({
      ok: true,
      user: { id: "1", email: "a@b.co" },
    });
    expect(signedIn.status).toBe("signedIn");
    expect(sessionAfterUnauthorized()).toEqual({
      status: "signedOut",
    });
  });
});
