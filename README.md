# YMCA Grants & Outcomes Tracker

One place where every grant, the programs it pays for, and the outcomes it promised live
together — and can be analyzed without opening Excel.

Built for the **YMCA of East Tennessee** at Hack for Nonprofits 2026.

| Role | Who |
| --- | --- |
| Product | James Horey |
| Frontend | James Horey |
| Backend | Mike |
| YMCA team lead | Kelly Martin |

---

## Today: a working proof of concept

The whole product is in the deck. **Today we build the two screens on the kickoff
whiteboard**, end to end, on real infrastructure:

1. **Grant form** — name, funder, submission date, start, length, due date, amount
   requested, amount received. Submit writes to DynamoDB.
2. **Outcomes by zip** — record an outcome against a grant (people served, social status,
   locale, description of funding, result), and read the totals back grouped by zip code.

A narrow slice that actually works beats a broad one that doesn't. Everything else —
the flexible measure library, saved views, the MCP layer, CSV import, auth — is deferred
and listed under [Roadmap](#roadmap).

## The problem

Grant funding currently lives in three places that don't talk to each other: an Excel
spreadsheet (award amount, funder, grant period), DaxKo (membership and service
utilization, mostly for the gym), and a scatter of files, inboxes, and staff memory
(requirements, deadlines, deliverables, outcomes). Every funder report is reassembled by
hand, and nothing connects a grant to the program it funds or the outcome it promised.

## Architecture

```
 Grant form ─┐
             ├─▶  API (Node on AWS)  ──▶  DynamoDB
 Outcome form┘              ▲                 │
                            └── outcomes by zip ◀┘
```

- **Frontend** — React + TypeScript on Vite. Talks to one API, over `/api`.
- **Backend** — Node on AWS, owned by Mike. DynamoDB is the system of record.
- **One table, two item types.** A grant and the outcomes reported against it share a
  partition, so they come back in one query. A secondary index serves "all grants" and
  "outcomes in this zip."

Details in [`docs/data-model.md`](docs/data-model.md) and
[`docs/api-contract.md`](docs/api-contract.md). Those two documents are the agreement
between the frontend and the backend — change them in a PR both owners review.

## Repository layout

```
frontend/   React + TypeScript + Vite. Grant form, outcomes by zip.  (James)
backend/    Node + AWS + DynamoDB. Six endpoints.                    (Mike)
docs/       Product deck, YMCA requirements packet, data model, API contract.
```

The frontend and backend are separate deployables that meet at one HTTP contract. Nothing
in `frontend/` imports from `backend/`.

## Getting started

**Frontend**

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to localhost:3000
```

**Backend**

See [`backend/README.md`](backend/README.md) for the contract, the environment variables,
and the decisions to make first.

Until the backend answers, the frontend shows "No backend yet" on each screen instead of
crashing — so it runs from a clean clone today.

## What "done" looks like

The product goals from the packet. The PoC is a first pass at 1 and 2.

1. Every active grant in one record — amount, period, deadlines, program.
2. Funding tied to what it bought — each grant links to the outcomes it promised.
3. Leadership can look without asking — one dashboard, no request to staff.
4. Reports take minutes, not days — filtered, reviewed, exported from the app.

## Roadmap

| Phase | Scope | Demo |
| --- | --- | --- |
| **0 · Proof of concept (today)** | Grant form, outcome form, outcomes by zip, on DynamoDB. | Submit a grant, record an outcome, watch the zip totals change. |
| **1 · Foundation** | Deliverables and deadlines, grant detail and edit, seed data, real validation. | Kelly enters a real grant and finds it again. |
| **2 · Outcomes engine** | Measure library so outcome questions are data, not fixed fields. Targets, cadence, CSV import. | 412 youth served lands against a target of 350. |
| **3 · Dashboard** | Leadership view, filters, group-by, saved views, export. | The leadership screen, with real grants on it. |
| **4 · MCP layer** | Tool surface over the same API, query builder, views written by Claude. | Ask a question in Claude; the chart appears in the app. |

Phase 2 is where the deck's core design decision lands: today's six fixed outcome fields
become a measure library, so a new funder question is a form entry rather than a code
change. Worth doing early — "how many kids were positively affected?" is one funder's
phrasing of a question the next funder will ask differently.

## Constraints we design around

From the YMCA packet. Design rules, not disclaimers.

- **Client privacy.** Social work detail stays out of this system. Store counts and
  categories, not cases. `socialStatus` is a category like "youth 6-12"; outcome records
  describe a group in a zip code, never a person.
- **Staff time.** Data entry happens between other jobs. Sensible defaults, nothing
  retyped from what DaxKo already knows.
- **Imperfect data.** Partial records must save. Only name and funder are required on a
  grant. Flag gaps instead of blocking the form.
- **Budget and handoff.** Boring, cheap hosting. Export everything. Assume whoever
  maintains this in a year was not at the hackathon.

## How we work

- `main` stays deployable. Branch per change: `poc/grant-form`, `fix/zip-grouping`.
- Pull requests, even small ones — they're how the three of us stay in sync over a weekend.
- The data model and API contract are the shared agreement. Change them in a PR, not in
  passing.
- Seed data lives in the repo so everyone develops against the same grants.

## Open questions for Kelly

- Which five grants should we model first?
- Which outcome questions and reports do the top funders require?
- What can we export from DaxKo, and in what format?
- Who owns the app after the weekend, and where does it run?
