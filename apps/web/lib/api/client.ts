import type {
  AuthUser,
  Credentials,
  LeadsPage,
  ListLeadsParams,
} from "@sonar/api-contract";
import { ApiError, NETWORK_ERROR_CODE } from "./errors";

function getBaseUrl(): string {
  // Accès littéral requis : Next n'inline NEXT_PUBLIC_* que sous cette forme.
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined (ex: http://localhost:3001)",
    );
  }
  return base.replace(/\/+$/, "");
}

/** Extrait uniquement un `code` string du body d'erreur ; jamais le body brut. */
async function readErrorCode(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null && "code" in body) {
      const { code } = body as { code: unknown };
      if (typeof code === "string" && code !== "") return code;
    }
  } catch {
    // body absent ou non JSON
  }
  return `HTTP_${res.status}`;
}

async function request<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const method = options.method ?? "GET";
  const init: RequestInit = { method, credentials: "include" };
  if (method !== "GET") {
    init.headers = { "Content-Type": "application/json" };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, NETWORK_ERROR_CODE);
  }

  if (!res.ok) throw new ApiError(res.status, await readErrorCode(res));
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, "INVALID_RESPONSE");
  }
}

export function register(credentials: Credentials): Promise<AuthUser> {
  return request<AuthUser>("/auth/register", {
    method: "POST",
    body: credentials,
  });
}

export function login(credentials: Credentials): Promise<AuthUser> {
  return request<AuthUser>("/auth/login", {
    method: "POST",
    body: credentials,
  });
}

export function listLeads(params: ListLeadsParams): Promise<LeadsPage> {
  const query = new URLSearchParams({ rome: params.rome });
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined)
    query.set("pageSize", String(params.pageSize));
  return request<LeadsPage>(`/leads?${query.toString()}`);
}
