/**
 * Lambda handler for the grants API, behind API Gateway (proxy integration).
 *
 * Implements the endpoints in docs/api-contract.md over the table design in
 * docs/data-model.md: grants, outcomes, outcomes by zip, and the overview.
 */

import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.DYNAMODB_TABLE ?? "ymcagrants";

const GRANT_STATUSES = ["prospect", "submitted", "active", "closed", "declined"];

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  // Set only when running against DynamoDB Local.
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
});
const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/** Thrown inside a route to answer with the contract's error shape. */
class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function errorResponse(status, code, message) {
  return json(status, { error: { code, message } });
}

function parseBody(event) {
  if (!event.body) {
    throw new HttpError(400, "invalid_body", "Request body is required.");
  }
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be a JSON object.");
  }
}

// ---------------------------------------------------------------------------
// Field validation. Only name, funder, and status are required; everything else may be
// omitted or null, because partial records have to save.
// ---------------------------------------------------------------------------

function requiredString(input, field) {
  const value = input[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(422, "validation_failed", `${field} is required.`);
  }
  return value.trim();
}

function requiredStatus(input) {
  const value = input.status;
  if (!GRANT_STATUSES.includes(value)) {
    throw new HttpError(
      422,
      "validation_failed",
      `status must be one of: ${GRANT_STATUSES.join(", ")}.`,
    );
  }
  return value;
}

function optionalDate(input, field) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  const valid =
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
  if (!valid) {
    throw new HttpError(422, "validation_failed", `${field} must be a date in YYYY-MM-DD format.`);
  }
  return value;
}

function optionalMonths(input, field) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new HttpError(422, "validation_failed", `${field} must be a whole number of months.`);
  }
  return value;
}

/** Money arrives as a decimal string ("48000.00") and is stored as a number. */
function optionalMoney(input, field) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new HttpError(
      422,
      "validation_failed",
      `${field} must be a decimal string like "12000.00".`,
    );
  }
  return Number(value.trim());
}

function optionalCount(input, field) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new HttpError(422, "validation_failed", `${field} must be a whole number.`);
  }
  return value;
}

function optionalText(input, field) {
  const value = input[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(422, "validation_failed", `${field} must be text.`);
  }
  return value.trim() === "" ? null : value.trim();
}

/** Zip is the by-zip grouping key, so it has to be a real five-digit zip. */
function requiredZip(input) {
  const value = typeof input.zipCode === "string" ? input.zipCode.trim() : "";
  if (!/^\d{5}(-\d{4})?$/.test(value)) {
    throw new HttpError(422, "validation_failed", "zipCode must be a 5-digit zip code.");
  }
  return value.slice(0, 5);
}

function toMoneyString(value) {
  return value === null || value === undefined ? null : Number(value).toFixed(2);
}

// ---------------------------------------------------------------------------
// Item -> API shapes. Attributes left off an item come back as null.
// ---------------------------------------------------------------------------

function toGrant(item) {
  return {
    grantId: item.grantId,
    name: item.name,
    funder: item.funder,
    status: item.status ?? null,
    submissionDate: item.submissionDate ?? null,
    startDate: item.startDate ?? null,
    lengthMonths: item.lengthMonths ?? null,
    dueDate: item.dueDate ?? null,
    amountRequested: toMoneyString(item.amountRequested),
    amountReceived: toMoneyString(item.amountReceived),
    createdAt: item.createdAt,
  };
}

function toOutcome(item) {
  return {
    outcomeId: item.outcomeId,
    grantId: item.grantId,
    peopleServed: item.peopleServed ?? null,
    socialStatus: item.socialStatus ?? null,
    zipCode: item.zipCode,
    descriptionOfFunding: item.descriptionOfFunding ?? null,
    result: item.result ?? null,
    createdAt: item.createdAt,
  };
}

/** Sums money in cents so totals don't pick up floating-point drift. */
function sumMoney(values) {
  const cents = values.reduce((sum, value) => sum + Math.round(Number(value ?? 0) * 100), 0);
  return (cents / 100).toFixed(2);
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Today in East Tennessee, so "days until due" doesn't flip at 7pm local. */
function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function daysBetween(fromIsoDate, toIsoDate) {
  return Math.round((Date.parse(toIsoDate) - Date.parse(fromIsoDate)) / 86_400_000);
}

const byNewest = (a, b) => b.createdAt.localeCompare(a.createdAt);

// ---------------------------------------------------------------------------
// Data access. Every read is a Query on the table or on gsi1 -- no Scans.
// ---------------------------------------------------------------------------

async function queryAll(params) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const page = await db.send(new QueryCommand({ TableName: TABLE, ...params, ExclusiveStartKey }));
    items.push(...page.Items);
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Every grant, newest submission first. */
async function loadGrantItems() {
  return queryAll({
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :pk",
    ExpressionAttributeValues: { ":pk": "GRANTS" },
    ScanIndexForward: false,
  });
}

/** A grant's partition: its METADATA item plus every outcome reported against it. */
async function loadGrantPartition(grantId) {
  return queryAll({
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": `GRANT#${grantId}` },
  });
}

async function loadOutcomesForGrant(grantId) {
  return queryAll({
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
    ExpressionAttributeValues: { ":pk": `GRANT#${grantId}`, ":prefix": "OUTCOME#" },
  });
}

async function loadOutcomesForZip(zipCode) {
  return queryAll({
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :pk",
    ExpressionAttributeValues: { ":pk": `ZIP#${zipCode}` },
    ScanIndexForward: false,
  });
}

/**
 * Every outcome, read grant by grant. Fine at proof-of-concept volume; if this
 * grows, keep running totals per zip instead (see docs/data-model.md).
 */
async function loadAllOutcomeItems(grantItems) {
  const outcomes = [];
  for (let i = 0; i < grantItems.length; i += 10) {
    const batch = grantItems.slice(i, i + 10);
    const results = await Promise.all(batch.map((g) => loadOutcomesForGrant(g.grantId)));
    outcomes.push(...results.flat());
  }
  return outcomes;
}

async function grantExists(grantId) {
  const items = await queryAll({
    KeyConditionExpression: "pk = :pk AND sk = :sk",
    ExpressionAttributeValues: { ":pk": `GRANT#${grantId}`, ":sk": "METADATA" },
  });
  return items.length > 0;
}

// ---------------------------------------------------------------------------
// Aggregates, shared by the by-zip view and the overview.
// ---------------------------------------------------------------------------

function buildByZip(outcomes) {
  const zips = new Map();
  for (const outcome of outcomes) {
    const row = zips.get(outcome.zipCode) ?? {
      zipCode: outcome.zipCode,
      peopleServed: 0,
      outcomeCount: 0,
      grants: new Set(),
    };
    row.peopleServed += outcome.peopleServed ?? 0;
    row.outcomeCount += 1;
    row.grants.add(outcome.grantId);
    zips.set(outcome.zipCode, row);
  }
  return [...zips.values()]
    .map(({ grants, ...row }) => ({ ...row, grantCount: grants.size }))
    .sort((a, b) => b.peopleServed - a.peopleServed);
}

function buildOverview(grants, outcomes) {
  const today = todayLocal();
  const byZip = buildByZip(outcomes);

  return {
    grantCount: grants.length,
    activeGrantCount: grants.filter((g) => g.status === "active").length,
    totalRequested: sumMoney(grants.map((g) => g.amountRequested)),
    totalReceived: sumMoney(grants.map((g) => g.amountReceived)),
    statusCounts: GRANT_STATUSES.map((status) => {
      const inStatus = grants.filter((g) => g.status === status);
      return {
        status,
        count: inStatus.length,
        amountRequested: sumMoney(inStatus.map((g) => g.amountRequested)),
        amountReceived: sumMoney(inStatus.map((g) => g.amountReceived)),
      };
    }),
    peopleServedTotal: outcomes.reduce((sum, o) => sum + (o.peopleServed ?? 0), 0),
    outcomeCount: outcomes.length,
    zipCount: byZip.length,
    topZips: byZip.slice(0, 5),
    upcomingDeadlines: grants
      .filter((g) => g.dueDate && (g.status === "active" || g.status === "submitted"))
      .map((g) => ({
        grantId: g.grantId,
        name: g.name,
        funder: g.funder,
        dueDate: g.dueDate,
        daysUntilDue: daysBetween(today, g.dueDate),
      }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 5),
    recentGrants: [...grants].sort(byNewest).slice(0, 5),
  };
}

function list(items) {
  return json(200, { items, total: items.length });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function createGrant(event) {
  const input = parseBody(event);

  const grantId = randomUUID();
  const createdAt = nowIso();
  const grant = {
    grantId,
    name: requiredString(input, "name"),
    funder: requiredString(input, "funder"),
    status: requiredStatus(input),
    submissionDate: optionalDate(input, "submissionDate"),
    startDate: optionalDate(input, "startDate"),
    lengthMonths: optionalMonths(input, "lengthMonths"),
    dueDate: optionalDate(input, "dueDate"),
    amountRequested: optionalMoney(input, "amountRequested"),
    amountReceived: optionalMoney(input, "amountReceived"),
    createdAt,
  };

  // A grant without a submission date still sorts into the list by when it was entered.
  const sortDate = grant.submissionDate ?? createdAt.slice(0, 10);

  // Null fields are left off the item rather than stored as NULL.
  const attributes = Object.fromEntries(
    Object.entries(grant).filter(([, value]) => value !== null),
  );

  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `GRANT#${grantId}`,
        sk: "METADATA",
        gsi1pk: "GRANTS",
        gsi1sk: `${sortDate}#${grantId}`,
        entityType: "grant",
        ...attributes,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );

  return json(201, toGrant(grant));
}

/** GET /api/grants, newest submission first. Optional filters: status, q. */
async function listGrants(event) {
  const params = event.queryStringParameters ?? {};
  const q = params.q?.trim().toLowerCase() ?? "";

  const grants = (await loadGrantItems())
    .map(toGrant)
    .filter((g) => (params.status ? g.status === params.status : true))
    .filter((g) =>
      q ? g.name.toLowerCase().includes(q) || g.funder.toLowerCase().includes(q) : true,
    );

  return list(grants);
}

/** One grant with its outcomes: they share a partition, so it's one Query. */
async function getGrant(event, grantId) {
  const items = await loadGrantPartition(grantId);

  const grantItem = items.find((item) => item.sk === "METADATA");
  if (!grantItem) {
    throw new HttpError(404, "grant_not_found", `No grant with id ${grantId}.`);
  }

  const outcomes = items
    .filter((item) => item.entityType === "outcome")
    .map(toOutcome)
    .sort(byNewest);

  return json(200, { ...toGrant(grantItem), outcomes });
}

async function createOutcome(event) {
  const input = parseBody(event);

  const grantId = requiredString(input, "grantId");
  const outcome = {
    outcomeId: randomUUID(),
    grantId,
    peopleServed: optionalCount(input, "peopleServed"),
    socialStatus: optionalText(input, "socialStatus"),
    zipCode: requiredZip(input),
    descriptionOfFunding: optionalText(input, "descriptionOfFunding"),
    result: optionalText(input, "result"),
    createdAt: nowIso(),
  };

  if (!(await grantExists(grantId))) {
    throw new HttpError(404, "grant_not_found", `No grant with id ${grantId}.`);
  }

  const attributes = Object.fromEntries(
    Object.entries(outcome).filter(([, value]) => value !== null),
  );

  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `GRANT#${grantId}`,
        sk: `OUTCOME#${outcome.outcomeId}`,
        gsi1pk: `ZIP#${outcome.zipCode}`,
        gsi1sk: `${outcome.createdAt}#${outcome.outcomeId}`,
        entityType: "outcome",
        ...attributes,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );

  return json(201, outcome);
}

/** GET /api/outcomes, newest first. Optional filters: grantId, zipCode. */
async function listOutcomes(event) {
  const { grantId, zipCode } = event.queryStringParameters ?? {};

  let items;
  if (grantId) {
    items = await loadOutcomesForGrant(grantId);
  } else if (zipCode) {
    items = await loadOutcomesForZip(zipCode);
  } else {
    items = await loadAllOutcomeItems(await loadGrantItems());
  }

  const outcomes = items
    .map(toOutcome)
    .filter((o) => (zipCode ? o.zipCode === zipCode : true))
    .sort(byNewest);

  return list(outcomes);
}

async function getOutcomesByZip() {
  const outcomes = (await loadAllOutcomeItems(await loadGrantItems())).map(toOutcome);
  return list(buildByZip(outcomes));
}

async function getOverview() {
  const grantItems = await loadGrantItems();
  const outcomes = (await loadAllOutcomeItems(grantItems)).map(toOutcome);
  return json(200, buildOverview(grantItems.map(toGrant), outcomes));
}

const routes = [
  { method: "POST", path: /\/grants\/?$/, handle: createGrant },
  { method: "GET", path: /\/grants\/?$/, handle: listGrants },
  { method: "GET", path: /\/grants\/([^/]+)\/?$/, handle: getGrant },
  { method: "POST", path: /\/outcomes\/?$/, handle: createOutcome },
  { method: "GET", path: /\/outcomes\/by-zip\/?$/, handle: getOutcomesByZip },
  { method: "GET", path: /\/outcomes\/?$/, handle: listOutcomes },
  { method: "GET", path: /\/overview\/?$/, handle: getOverview },
];

// ---------------------------------------------------------------------------
// Entry point. Accepts both REST API (v1) and HTTP API (v2) proxy events.
// ---------------------------------------------------------------------------

export async function handler(event) {
  const method = event.httpMethod ?? event.requestContext?.http?.method;
  const path = event.path ?? event.rawPath ?? "";

  let match = null;
  const route = routes.find((r) => r.method === method && (match = r.path.exec(path)));
  if (!route) {
    return errorResponse(404, "not_found", `No route for ${method} ${path}.`);
  }

  try {
    return await route.handle(event, ...match.slice(1).map(decodeURIComponent));
  } catch (err) {
    if (err instanceof HttpError) {
      return errorResponse(err.status, err.code, err.message);
    }
    console.error("Unhandled error", { method, path, err });
    return errorResponse(500, "internal_error", "Something went wrong on our side.");
  }
}
