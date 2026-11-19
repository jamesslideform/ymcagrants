/**
 * Lambda handler for the grants API, behind API Gateway (proxy integration).
 *
 * Implements POST /api/grants from docs/api-contract.md over the table design in
 * docs/data-model.md. The remaining endpoints are added to `routes` as they land.
 */

import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.DYNAMODB_TABLE ?? "ymcagrants";

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
// Field validation. Only name and funder are required; everything else may be
// omitted or null, because partial records have to save.
// ---------------------------------------------------------------------------

function requiredString(input, field) {
  const value = input[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "validation_error", `${field} is required.`);
  }
  return value.trim();
}

function optionalDate(input, field) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  const valid =
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
  if (!valid) {
    throw new HttpError(400, "validation_error", `${field} must be a date in YYYY-MM-DD format.`);
  }
  return value;
}

function optionalMonths(input, field) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new HttpError(400, "validation_error", `${field} must be a whole number of months.`);
  }
  return value;
}

/** Money arrives as a decimal string ("48000.00") and is stored as a number. */
function optionalMoney(input, field) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new HttpError(
      400,
      "validation_error",
      `${field} must be a decimal string like "12000.00".`,
    );
  }
  return Number(value.trim());
}

function toMoneyString(value) {
  return value === null ? null : value.toFixed(2);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function createGrant(event) {
  const input = parseBody(event);

  const grantId = randomUUID();
  const createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const grant = {
    grantId,
    name: requiredString(input, "name"),
    funder: requiredString(input, "funder"),
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

  return json(201, {
    ...grant,
    amountRequested: toMoneyString(grant.amountRequested),
    amountReceived: toMoneyString(grant.amountReceived),
  });
}

const routes = [{ method: "POST", path: /\/grants\/?$/, handle: createGrant }];

// ---------------------------------------------------------------------------
// Entry point. Accepts both REST API (v1) and HTTP API (v2) proxy events.
// ---------------------------------------------------------------------------

export async function handler(event) {
  const method = event.httpMethod ?? event.requestContext?.http?.method;
  const path = event.path ?? event.rawPath ?? "";

  const route = routes.find((r) => r.method === method && r.path.test(path));
  if (!route) {
    return errorResponse(404, "not_found", `No route for ${method} ${path}.`);
  }

  try {
    return await route.handle(event);
  } catch (err) {
    if (err instanceof HttpError) {
      return errorResponse(err.status, err.code, err.message);
    }
    console.error("Unhandled error", { method, path, err });
    return errorResponse(500, "internal_error", "Something went wrong saving the grant.");
  }
}
