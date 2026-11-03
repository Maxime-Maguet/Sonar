import type { CompaniesPage, ListCompaniesParams } from "@sonar/api-contract";
import { resolveServerBaseUrl } from "./base-url";
import { ApiError, NETWORK_ERROR_CODE } from "./errors";

function getBaseUrl(): string {
  return resolveServerBaseUrl({
    directUrl: process.env.API_DIRECT_URL,
    publicUrl: process.env.NEXT_PUBLIC_API_URL,
  });
}

/** Annuaire public : sans cookie ni credentials, jamais mis en cache. */
export async function listCompanies(
  params: ListCompaniesParams,
): Promise<CompaniesPage> {
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.activityCode) query.set("activityCode", params.activityCode);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) {
    query.set("pageSize", String(params.pageSize));
  }
  const qs = query.toString();
  const url = `${getBaseUrl()}/companies${qs ? `?${qs}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new ApiError(0, NETWORK_ERROR_CODE);
  }
  if (!res.ok) throw new ApiError(res.status, `HTTP_${res.status}`);
  try {
    return (await res.json()) as CompaniesPage;
  } catch {
    throw new ApiError(res.status, "INVALID_RESPONSE");
  }
}
