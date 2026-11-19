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
- No auth in the PoC. Don't bake keys into the client; a session cookie goes in later.

## Endpoints

### Grants

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/grants` | Create a grant from the form. Returns the created grant with its `grantId`. |
| `GET` | `/api/grants` | List grants, newest submission first. |
| `GET` | `/api/grants/:grantId` | One grant with its outcomes. |

`POST /api/grants` request:

```json
{
  "name": "Youth Development 2026",
  "funder": "United Way of Greater Knoxville",
  "submissionDate": "2026-01-15",
  "startDate": "2026-03-01",
  "lengthMonths": 12,
  "dueDate": "2026-03-31",
  "amountRequested": "50000.00",
  "amountReceived": "48000.00"
}
```

Only `name` and `funder` are required. Everything else may be omitted or `null` — partial
records have to save, because that's how this data actually arrives.

Response (`201`):

```json
{
  "grantId": "6f1c…",
  "name": "Youth Development 2026",
  "funder": "United Way of Greater Knoxville",
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

## Deferred, on purpose

Not in the PoC, named here so nobody builds around their absence by accident: the
flexible measure library, saved views, the MCP tool surface, CSV import, and auth. See the
product deck in `docs/` for where they land.
