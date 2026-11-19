# API contract

The agreement between `frontend/` and `backend/`. The frontend's API client
(`frontend/src/api/client.ts`) and types (`frontend/src/types.ts`) are written against this
document; the backend is free to implement it in whatever stack its owner picks.

Change it in a PR both sides review, and update the client and types in the same change.

## Ground rules

- Base path `/api`. The dev server proxies `/api` → `http://localhost:3000`.
- JSON in, JSON out. `Content-Type: application/json`.
- Dates are ISO-8601. Money is a string decimal (`"12000.00"`) so nothing rounds in transit.
- Lists return `{ "items": [...], "total": 123 }` — never a bare array, so paging can be
  added without breaking callers.
- Errors return the HTTP status plus `{ "error": { "code": "...", "message": "..." } }`.
  `code` is machine-readable and stable; `message` is for humans.
- No auth for the hackathon build. Everything is additive behind a session cookie later —
  don't bake API keys into the client.

## Endpoints

### Grants

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/grants` | List. Filters: `status`, `funderId`, `programId`, `periodStart`, `periodEnd`, `q`. |
| `POST` | `/api/grants` | Create. |
| `GET` | `/api/grants/:id` | One grant with its funder, programs, deliverables, and measures. |
| `PATCH` | `/api/grants/:id` | Partial update. |
| `DELETE` | `/api/grants/:id` | Soft delete. |

### Supporting records

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` `POST` | `/api/funders` | |
| `GET` `POST` | `/api/programs` | |
| `GET` `POST` | `/api/deliverables` | `GET` filters: `grantId`, `dueBefore`, `status`. |
| `PATCH` | `/api/deliverables/:id` | Mark submitted. |

### Outcomes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` `POST` | `/api/measure-definitions` | The shared measure library. |
| `POST` | `/api/grants/:id/measures` | Attach a measure to a grant with target and cadence. |
| `GET` `POST` | `/api/measurements` | Record a value for a period. `GET` filters: `grantId`, `grantMeasureId`, `periodStart`, `periodEnd`. |
| `GET` | `/api/outcomes/summary` | Progress toward target, per grant measure. Params: `grantId`, `programId`, `periodStart`, `periodEnd`. |

### Dashboard and saved views

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/dashboard` | The default leadership view in one call: active funding, upcoming deadlines, people served, outcome progress. |
| `GET` `POST` | `/api/saved-views` | List and create stored query definitions. |
| `GET` `PATCH` `DELETE` | `/api/saved-views/:id` | |
| `POST` | `/api/saved-views/:id/run` | Execute a view, return rows ready to chart. |

### Import

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/import/preview` | Upload CSV, return parsed rows plus a column mapping guess. Writes nothing. |
| `POST` | `/api/import/commit` | Apply a reviewed mapping. |

Preview-then-commit is deliberate: spreadsheet imports are where bad data enters, and the
grants manager should see what will happen before it does.

## Example payloads

`GET /api/grants?status=active`

```json
{
  "items": [
    {
      "id": "6f1c…",
      "title": "Youth Development 2026",
      "funder": { "id": "a21e…", "name": "United Way of Greater Knoxville" },
      "awardAmount": "48000.00",
      "periodStart": "2026-01-01",
      "periodEnd": "2026-12-31",
      "status": "active",
      "programs": [{ "id": "c7b0…", "name": "Y Learning after-school" }],
      "nextDeadline": { "id": "9d4a…", "title": "Q1 outcomes report", "dueDate": "2026-03-31" }
    }
  ],
  "total": 1
}
```

`GET /api/outcomes/summary?grantId=6f1c…`

```json
{
  "items": [
    {
      "grantMeasureId": "4b77…",
      "name": "Youth served",
      "valueType": "count",
      "unit": "youth",
      "targetValue": "350",
      "currentValue": "412",
      "percentOfTarget": 117.7,
      "cadence": "quarterly",
      "lastRecordedPeriodEnd": "2026-09-30",
      "hasGaps": false
    }
  ],
  "total": 1
}
```

`POST /api/measurements`

```json
{
  "grantMeasureId": "4b77…",
  "periodStart": "2026-07-01",
  "periodEnd": "2026-09-30",
  "numericValue": "138",
  "isEstimated": false,
  "sourceNote": "DaxKo attendance export",
  "recordedBy": "kelly"
}
```

## Saved view definition

The `definition` field is the whole contract between the UI, the saved view, and the MCP
layer. Keep it declarative — no SQL, no code.

```json
{
  "metric": "measurement_sum",
  "measureDefinitionId": "1a2b…",
  "groupBy": "program",
  "filters": {
    "status": ["active"],
    "periodStart": "2026-01-01",
    "periodEnd": "2026-12-31"
  },
  "chart": "bar"
}
```

The backend translates this into a parameterized query. The model never writes SQL: the
MCP server fills in this same structure, which is what keeps Claude inside the guardrails.
