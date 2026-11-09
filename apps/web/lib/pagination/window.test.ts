import { describe, expect, it } from "vitest";
import { clampPage, pageWindow, totalPages, type PageItem } from "./window";

const p = (page: number): PageItem => ({ type: "page", page });
const gap: PageItem = { type: "ellipsis" };
const pages = (...numbers: number[]): PageItem[] => numbers.map(p);

describe("totalPages", () => {
  it("returns 1 when there is no hit", () => {
    expect(totalPages(0, 20)).toBe(1);
  });

  it("returns 1 for fewer hits than a page", () => {
    expect(totalPages(1, 20)).toBe(1);
  });

  it("does not add a page on an exact multiple", () => {
    expect(totalPages(40, 20)).toBe(2);
    expect(totalPages(20, 20)).toBe(1);
  });

  it("rounds up when the last page is partial", () => {
    expect(totalPages(41, 20)).toBe(3);
  });
});

describe("clampPage", () => {
  it("keeps a valid page", () => {
    expect(clampPage(3, 10)).toBe(3);
  });

  it.each([0, -5])("raises %j to 1", (value) => {
    expect(clampPage(value, 10)).toBe(1);
  });

  it("lowers a page above the total to the last page", () => {
    expect(clampPage(99, 10)).toBe(10);
  });

  it.each([NaN, Infinity, -Infinity])("falls back to 1 for %j", (value) => {
    expect(clampPage(value, 10)).toBe(1);
  });

  it("floors a decimal page", () => {
    expect(clampPage(2.7, 10)).toBe(2);
  });

  it.each([0, -3, NaN])("returns 1 when total is %j", (total) => {
    expect(clampPage(5, total)).toBe(1);
  });
});

describe("pageWindow", () => {
  it("shows a single page when there is only one", () => {
    expect(pageWindow(1, 1)).toEqual(pages(1));
  });

  it("shows every page without ellipsis when there are few", () => {
    for (const current of [1, 2, 3, 4]) {
      expect(pageWindow(current, 4)).toEqual(pages(1, 2, 3, 4));
    }
    expect(pageWindow(3, 5)).toEqual(pages(1, 2, 3, 4, 5));
  });

  it("collapses a gap of two pages into an ellipsis", () => {
    expect(pageWindow(1, 5)).toEqual([p(1), p(2), gap, p(5)]);
    expect(pageWindow(5, 5)).toEqual([p(1), gap, p(4), p(5)]);
  });

  it("puts an ellipsis at the end from the first page", () => {
    expect(pageWindow(1, 10)).toEqual([p(1), p(2), gap, p(10)]);
  });

  it("puts an ellipsis at the start on the last page", () => {
    expect(pageWindow(10, 10)).toEqual([p(1), gap, p(9), p(10)]);
  });

  it("puts ellipses on both sides in the middle", () => {
    expect(pageWindow(5, 10)).toEqual([p(1), gap, p(4), p(5), p(6), gap, p(10)]);
  });

  it("shows the page instead of an ellipsis hiding a single page", () => {
    expect(pageWindow(4, 10)).toEqual([p(1), p(2), p(3), p(4), p(5), gap, p(10)]);
    expect(pageWindow(7, 10)).toEqual([p(1), gap, p(6), p(7), p(8), p(9), p(10)]);
  });

  it("honours a custom siblings count", () => {
    expect(pageWindow(6, 12, 2)).toEqual([
      p(1),
      gap,
      p(4),
      p(5),
      p(6),
      p(7),
      p(8),
      gap,
      p(12),
    ]);
    expect(pageWindow(5, 10, 0)).toEqual([p(1), gap, p(5), gap, p(10)]);
  });

  it("clamps out-of-range current pages", () => {
    expect(pageWindow(0, 10)).toEqual(pageWindow(1, 10));
    expect(pageWindow(-4, 10)).toEqual(pageWindow(1, 10));
    expect(pageWindow(99, 10)).toEqual(pageWindow(10, 10));
    expect(pageWindow(NaN, 10)).toEqual(pageWindow(1, 10));
    expect(pageWindow(5.9, 10)).toEqual(pageWindow(5, 10));
  });

  it.each([0, -1, NaN])("returns only page 1 when total is %j", (total) => {
    expect(pageWindow(3, total)).toEqual(pages(1));
  });
});
