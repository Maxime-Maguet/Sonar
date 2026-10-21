import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listLeads, login, register } from "./client";
import { ApiError } from "./errors";

const BASE = "http://localhost:3001";
const creds = { email: "a@b.co", password: "secret123" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", BASE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function catchError(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected rejection");
}

describe("register / login", () => {
  it.each([
    ["register", register, "/auth/register"],
    ["login", login, "/auth/login"],
  ] as const)("%s POSTs JSON body with credentials include", async (_n, fn, path) => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "1", email: creds.email }, 201));

    const user = await fn(creds);

    expect(user).toEqual({ id: "1", email: creds.email });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}${path}`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify(creds));
  });

  it("returns undefined on 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(login(creds)).resolves.toBeUndefined();
  });

  it("strips trailing slashes from base URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", `${BASE}///`);
    fetchMock.mockResolvedValue(jsonResponse({ id: "1", email: "x" }));
    await login(creds);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/auth/login`);
  });
});

describe("listLeads", () => {
  const page = { hits: 0, page: 1, pageSize: 10, fetchedAt: "t", items: [] };

  it("GETs with credentials include, no Content-Type and no body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(page));

    await expect(listLeads({ rome: "M1805" })).resolves.toEqual(page);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/leads?rome=M1805`);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("builds the query string with page and pageSize", async () => {
    fetchMock.mockResolvedValue(jsonResponse(page));
    await listLeads({ rome: "M1805", page: 2, pageSize: 25 });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/leads");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      rome: "M1805",
      page: "2",
      pageSize: "25",
    });
  });

  it("encodes rome value", async () => {
    fetchMock.mockResolvedValue(jsonResponse(page));
    await listLeads({ rome: "a&b=c" });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("rome")).toBe("a&b=c");
    expect([...url.searchParams.keys()]).toEqual(["rome"]);
  });
});

describe("errors", () => {
  it("throws typed ApiError with status and body code, without keeping raw body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "EMAIL_TAKEN", message: "secret detail", stack: "x" }, 409),
    );

    const err = await catchError(register(creds));

    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.status).toBe(409);
    expect(apiErr.code).toBe("EMAIL_TAKEN");
    expect(apiErr.isNetworkError).toBe(false);
    expect(Object.keys(apiErr).sort()).toEqual(["code", "name", "status"]);
    expect(apiErr.message).not.toContain("secret detail");
    expect(JSON.stringify(apiErr)).not.toContain("secret detail");
  });

  it.each([
    ["no code in JSON", jsonResponse({ message: "x" }, 401)],
    ["non-string code", jsonResponse({ code: 42 }, 401)],
    ["empty code", jsonResponse({ code: "" }, 401)],
    ["non-JSON body", new Response("<html>oops</html>", { status: 401 })],
    ["empty body", new Response(null, { status: 401 })],
  ])("falls back to HTTP_<status> when %s", async (_n, res) => {
    fetchMock.mockResolvedValue(res);
    const err = (await catchError(login(creds))) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("HTTP_401");
  });

  it.each([
    ["empty body", ""],
    ["non-JSON body", "<html>oops</html>"],
  ])("throws INVALID_RESPONSE on 2xx with %s", async (_n, body) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));
    const err = await catchError(login(creds));
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(200);
    expect((err as ApiError).code).toBe("INVALID_RESPONSE");
    expect(JSON.stringify(err)).not.toContain("oops");
  });

  it("network failure is distinct from HTTP 502", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const net = (await catchError(listLeads({ rome: "M1805" }))) as ApiError;

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 502 }));
    const bad = (await catchError(listLeads({ rome: "M1805" }))) as ApiError;

    expect(net).toBeInstanceOf(ApiError);
    expect(net.status).toBe(0);
    expect(net.isNetworkError).toBe(true);
    expect(bad.status).toBe(502);
    expect(bad.code).toBe("HTTP_502");
    expect(bad.isNetworkError).toBe(false);
    expect(net.code).not.toBe(bad.code);
  });

  it("network error does not leak the underlying error message", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1"));
    const err = (await catchError(login(creds))) as ApiError;
    expect(err.message).not.toContain("10.0.0.1");
  });
});

describe("missing NEXT_PUBLIC_API_URL", () => {
  it.each([["empty", ""], ["whitespace", "   "]])(
    "throws a clear error and does not call fetch when %s",
    async (_n, value) => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", value);

      for (const call of [
        () => register(creds),
        () => login(creds),
        () => listLeads({ rome: "M1805" }),
      ]) {
        const err = await catchError(call());
        expect(err).toBeInstanceOf(Error);
        expect(err).not.toBeInstanceOf(ApiError);
        expect((err as Error).message).toContain("NEXT_PUBLIC_API_URL");
      }
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("throws when the variable is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    const err = await catchError(login(creds));
    expect((err as Error).message).toContain("NEXT_PUBLIC_API_URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
