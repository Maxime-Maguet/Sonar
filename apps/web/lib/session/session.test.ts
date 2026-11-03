import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  outcomeFromError,
  SESSION_LOADING,
  initialSessionCheck,
  sessionFromOutcome,
  shouldClearHintAfterOutcome,
  shouldClearSessionAfterLogoutError,
} from "./session";

describe("initialSessionCheck", () => {
  it("sans indice : pas d'appel réseau", () => {
    expect(initialSessionCheck(false)).toBe("skip");
  });

  it("avec indice : on interroge l'API", () => {
    expect(initialSessionCheck(true)).toBe("fetch");
  });
});

describe("shouldClearHintAfterOutcome", () => {
  it("401 : efface l'indice", () => {
    expect(shouldClearHintAfterOutcome({ ok: false, status: 401 })).toBe(true);
  });

  it.each([0, 500, 502, 503])("%i : garde l'indice", (status) => {
    expect(shouldClearHintAfterOutcome({ ok: false, status })).toBe(false);
  });

  it("succès : garde l'indice", () => {
    expect(
      shouldClearHintAfterOutcome({
        ok: true,
        user: { id: "1", email: "a@b.co" },
      }),
    ).toBe(false);
  });
});

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
