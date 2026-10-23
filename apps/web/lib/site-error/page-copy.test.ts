import { describe, expect, it } from "vitest";
import { siteErrorPage } from "./page-copy";

describe("siteErrorPage", () => {
  it("offers only a way home when the address does not exist", () => {
    expect(siteErrorPage("unknown-address")).toEqual({
      siteName: "Sonar",
      sentence: "Cette adresse n'existe pas sur Sonar.",
      actions: [{ label: "Accueil", kind: "home", href: "/" }],
    });
  });

  it("offers a retry and then a way home when rendering crashes", () => {
    expect(siteErrorPage("render-crash")).toEqual({
      siteName: "Sonar",
      sentence: "Cette page n'a pas pu s'afficher.",
      actions: [
        { label: "Réessayer", kind: "retry" },
        { label: "Accueil", kind: "home", href: "/" },
      ],
    });
  });

  it("uses the same words when the site frame crashes", () => {
    expect(siteErrorPage("frame-crash")).toEqual({
      siteName: "Sonar",
      sentence: "Cette page n'a pas pu s'afficher.",
      actions: [
        { label: "Réessayer", kind: "retry" },
        { label: "Accueil", kind: "home", href: "/" },
      ],
    });
  });

  it("does not mention an official source or a job offer", () => {
    const forbidden = [
      "INSEE",
      "Sirene",
      "France Travail",
      "La Bonne Boîte",
      "offre",
    ];
    const kinds = ["unknown-address", "render-crash", "frame-crash"] as const;

    for (const kind of kinds) {
      const page = siteErrorPage(kind);
      const text = [
        page.siteName,
        page.sentence,
        ...page.actions.map((action) => action.label),
      ].join(" ");

      for (const word of forbidden) {
        expect(text).not.toContain(word);
      }
    }
  });
});
