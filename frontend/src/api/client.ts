/**
 * Typed client for the API in docs/api-contract.md.
 *
 * Unset VITE_API_BASE_URL means "/api", which the Vite dev server proxies to the
 * backend on localhost:3000.
 */

import type {
  Grant,
  GrantInput,
  GrantWithOutcomes,
  ListResponse,
  Outcome,
  OutcomeInput,
  OutcomesByZip,
} from "../types";

const baseUrl: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** The error shape every endpoint returns on failure. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  /** True when the backend simply isn't running yet. */
  get isUnreachable(): boolean {
    return this.status === 0;
  }
}

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const queryString = search.toString();
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ""}`;
}

async function request<T>(
  path: string,
  options: { method?: string; query?: Record<string, QueryValue>; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", query, body } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "network_unreachable",
      "Could not reach the API. Is the backend running on localhost:3000?",
    );
  }

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    let code = "unknown_error";
    let message = fallback;
    try {
      const parsed = (await response.json()) as Partial<ApiErrorBody>;
      code = parsed.error?.code ?? code;
      message = parsed.error?.message ?? fallback;
    } catch {
      // A non-JSON error body is still an error; keep the fallback message.
    }
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  createGrant(grant: GrantInput): Promise<Grant> {
    return request<Grant>("/grants", { method: "POST", body: grant });
  },

  listGrants(): Promise<ListResponse<Grant>> {
    return request<ListResponse<Grant>>("/grants");
  },

  getGrant(grantId: string): Promise<GrantWithOutcomes> {
    return request<GrantWithOutcomes>(`/grants/${grantId}`);
  },

  createOutcome(outcome: OutcomeInput): Promise<Outcome> {
    return request<Outcome>("/outcomes", { method: "POST", body: outcome });
  },

  listOutcomes(filters: { grantId?: string; zipCode?: string } = {}): Promise<
    ListResponse<Outcome>
  > {
    return request<ListResponse<Outcome>>("/outcomes", { query: { ...filters } });
  },

  getOutcomesByZip(): Promise<ListResponse<OutcomesByZip>> {
    return request<ListResponse<OutcomesByZip>>("/outcomes/by-zip");
  },
};
