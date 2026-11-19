# Backend status and TODO

Working notes for the API. **Owner: Mike.** Updated 2026-11-19.

Companion to [`FRONTEND_TODO.md`](FRONTEND_TODO.md). The agreement between the two is
[`docs/api-contract.md`](docs/api-contract.md) and [`docs/data-model.md`](docs/data-model.md).

---

## Status

**All seven contract endpoints are implemented** in `backend/src/handler.js` — a single
Lambda behind API Gateway proxy integration, reading and writing one DynamoDB table.

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/grants` | `name`, `funder`, `status` required; everything else may be null |
| `GET` | `/api/grants` | Optional `status` and `q` (name/funder substring) |
| `GET` | `/api/grants/:grantId` | Embeds the grant's `outcomes`; 404s on a missing id |
| `POST` | `/api/outcomes` | `grantId` + 5-digit `zipCode` required |
| `GET` | `/api/outcomes` | Optional `grantId` or `zipCode` |
| `GET` | `/api/outcomes/by-zip` | The rollup behind the outcomes page |
| `GET` | `/api/overview` | Everything the landing page needs, in one request |

Properties worth not losing in a later refactor:

- **No `Scan`.** Every read is a `Query` on the table or on `gsi1`.
- **`statusCounts` covers every status**, including zero-count ones, because it maps over
  the status list rather than over the grants present. That's what stops the overview
  changing shape as data arrives.
- **Money is a decimal string on the wire**, a number in DynamoDB, summed in cents so
  totals don't pick up floating-point drift.
- **Partial records save.** Nulls are omitted from the item rather than stored as NULL.
- `gsi1sk` falls back to `createdAt` when `submissionDate` is null, so a grant entered
  without a submission date still gets a valid sort key.

---

## Open

### Blocking the first live demo

- [ ] **CORS** — [#10](https://github.com/jamesslideform/ymcagrants/issues/10). Every
      response sets only `Content-Type`, and there's no `OPTIONS` route, so a preflight
      gets a 404. Invisible today because the Vite dev proxy makes everything same-origin;
      a hard blocker the moment the deployed frontend talks to API Gateway. The issue has
      the fix and the curl checks. **Put the headers on error responses too** — a
      CORS-blocked 422 reaches the browser as a network failure, not a validation message,
      which hides exactly the errors the frontend is built to show.

### Worth doing before anyone relies on it

- [ ] **`backend/grants-api.zip` is committed.** Currently byte-identical to `src/`
      (checked), so no drift yet — but a build artifact in git drifts the first time
      someone edits the handler and forgets to rebuild, and it can't be reviewed in a
      diff. Suggest `.gitignore` plus a deploy step that builds it.
- [ ] **No tests.** The frontend has none either. The highest-value first test here is
      `toGrant`/`toOutcome` round-tripping money and nulls, since that's where a silent
      wrong-shape response would come from.
- [ ] **Deploy is manual.** Nothing in the repo creates the table, the `gsi1` index, or
      the Lambda. Check in whatever does it (SAM, CDK, Terraform, or a script) — "it
      exists in my account" doesn't survive someone else picking this up.
- [ ] **Seed data.** Three or four real-ish grants with outcomes across a couple of zips,
      so a live demo has something to show without typing during it.

### Known ceilings, not defects

- [ ] **`GET /api/overview` and unfiltered `GET /api/outcomes` are one query per grant.**
      `loadAllOutcomeItems` fans out in batches of 10; the code already says this is
      proof-of-concept sizing. The trigger to revisit is **grant** count, not outcome
      count: ~50 grants means ~5 sequential rounds of 10 queries on the landing page.
      `docs/data-model.md` names the fix (running totals per zip).
- [ ] **No pagination.** `{ items, total }` already allows adding it without breaking the
      client; `total` is honest today because every read pages through completely.

### Deferred by design

- [ ] **Auth.** None, deliberately, for the prototype.
- [ ] **A read-only database role for the MCP layer** (phase 4). Worth planning before the
      MCP work starts rather than retrofitting.

---

## Conventions this side already follows

Keep these when adding endpoints, because the frontend depends on them.

- Lists answer `{ items, total }` — never a bare array.
- Errors answer `{ error: { code, message } }`. The codes in use are pinned in
  `docs/api-contract.md`; the frontend branches on **status**, not on `code`, so a new
  code is safe but a changed status is not.
- Dates are `YYYY-MM-DD`; timestamps are ISO-8601 with no milliseconds.
- `null` is the answer for "not known yet", for every optional field.

## Privacy

The table has no place for a client name, address, date of birth, or case note.
`socialStatus` is a category like "youth 6-12" and `peopleServed` is a count — outcome
items describe a group in a zip code, not a person. If a funder asks for client-level
reporting, that's a conversation with Kelly before it is an attribute.
