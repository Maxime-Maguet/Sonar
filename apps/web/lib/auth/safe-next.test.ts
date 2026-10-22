import { describe, expect, it } from "vitest";
import { destinationAfterAuth } from "./safe-next";

describe("destinationAfterAuth", () => {
  it("sends the user to the pistes when next is missing", () => {
    expect(destinationAfterAuth(null)).toBe("/pistes");
    expect(destinationAfterAuth("")).toBe("/pistes");
  });

  it("keeps a relative path, including the métier and the page", () => {
    expect(destinationAfterAuth("/pistes?rome=M1805&page=2")).toBe(
      "/pistes?rome=M1805&page=2",
    );
  });

  it("refuses an absolute URL", () => {
    expect(destinationAfterAuth("https://evil.example/steal")).toBe("/pistes");
    expect(destinationAfterAuth("http://evil.example")).toBe("/pistes");
  });

  it("refuses a protocol-relative URL", () => {
    expect(destinationAfterAuth("//evil.example")).toBe("/pistes");
  });

  it("refuses a backslash path browsers treat as another host", () => {
    expect(destinationAfterAuth("/\\evil.example")).toBe("/pistes");
  });
});
