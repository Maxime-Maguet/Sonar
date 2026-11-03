import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildClearSessionHintCookie,
  clearSessionHint,
  hasSessionHint,
  readSessionHint,
  SESSION_HINT_COOKIE,
} from "./hint";

describe("hasSessionHint", () => {
  it("chaîne vide : pas d'indice", () => {
    expect(hasSessionHint("")).toBe(false);
  });

  it("indice seul", () => {
    expect(hasSessionHint(`${SESSION_HINT_COOKIE}=1`)).toBe(true);
  });

  it("autre cookie : pas d'indice", () => {
    expect(hasSessionHint("theme=dark")).toBe(false);
  });

  it("plusieurs cookies : trouve l'indice où qu'il soit", () => {
    expect(hasSessionHint("a=1; sonar_session_hint=1; b=2")).toBe(true);
    expect(hasSessionHint("sonar_session_hint=1; b=2")).toBe(true);
    expect(hasSessionHint("a=1; sonar_session_hint=1")).toBe(true);
  });

  it("nom similaire (préfixe ou suffixe) : faux positif exclu", () => {
    expect(hasSessionHint("xsonar_session_hint=1")).toBe(false);
    expect(hasSessionHint("sonar_session_hint_x=1")).toBe(false);
    expect(hasSessionHint("a=1; xsonar_session_hint=1")).toBe(false);
  });

  it("valeur différente de 1 : pas d'indice", () => {
    expect(hasSessionHint("sonar_session_hint=0")).toBe(false);
    expect(hasSessionHint("sonar_session_hint=")).toBe(false);
    expect(hasSessionHint("sonar_session_hint=11")).toBe(false);
  });

  it("un autre cookie dont la valeur contient l'indice : pas d'indice", () => {
    expect(hasSessionHint("a=sonar_session_hint=1")).toBe(false);
  });

  it("fragment sans « = » ignoré", () => {
    expect(hasSessionHint("garbage; sonar_session_hint=1")).toBe(true);
  });
});

describe("buildClearSessionHintCookie", () => {
  it("sans Secure", () => {
    expect(buildClearSessionHintCookie(false)).toBe(
      "sonar_session_hint=; Path=/; Max-Age=0; SameSite=Lax",
    );
  });

  it("avec Secure", () => {
    expect(buildClearSessionHintCookie(true)).toBe(
      "sonar_session_hint=; Path=/; Max-Age=0; SameSite=Lax; Secure",
    );
  });
});

describe("accès navigateur hors navigateur (env node)", () => {
  it("lecture : faux, effacement : sans effet ni erreur", () => {
    expect(readSessionHint()).toBe(false);
    expect(() => clearSessionHint()).not.toThrow();
  });
});

describe("accès navigateur simulé", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("readSessionHint lit document.cookie", () => {
    vi.stubGlobal("document", { cookie: "a=1; sonar_session_hint=1" });
    expect(readSessionHint()).toBe(true);
    vi.stubGlobal("document", { cookie: "a=1" });
    expect(readSessionHint()).toBe(false);
  });

  it("clearSessionHint ajoute Secure en https", () => {
    const doc = { cookie: "" };
    vi.stubGlobal("document", doc);
    vi.stubGlobal("location", { protocol: "https:" });
    clearSessionHint();
    expect(doc.cookie).toBe(buildClearSessionHintCookie(true));
  });

  it("clearSessionHint n'ajoute pas Secure en http", () => {
    const doc = { cookie: "" };
    vi.stubGlobal("document", doc);
    vi.stubGlobal("location", { protocol: "http:" });
    clearSessionHint();
    expect(doc.cookie).toBe(buildClearSessionHintCookie(false));
  });
});
