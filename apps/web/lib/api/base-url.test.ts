import { describe, expect, it } from "vitest";
import {
  API_PROXY_PREFIX,
  buildApiRewrites,
  resolveBrowserBaseUrl,
  resolveServerBaseUrl,
} from "./base-url";

describe("resolveBrowserBaseUrl", () => {
  it("accepts a relative path", () => {
    expect(resolveBrowserBaseUrl("/api")).toBe("/api");
  });

  it.each(["http://localhost:3001", "https://api.example.com"])(
    "accepts an absolute URL (%s)",
    (url) => {
      expect(resolveBrowserBaseUrl(url)).toBe(url);
    },
  );

  it.each([
    ["/api/", "/api"],
    ["/api///", "/api"],
    ["http://localhost:3001///", "http://localhost:3001"],
    ["  /api  ", "/api"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(resolveBrowserBaseUrl(input)).toBe(expected);
  });

  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["whitespace", "   "],
    ["only slashes (after trim becomes empty)", "///"],
  ])("throws naming NEXT_PUBLIC_API_URL when %s", (_n, value) => {
    expect(() => resolveBrowserBaseUrl(value)).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it.each([
    "api",
    "localhost:3001",
    "ftp://host",
    "http://",
    "https:///path",
    "not a url",
  ])("throws on invalid value %j", (value) => {
    expect(() => resolveBrowserBaseUrl(value)).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});

describe("resolveServerBaseUrl", () => {
  it("uses API_DIRECT_URL when defined, even with a relative public URL", () => {
    expect(
      resolveServerBaseUrl({
        directUrl: "http://localhost:3001",
        publicUrl: "/api",
      }),
    ).toBe("http://localhost:3001");
  });

  it("gives API_DIRECT_URL priority over an absolute public URL", () => {
    expect(
      resolveServerBaseUrl({
        directUrl: "http://internal:3001/",
        publicUrl: "https://public.example.com",
      }),
    ).toBe("http://internal:3001");
  });

  it("falls back to an absolute public URL, without trailing slash", () => {
    expect(
      resolveServerBaseUrl({
        directUrl: undefined,
        publicUrl: "http://api.test///",
      }),
    ).toBe("http://api.test");
  });

  it.each([["empty", ""], ["whitespace", "  "]])(
    "ignores a %s direct URL and falls back to public",
    (_n, directUrl) => {
      expect(
        resolveServerBaseUrl({ directUrl, publicUrl: "http://api.test" }),
      ).toBe("http://api.test");
    },
  );

  it("throws naming both variables when public is relative and no direct URL", () => {
    expect(() =>
      resolveServerBaseUrl({ directUrl: undefined, publicUrl: "/api" }),
    ).toThrow(/API_DIRECT_URL.*NEXT_PUBLIC_API_URL/);
  });

  it("throws naming both variables when neither is defined", () => {
    let message = "";
    try {
      resolveServerBaseUrl({ directUrl: undefined, publicUrl: undefined });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("API_DIRECT_URL");
    expect(message).toContain("NEXT_PUBLIC_API_URL");
  });
});

describe("buildApiRewrites", () => {
  it("returns a single rewrite for the proxy prefix", () => {
    expect(API_PROXY_PREFIX).toBe("/api");
    expect(buildApiRewrites("http://localhost:3001")).toEqual([
      { source: "/api/:path*", destination: "http://localhost:3001/:path*" },
    ]);
  });

  it.each([["undefined", undefined], ["empty", ""], ["whitespace", "   "]])(
    "returns no rewrite when %s",
    (_n, value) => {
      expect(buildApiRewrites(value)).toEqual([]);
    },
  );

  it("strips trailing slashes from the destination", () => {
    const rewrites = buildApiRewrites("http://api.internal:3001///");
    expect(rewrites).toEqual([
      { source: "/api/:path*", destination: "http://api.internal:3001/:path*" },
    ]);
  });
});
