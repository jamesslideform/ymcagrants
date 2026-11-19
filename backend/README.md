# Backend

**Owner: Mike.** Node + AWS, DynamoDB for storage, per the kickoff whiteboard. The shape
inside this directory is yours — what follows is only what the rest of the project depends
on.

## The contract

Implement [`../docs/api-contract.md`](../docs/api-contract.md) over the table design in
[`../docs/data-model.md`](../docs/data-model.md). Those two documents are the agreement
between us; if something in them is wrong, change it in a PR rather than diverging quietly.

Six endpoints carry the whole proof of concept:

```
POST   /api/grants             create from the form
GET    /api/grants             list, newest submission first
GET    /api/grants/:grantId    one grant with its outcomes
POST   /api/outcomes           record an outcome
GET    /api/outcomes           list, optional grantId / zipCode filters
GET    /api/outcomes/by-zip    totals grouped by zip — the outcomes view
```

## What the frontend assumes

- The API answers at `/api`, and the Vite dev server proxies `/api` to
  `http://localhost:3000`. Serving somewhere else is fine — change the proxy target in
  `frontend/vite.config.ts` in the same PR, or James sets `VITE_API_BASE_URL`.
- Lists come back as `{ items, total }`; errors as `{ error: { code, message } }` with a
  meaningful HTTP status.
- Money is a decimal **string** on the wire (`"48000.00"`), stored as a DynamoDB number.
- Partial records save. Only `name` + `funder` on a grant, and `grantId` + `zipCode` on an
  outcome, are required. Everything else may arrive `null`.
- **CORS is needed before the deployed frontend can talk to AWS** — see
  [#10](https://github.com/jamesslideform/ymcagrants/issues/10). Local dev doesn't show
  it, because the Vite proxy makes everything same-origin; the deployed prototype on
  `redeep.dev` is a different origin with no proxy in front of it.

## Running it

Copy `.env.example` to `.env`:

```
AWS_REGION=us-east-1
DYNAMODB_TABLE=ymcagrants
PORT=3000
```

For local development, either point at a real table or run DynamoDB Local and set
`DYNAMODB_ENDPOINT=http://localhost:8000`. Either way, the frontend only sees HTTP on 3000.

## Worth deciding early, and writing down here

- **Express on Lambda, or plain Lambda handlers behind API Gateway.** One Express app
  behind a single function is usually faster to demo and trivially runnable locally; split
  handlers are tidier later. Your call — just write down which, so James knows what he's
  pointing at.
- **Table creation.** Check in whatever creates the table and its `gsi1` index (SAM, CDK,
  Terraform, or a script). "It exists in my account" doesn't survive the weekend.
- **Seed data.** Three or four real-ish grants with outcomes in a couple of zip codes, so
  the by-zip view has something to show in the demo and we're not typing during it.
- **IDs.** The backend generates `grantId` and `outcomeId` (UUIDs). The frontend never
  invents one.

## Privacy, in code

The table has no place for a client name, address, date of birth, or case note, and it
should stay that way. `socialStatus` is a category like "youth 6-12" and `peopleServed` is
a count — outcome items describe a group in a zip code, not a person. If a funder asks for
client-level reporting, that's a conversation with Kelly before it is an attribute.
