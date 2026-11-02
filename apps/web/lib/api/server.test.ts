import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_CODE } from "./errors";
import { listCompanies } from "./server";

const page = { items: [], hits: 0, page: 1, pageSize: 20 };

function stubFetch(impl: () => Promise<unknown>) {
  const fn = vi.fn<(input: string, init?: RequestInit) => Promise<unknown>>(
    () => impl(),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test/";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listCompanies", () => {
  it("returns the parsed page and sends no credentials or cookie", async () => {
    const fetchMock = stubFetch(async () => jsonResponse(page));
    await expect(listCompanies({})).resolves.toEqual(page);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://api.test/companies");
    expect(init?.credentials).toBeUndefined();
    expect(init?.headers).toBeUndefined();
    expect(init?.cache).toBe("no-store");
  });

  it("builds the query string from params and encodes values", async () => {
    const fetchMock = stubFetch(async () => jsonResponse(page));
    await listCompanies({
      city: "L'Union",
      activityCode: "62.01Z",
      page: 2,
      pageSize: 10,
    });
    const url = new URL(fetchMock.mock.calls[0]?.[0] as string);
    expect(url.pathname).toBe("/companies");
    expect(url.searchParams.get("city")).toBe("L'Union");
    expect(url.searchParams.get("activityCode")).toBe("62.01Z");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("10");
  });

  it("omits absent params", async () => {
    const fetchMock = stubFetch(async () => jsonResponse(page));
    await listCompanies({ page: 3 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/companies?page=3");
  });

  it("throws a network ApiError when fetch rejects", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const error = await listCompanies({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).code).toBe(NETWORK_ERROR_CODE);
    expect((error as ApiError).isNetworkError).toBe(true);
  });

  it("throws ApiError HTTP_<status> on a non-ok response", async () => {
    stubFetch(async () => jsonResponse({ message: "boom" }, 502));
    const error = await listCompanies({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).code).toBe("HTTP_502");
  });

  it("throws INVALID_RESPONSE when the body is not JSON", async () => {
    stubFetch(async () => new Response("<html>", { status: 200 }));
    const error = await listCompanies({}).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("INVALID_RESPONSE");
  });
});
