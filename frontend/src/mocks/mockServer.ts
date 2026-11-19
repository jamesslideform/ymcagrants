/**
 * An in-memory stand-in for Mike's API.
 *
 * It answers at the `fetch` layer rather than inside the API client, so the
 * app runs its real request code — URL building, status handling, the error
 * envelope, JSON parsing. Migrating to the real backend is deleting this
 * directory and its one call in main.tsx; no page or client code changes.
 *
 * State lives for the browser session: a grant added on the form shows up in
 * the list and the overview, then resets on reload.
 */

import type {
  Grant,
  GrantInput,
  GrantStatus,
  GrantStatusCount,
  Outcome,
  OutcomeInput,
  OutcomesByZip,
  OverviewSummary,
  UpcomingDeadline,
} from "../types";
import { GRANT_STATUSES } from "../types";
import { SEED_GRANTS, SEED_OUTCOMES } from "./fixtures";

const LATENCY_MS = 220;

const grants: Grant[] = SEED_GRANTS.map((grant) => ({ ...grant }));
const outcomes: Outcome[] = SEED_OUTCOMES.map((outcome) => ({ ...outcome }));

let nextId = 9000;

function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function sumMoney(values: Array<string | null>): string {
  const total: number = values.reduce<number>((sum, value) => {
    const parsed: number = Number(value ?? 0);
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
  return total.toFixed(2);
}

function daysBetween(from: Date, toIsoDate: string): number {
  const [year, month, day] = toIsoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return 0;
  }
  const target = new Date(year, month - 1, day);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function error(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function list<T>(items: T[]): Response {
  return json({ items, total: items.length });
}

// ------------------------------------------------------------- aggregates --

function buildStatusCounts(): GrantStatusCount[] {
  return GRANT_STATUSES.map((status) => {
    const inStatus: Grant[] = grants.filter((grant) => grant.status === status);
    return {
      status,
      count: inStatus.length,
      amountRequested: sumMoney(inStatus.map((grant) => grant.amountRequested)),
      amountReceived: sumMoney(inStatus.map((grant) => grant.amountReceived)),
    };
  });
}

function buildByZip(): OutcomesByZip[] {
  const zipCodes: string[] = [...new Set(outcomes.map((outcome) => outcome.zipCode))];

  return zipCodes
    .map((zipCode) => {
      const inZip: Outcome[] = outcomes.filter((outcome) => outcome.zipCode === zipCode);
      return {
        zipCode,
        peopleServed: inZip.reduce((sum, outcome) => sum + (outcome.peopleServed ?? 0), 0),
        outcomeCount: inZip.length,
        grantCount: new Set(inZip.map((outcome) => outcome.grantId)).size,
      };
    })
    .sort((left, right) => (right.peopleServed ?? 0) - (left.peopleServed ?? 0));
}

function buildUpcomingDeadlines(): UpcomingDeadline[] {
  const today = new Date();

  return grants
    .filter((grant) => grant.dueDate !== null)
    .filter((grant) => grant.status === "active" || grant.status === "submitted")
    .map((grant) => ({
      grantId: grant.grantId,
      name: grant.name,
      funder: grant.funder,
      dueDate: grant.dueDate as string,
      daysUntilDue: daysBetween(today, grant.dueDate as string),
    }))
    .sort((left, right) => left.daysUntilDue - right.daysUntilDue);
}

function buildOverview(): OverviewSummary {
  return {
    grantCount: grants.length,
    activeGrantCount: grants.filter((grant) => grant.status === "active").length,
    totalRequested: sumMoney(grants.map((grant) => grant.amountRequested)),
    totalReceived: sumMoney(grants.map((grant) => grant.amountReceived)),
    statusCounts: buildStatusCounts(),
    peopleServedTotal: outcomes.reduce(
      (sum, outcome) => sum + (outcome.peopleServed ?? 0),
      0,
    ),
    outcomeCount: outcomes.length,
    zipCount: new Set(outcomes.map((outcome) => outcome.zipCode)).size,
    topZips: buildByZip().slice(0, 5),
    upcomingDeadlines: buildUpcomingDeadlines().slice(0, 5),
    recentGrants: [...grants]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5),
  };
}

// ---------------------------------------------------------------- handlers --

function createGrant(body: Partial<GrantInput>): Response {
  if (!body.name?.trim() || !body.funder?.trim()) {
    return error(422, "validation_failed", "A grant needs a name and a funder.");
  }
  const status: GrantStatus = (body.status ?? "prospect") as GrantStatus;
  if (!GRANT_STATUSES.includes(status)) {
    return error(422, "validation_failed", `Unknown status "${String(body.status)}".`);
  }

  const grant: Grant = {
    grantId: makeId("g"),
    name: body.name.trim(),
    funder: body.funder.trim(),
    status,
    submissionDate: body.submissionDate ?? null,
    startDate: body.startDate ?? null,
    lengthMonths: body.lengthMonths ?? null,
    dueDate: body.dueDate ?? null,
    amountRequested: body.amountRequested ?? null,
    amountReceived: body.amountReceived ?? null,
    createdAt: new Date().toISOString(),
  };
  grants.unshift(grant);
  return json(grant, 201);
}

function createOutcome(body: Partial<OutcomeInput>): Response {
  if (!body.grantId || !body.zipCode?.trim()) {
    return error(422, "validation_failed", "An outcome needs a grant and a zip code.");
  }
  if (!grants.some((grant) => grant.grantId === body.grantId)) {
    return error(404, "grant_not_found", `No grant with id ${body.grantId}.`);
  }

  const outcome: Outcome = {
    outcomeId: makeId("o"),
    grantId: body.grantId,
    peopleServed: body.peopleServed ?? null,
    socialStatus: body.socialStatus ?? null,
    zipCode: body.zipCode.trim(),
    descriptionOfFunding: body.descriptionOfFunding ?? null,
    result: body.result ?? null,
    createdAt: new Date().toISOString(),
  };
  outcomes.unshift(outcome);
  return json(outcome, 201);
}

function route(method: string, path: string, params: URLSearchParams, body: unknown): Response {
  const segments: string[] = path.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [resource, id, nested] = segments;

  if (resource === "overview" && method === "GET") {
    return json(buildOverview());
  }

  if (resource === "grants") {
    if (method === "GET" && id === undefined) {
      const status = params.get("status");
      const query = params.get("q")?.toLowerCase() ?? "";
      const filtered: Grant[] = grants
        .filter((grant) => (status ? grant.status === status : true))
        .filter((grant) =>
          query
            ? grant.name.toLowerCase().includes(query) ||
              grant.funder.toLowerCase().includes(query)
            : true,
        );
      return list(filtered);
    }
    if (method === "POST" && id === undefined) {
      return createGrant((body ?? {}) as Partial<GrantInput>);
    }
    if (method === "GET" && id !== undefined && nested === undefined) {
      const grant: Grant | undefined = grants.find((item) => item.grantId === id);
      if (!grant) {
        return error(404, "grant_not_found", `No grant with id ${id}.`);
      }
      return json({
        ...grant,
        outcomes: outcomes.filter((outcome) => outcome.grantId === id),
      });
    }
  }

  if (resource === "outcomes") {
    if (method === "GET" && id === "by-zip") {
      return list(buildByZip());
    }
    if (method === "GET" && id === undefined) {
      const grantId = params.get("grantId");
      const zipCode = params.get("zipCode");
      const filtered: Outcome[] = outcomes
        .filter((outcome) => (grantId ? outcome.grantId === grantId : true))
        .filter((outcome) => (zipCode ? outcome.zipCode === zipCode : true));
      return list(filtered);
    }
    if (method === "POST" && id === undefined) {
      return createOutcome((body ?? {}) as Partial<OutcomeInput>);
    }
  }

  return error(404, "not_found", `No stub route for ${method} ${path}.`);
}

// ----------------------------------------------------------------- install --

/**
 * Patch `fetch` so /api/* requests are served from memory. Anything else
 * (assets, fonts) falls through to the real network.
 */
export function installMockApi(): void {
  const realFetch: typeof fetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const rawUrl: string =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(rawUrl, globalThis.location?.origin ?? "http://localhost");

    if (!url.pathname.startsWith("/api")) {
      return realFetch(input, init);
    }

    const method: string = (init?.method ?? "GET").toUpperCase();
    let body: unknown;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        return error(400, "invalid_json", "Request body was not valid JSON.");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
    return route(method, url.pathname, url.searchParams, body);
  };

  // The startup banner lives in src/api/mode.ts so one place announces which
  // API is in use, whichever one it is.
}
