export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(`API error ${status} (${code})`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  /** Fetch a levé : aucune réponse HTTP (status 0), différent d'un 502. */
  get isNetworkError(): boolean {
    return this.status === 0 && this.code === NETWORK_ERROR_CODE;
  }
}
