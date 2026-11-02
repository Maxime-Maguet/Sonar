import { describe, expect, it } from "vitest";
import {
  canonicalizeExplorerQuery,
  CITY_MAX_LENGTH,
  explorerPath,
  lastPage,
  needsRedirect,
  PAGE_MAX,
  readExplorerQuery,
  type ExplorerFacets,
} from "./query";

const facets: ExplorerFacets = {
  cities: ["Toulouse", "Saint-Orens-de-Gameville", "L'Union"],
  activities: [{ code: "62.01Z" }, { code: "47.11B" }],
};

describe("readExplorerQuery", () => {
  it("defaults to page 1 with no filters", () => {
    expect(readExplorerQuery({})).toEqual({ page: 1 });
  });

  it.each(["abc", "0", "-1", "1.5", "", " 2"])(
    "falls back to page 1 for invalid page %j",
    (page) => {
      expect(readExplorerQuery({ page }).page).toBe(1);
    },
  );

  it("treats an array page as absent", () => {
    expect(readExplorerQuery({ page: ["2", "3"] }).page).toBe(1);
  });

  it("reads a valid page and caps it at PAGE_MAX", () => {
    expect(readExplorerQuery({ page: "3" }).page).toBe(3);
    expect(readExplorerQuery({ page: "99999999" }).page).toBe(PAGE_MAX);
  });

  it("drops a malformed activityCode", () => {
    for (const activityCode of ["6201Z", "62.01z", "62.01", "abc", "62.01ZZ"]) {
      expect(readExplorerQuery({ activityCode }).activityCode).toBeUndefined();
    }
    expect(readExplorerQuery({ activityCode: ["62.01Z"] }).activityCode)
      .toBeUndefined();
  });

  it("keeps a well-formed activityCode", () => {
    expect(readExplorerQuery({ activityCode: "62.01Z" }).activityCode).toBe(
      "62.01Z",
    );
  });

  it("drops an empty, blank, overlong or array city", () => {
    expect(readExplorerQuery({ city: "" }).city).toBeUndefined();
    expect(readExplorerQuery({ city: "   " }).city).toBeUndefined();
    expect(
      readExplorerQuery({ city: "a".repeat(CITY_MAX_LENGTH + 1) }).city,
    ).toBeUndefined();
    expect(readExplorerQuery({ city: ["Toulouse"] }).city).toBeUndefined();
  });

  it("keeps a city at the max length and trims it", () => {
    const max = "a".repeat(CITY_MAX_LENGTH);
    expect(readExplorerQuery({ city: max }).city).toBe(max);
    expect(readExplorerQuery({ city: "  Toulouse " }).city).toBe("Toulouse");
  });

  it("combines city, activity and page", () => {
    expect(
      readExplorerQuery({ city: "Toulouse", activityCode: "62.01Z", page: "2" }),
    ).toEqual({ city: "Toulouse", activityCode: "62.01Z", page: 2 });
  });
});

describe("lastPage", () => {
  it("rounds up and never goes below 1", () => {
    expect(lastPage(0, 20)).toBe(1);
    expect(lastPage(1, 20)).toBe(1);
    expect(lastPage(20, 20)).toBe(1);
    expect(lastPage(21, 20)).toBe(2);
    expect(lastPage(100, 20)).toBe(5);
  });

  it("is safe with invalid inputs", () => {
    expect(lastPage(10, 0)).toBe(1);
    expect(lastPage(Number.NaN, 20)).toBe(1);
    expect(lastPage(-5, 20)).toBe(1);
  });
});

describe("canonicalizeExplorerQuery", () => {
  it("keeps a valid query untouched", () => {
    expect(
      canonicalizeExplorerQuery(
        { city: "Toulouse", activityCode: "62.01Z", page: 2 },
        facets,
        50,
        20,
      ),
    ).toEqual({ city: "Toulouse", activityCode: "62.01Z", page: 2 });
  });

  it("drops an unknown city and an unknown activity", () => {
    const result = canonicalizeExplorerQuery(
      { city: "Atlantis", activityCode: "99.99Z", page: 1 },
      facets,
      10,
      20,
    );
    expect(result).toEqual({ page: 1 });
    expect("city" in result).toBe(false);
    expect("activityCode" in result).toBe(false);
  });

  it("drops only the unknown filter when the other is valid", () => {
    expect(
      canonicalizeExplorerQuery(
        { city: "Atlantis", activityCode: "47.11B", page: 1 },
        facets,
        10,
        20,
      ),
    ).toEqual({ activityCode: "47.11B", page: 1 });
  });

  it("clamps a page beyond the last one to the last page", () => {
    expect(canonicalizeExplorerQuery({ page: 9 }, facets, 45, 20).page).toBe(3);
  });

  it("returns page 1 when there are no results", () => {
    expect(canonicalizeExplorerQuery({ page: 4 }, facets, 0, 20).page).toBe(1);
  });

  it("repairs a non-integer or non-positive page to 1", () => {
    expect(canonicalizeExplorerQuery({ page: 1.5 }, facets, 100, 20).page).toBe(1);
    expect(canonicalizeExplorerQuery({ page: 0 }, facets, 100, 20).page).toBe(1);
    expect(canonicalizeExplorerQuery({ page: -2 }, facets, 100, 20).page).toBe(1);
  });
});

describe("explorerPath", () => {
  it("is /explorer with no filters and page 1", () => {
    expect(explorerPath({ page: 1 })).toBe("/explorer");
  });

  it("omits page 1 and empty values", () => {
    expect(explorerPath({ city: "", activityCode: "", page: 1 })).toBe(
      "/explorer",
    );
    expect(explorerPath({ activityCode: "62.01Z", page: 1 })).toBe(
      "/explorer?activityCode=62.01Z",
    );
  });

  it("includes page when above 1 and combines filters", () => {
    expect(
      explorerPath({ city: "Toulouse", activityCode: "62.01Z", page: 3 }),
    ).toBe("/explorer?city=Toulouse&activityCode=62.01Z&page=3");
  });

  it("encodes spaces, accents and apostrophes, round-tripping through read", () => {
    for (const city of ["Saint-Orens-de-Gameville", "L'Union", "Évry Courcouronnes"]) {
      const path = explorerPath({ city, page: 1 });
      expect(path).not.toMatch(/[ é']/);
      const params = new URLSearchParams(path.split("?")[1]);
      expect(params.get("city")).toBe(city);
      expect(readExplorerQuery({ city: params.get("city") ?? undefined }).city)
        .toBe(city);
    }
  });
});

describe("needsRedirect", () => {
  it("is false when the URL is already canonical", () => {
    expect(needsRedirect({}, { page: 1 })).toBe(false);
    expect(
      needsRedirect(
        { city: "Toulouse", activityCode: "62.01Z", page: "2" },
        { city: "Toulouse", activityCode: "62.01Z", page: 2 },
      ),
    ).toBe(false);
  });

  it("is true for an explicit page=1", () => {
    expect(needsRedirect({ page: "1" }, { page: 1 })).toBe(true);
  });

  it("is true for an invalid or array page", () => {
    expect(needsRedirect({ page: "abc" }, { page: 1 })).toBe(true);
    expect(needsRedirect({ page: ["2"] }, { page: 2 })).toBe(true);
  });

  it("is true when a filter was dropped or an unknown param value is present", () => {
    expect(needsRedirect({ city: "Atlantis" }, { page: 1 })).toBe(true);
    expect(needsRedirect({ activityCode: "bad" }, { page: 1 })).toBe(true);
  });

  it("is true when the page was clamped", () => {
    expect(needsRedirect({ page: "9" }, { page: 3 })).toBe(true);
  });

  it("is true when the raw city differs from the trimmed canonical one", () => {
    expect(needsRedirect({ city: " Toulouse " }, { city: "Toulouse", page: 1 }))
      .toBe(true);
  });
});
