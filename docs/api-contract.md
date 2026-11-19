# API contract — proof of concept

The agreement between `frontend/` (James) and `backend/` (Mike). The frontend's client
(`frontend/src/api/client.ts`) and types (`frontend/src/types.ts`) are written against this
document.

Scoped to the whiteboard: submit a grant, record an outcome, read outcomes by zip. Change
it in a PR both of us review, and move the client and types in the same change.

## Ground rules

- Base path `/api`. The Vite dev server proxies `/api` → `http://localhost:3000`.
- JSON in, JSON out. Dates are `YYYY-MM-DD`; timestamps are ISO-8601.
- Money crosses the wire as a decimal **string** (`"12000.00"`) so nothing rounds in
  transit. The backend stores it as a DynamoDB number.
- Lists answer `{ "items": [...], "total": 123 }` — never a bare array, so paging can be
  added without breaking callers.
- Errors answer the HTTP status plus `{ "error": { "code": "...", "message": "..." } }`.
  `code` is stable and machine-readable; `message` is for people.

  The codes in use, now pinned so the two sides can't drift apart:

  | Status | `code` | When |
  | --- | --- | --- |
  | 400 | `invalid_json` | Body wasn't parseable JSON |
  | 400 | `invalid_body` | Body was missing where one is required |
  | 404 | `grant_not_found` | No grant with that id |
  | 404 | `not_found` | No route matched |
  | 422 | `validation_failed` | A field was missing or malformed |
  | 500 | `internal_error` | Unhandled — the message is deliberately vague |

  **The frontend branches on the HTTP status, not on `code`.** Adding a new code is
  therefore safe; changing the status attached to an existing situation is not.
- No auth in the PoC. Don't bake keys into the client; a session cookie goes in later.

## Endpoints

### Grants

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/grants` | Create a grant from the form. Returns the created grant with its `grantId`. |
| `GET` | `/api/grants` | List grants, newest submission first. Optional filters: `status`, `q` (free text over name and funder). |
| `GET` | `/api/grants/:grantId` | One grant with its outcomes. |

**`status`** is one of `prospect`, `submitted`, `active`, `closed`, `declined`. It is
required on create (the form defaults to `prospect`) and drives the overview breakdown, so
it can't be derived from the amounts or dates.

`POST /api/grants` request:

```json
{
  "name": "Youth Development 2026",
  "funder": "United Way of Greater Knoxville",
  "status": "active",
  "submissionDate": "2026-01-15",
  "startDate": "2026-03-01",
  "lengthMonths": 12,
  "dueDate": "2026-03-31",
  "amountRequested": "50000.00",
  "amountReceived": "48000.00"
}
```

Only `name`, `funder`, and `status` are required. Everything else may be omitted or
`null` — partial records have to save, because that's how this data actually arrives.

Response (`201`):

```json
{
  "grantId": "6f1c…",
  "name": "Youth Development 2026",
  "funder": "United Way of Greater Knoxville",
  "status": "active",
  "submissionDate": "2026-01-15",
  "startDate": "2026-03-01",
  "lengthMonths": 12,
  "dueDate": "2026-03-31",
  "amountRequested": "50000.00",
  "amountReceived": "48000.00",
  "createdAt": "2026-01-15T14:02:11Z"
}
```

`GET /api/grants/:grantId` returns the same object plus `"outcomes": [ … ]`.

### Outcomes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/outcomes` | Record an outcome against a grant. |
| `GET` | `/api/outcomes` | List outcomes. Optional filters: `grantId`, `zipCode`. |
| `GET` | `/api/outcomes/by-zip` | **The outcomes-by-zip view.** Totals grouped by zip code. |

`POST /api/outcomes` request:

```json
{
  "grantId": "6f1c…",
  "peopleServed": 412,
  "socialStatus": "youth 6-12",
  "zipCode": "37902",
  "descriptionOfFunding": "After-school programming at the Knoxville branch",
  "result": "Met the target of 350 by the third quarter"
}
```

`grantId` and `zipCode` are required — without them the record can't be attributed or
grouped. `peopleServed` may be `null` when the count isn't in yet.

`GET /api/outcomes/by-zip` response:

```json
{
  "items": [
    {
      "zipCode": "37902",
      "peopleServed": 412,
      "outcomeCount": 3,
      "grantCount": 2
    }
  ],
  "total": 1
}
```

`peopleServed` is the sum across that zip's outcomes; `grantCount` is the number of
distinct grants contributing to it.

### Overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/overview` | Everything the landing page needs, in one request. |

All of it is derivable from grants + outcomes, so it can start life as an aggregate inside
the handler. It exists as one endpoint because the alternative — four round trips from the
browser — makes the first screen Kelly sees the slowest one.

```json
{
  "grantCount": 7,
  "activeGrantCount": 3,
  "totalRequested": "237500.00",
  "totalReceived": "135500.00",
  "statusCounts": [
    { "status": "active", "count": 3, "amountRequested": "100500.00", "amountReceived": "95500.00" }
  ],
  "peopleServedTotal": 1008,
  "outcomeCount": 6,
  "zipCount": 4,
  "topZips": [
    { "zipCode": "37902", "peopleServed": 494, "outcomeCount": 2, "grantCount": 2 }
  ],
  "upcomingDeadlines": [
    {
      "grantId": "6f1c…",
      "name": "Youth Development 2026",
      "funder": "United Way of Greater Knoxville",
      "dueDate": "2026-12-07",
      "daysUntilDue": 18
    }
  ],
  "recentGrants": []
}
```

`statusCounts` covers every status, including ones with a count of zero, so the breakdown
doesn't change shape as data arrives. `upcomingDeadlines` is sorted soonest first and
`daysUntilDue` goes negative when a date has passed — the UI shows those as overdue.
`recentGrants` holds the same grant objects as `GET /api/grants`.

## Deferred, on purpose

Not in the PoC, named here so nobody builds around their absence by accident: the
flexible measure library, saved views, the MCP tool surface, CSV import, and auth. See the
product deck in `docs/` for where they land.
