import { describe, expect, it } from "vitest";
import { ApiError, NETWORK_ERROR_CODE } from "../api/errors";
import {
  classifyPistesLoadError,
  EMPTY_PISTES_MESSAGE,
  PISTES_LOAD_MESSAGES,
} from "./load-error";

describe("classifyPistesLoadError", () => {
  it("treats HTTP 502 as a La Bonne Boîte error", () => {
    expect(classifyPistesLoadError(new ApiError(502, "HTTP_502"))).toBe("lbb");
  });

  it("treats a network failure as an API-down error, not La Bonne Boîte", () => {
    expect(
      classifyPistesLoadError(new ApiError(0, NETWORK_ERROR_CODE)),
    ).toBe("api-down");
  });

  it("keeps empty-list copy distinct from both error messages", () => {
    expect(EMPTY_PISTES_MESSAGE).not.toBe(PISTES_LOAD_MESSAGES.lbb);
    expect(EMPTY_PISTES_MESSAGE).not.toBe(PISTES_LOAD_MESSAGES["api-down"]);
    expect(PISTES_LOAD_MESSAGES.lbb).not.toBe(PISTES_LOAD_MESSAGES["api-down"]);
  });
});
