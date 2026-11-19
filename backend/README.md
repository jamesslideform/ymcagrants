# Backend

**Not scaffolded on purpose.** The backend owner picks the stack. Node + AWS is the
expectation, but nothing here assumes it.

What this directory owes the rest of the project:

## The contract

Implement [`../docs/api-contract.md`](../docs/api-contract.md) over the schema in
[`../docs/data-model.md`](../docs/data-model.md). Those two documents are the agreement —
if something in them is wrong, change it in a PR rather than diverging quietly.

## What the frontend assumes

- The API is reachable at `/api`, and the Vite dev server proxies `/api` to
  `http://localhost:3000`. If you serve on a different port, change
  `frontend/vite.config.ts` in the same PR, or set `VITE_API_BASE_URL`.
- Lists come back as `{ items, total }`, errors as
  `{ error: { code, message } }` with a meaningful HTTP status.
- CORS only matters if you skip the dev proxy. The proxy is simpler.

## Expected environment

Copy `.env.example` to `.env`. At minimum:

```
DATABASE_URL=postgres://localhost:5432/ymcagrants
PORT=3000
```

## Things worth deciding early (and writing down here)

- **Migrations.** Whatever the tool, migrations are checked in and run forward only. The
  frontend developer needs to recreate your database from a clean clone.
- **Seed data.** Three real-ish grants with programs, deliverables, and a few measurements.
  Everyone develops against the same data, and demos stop depending on who typed what.
- **Deployment.** AWS is expected. Keep it boring and cheap — the YMCA inherits whatever we
  build, and "assume whoever maintains this in a year was not at the hackathon" is a real
  constraint, not a slogan.
- **Database access for the MCP layer (phase 4).** Plan for a read-only Postgres role now.
  The MCP server gets aggregates and one narrow write path for saved views; it never gets
  raw SQL from the model or client-level rows.

## Privacy, in code

The schema has no place for client names, addresses, dates of birth, or case notes, and it
should stay that way. Outcome data is counts, percentages, and category labels. If a funder
asks for client-level reporting, that's a conversation with Kelly before it is a column.
