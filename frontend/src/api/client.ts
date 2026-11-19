/**
 * Typed client for the API in docs/api-contract.md.
 *
 * Unset VITE_API_BASE_URL means "/api", which is either the Vite dev proxy to
 * the real backend or the stub in src/mocks, depending on VITE_API_MODE.
 */

import type {
  Grant,
  GrantInput,
  GrantStatus,
  GrantWithOutcomes,
  ListResponse,
  Outcome,
  OutcomeInput,
  OutcomesByZip,
  OverviewSummary,
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

  /** True when the API couldn't be reached at all. */
  get isUnreachable(): boolean {
    return this.status === 0;
  }

  /** True when the record asked for doesn't exist. */
  get isNotFound(): boolean {
    return this.status === 404;
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

export interface GrantFilters {
  status?: GrantStatus;
  /** Free text across name and funder. */
  q?: string;
}

export const api = {
  /** Everything the overview page needs, in one request. */
  getOverview(): Promise<OverviewSummary> {
    return request<OverviewSummary>("/overview");
  },

  listGrants(filters: GrantFilters = {}): Promise<ListResponse<Grant>> {
    return request<ListResponse<Grant>>("/grants", { query: { ...filters } });
  },

  getGrant(grantId: string): Promise<GrantWithOutcomes> {
    return request<GrantWithOutcomes>(`/grants/${grantId}`);
  },

  createGrant(grant: GrantInput): Promise<Grant> {
    return request<Grant>("/grants", { method: "POST", body: grant });
  },

  listOutcomes(filters: { grantId?: string; zipCode?: string } = {}): Promise<
    ListResponse<Outcome>
  > {
    return request<ListResponse<Outcome>>("/outcomes", { query: { ...filters } });
  },

  createOutcome(outcome: OutcomeInput): Promise<Outcome> {
    return request<Outcome>("/outcomes", { method: "POST", body: outcome });
  },

  getOutcomesByZip(): Promise<ListResponse<OutcomesByZip>> {
    return request<ListResponse<OutcomesByZip>>("/outcomes/by-zip");
  },
};
