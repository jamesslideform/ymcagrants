# YMCA Grants & Outcomes Tracker

One place where every grant, the programs it pays for, and the outcomes it promised live
together — and can be analyzed without opening Excel.

Built for the **YMCA of East Tennessee** at Hack for Nonprofits 2026.

---

## The problem

Grant funding currently lives in three places that don't talk to each other: an Excel
spreadsheet (award amount, funder, grant period), DaxKo (membership and service
utilization, mostly for the gym), and a scatter of files, inboxes, and staff memory
(requirements, deadlines, deliverables, outcomes). Every funder report is reassembled by
hand, and nothing connects a grant to the program it funds or the outcome it promised.

## What we're building

| Pillar | What it means |
| --- | --- |
| **Record** | Grants, funders, periods, reporting deadlines, deliverables, and the programs each grant supports. |
| **Measure** | Outcome questions defined per grant, answered period by period, rolled up across the portfolio. |
| **Show** | A leadership dashboard with real defaults, custom views staff can save, and an MCP server so Claude can help analyze. |

**Scale to design for:** one or two staff users at a time; hundreds of grants and thousands
of measurements. Optimize for clarity and fast data entry, not throughput.

## What "done" looks like

1. Every active grant in one record — amount, period, deadlines, deliverables, program.
2. Funding tied to what it bought — each grant links to its programs and outcome measures.
3. Leadership can look without asking — one dashboard, no request to staff.
4. Reports take minutes, not days — filtered, reviewed, and exported from the app.

Each goal is also the acceptance test for a roadmap phase.

---

## The one design decision that matters

Every funder asks a different outcome question — "how many kids were positively affected?",
"meals served", "percent of participants reporting improved wellbeing" — and the next grant
will ask one we haven't seen.

**So outcome questions are data, not columns.** Adding one is a form a grants manager fills
out, never a migration a developer ships.

```
Grant ──funds──▶ Program ──promises──▶ Outcome measure ──answered by──▶ Measurement
```

An outcome measure holds its question text, type (count / currency / percent / yes-no /
narrative), target, cadence, and the population it counts. Measurements are values recorded
against a measure for a reporting period. Common measures live in a shared library so
"youth served" means the same thing in every grant and can be rolled up across all of them.

See [`docs/data-model.md`](docs/data-model.md) for the tables, and
[`docs/api-contract.md`](docs/api-contract.md) for the endpoints both sides code against.

---

## Repository layout

```
frontend/   React + TypeScript + Vite. Grant entry, dashboard, saved views.
backend/    API + PostgreSQL. Tech choice is the backend owner's call (Node + AWS expected).
docs/       Product deck, the YMCA requirements packet, data model, API contract.
```

The frontend and backend are deliberately separate deployables that meet at one HTTP
contract. Nothing in `frontend/` imports from `backend/`.

## Getting started

**Frontend**

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to localhost:3000
```

**Backend**

Not scaffolded yet — see [`backend/README.md`](backend/README.md) for the contract it needs
to satisfy and the environment variables the frontend expects.

Until the backend exists, the frontend runs against its API client stub and shows empty
states rather than crashing.

## Roadmap

Four phases, each one ends in something demo-able.

| Phase | Scope | Demo |
| --- | --- | --- |
| **1 · Foundation** | Schema and migrations. Grants, funders, periods, deadlines, deliverables. | Kelly enters a real grant and finds it again. |
| **2 · Outcomes engine** | Measure library, per-grant targets, measurements by period, CSV import. | 412 youth served lands against a target of 350. |
| **3 · Dashboard** | Default leadership view, filters, group-by, saved views, CSV and PDF export. | The leadership screen, with real grants on it. |
| **4 · MCP layer** | Tool surface over the same API, query builder, views written by Claude. | Ask a question in Claude; the chart appears in the app. |

After the weekend: accounts and roles, deadline reminders, a scheduled DaxKo import, and a
named owner for hosting.

## Constraints we design around

These come from the YMCA packet and are design rules, not disclaimers.

- **Client privacy.** Social work detail stays out of this system. Store counts and
  categories, not cases. Keep identifying fields to the minimum that still answers the
  funder's question.
- **Staff time.** Data entry happens between other jobs. Templates, sensible defaults, CSV
  import, and nothing retyped from what DaxKo already knows.
- **Imperfect data.** Partial records must save. "Unknown" is a valid answer. Flag gaps on
  the dashboard instead of blocking the form.
- **Budget and handoff.** Boring, cheap hosting. Export everything. Assume whoever
  maintains this in a year was not at the hackathon.

## How we work

- `main` stays deployable. Branch per change: `phase-1/grant-crud`, `fix/deadline-tz`.
- Pull requests, even small ones — they're how the three of us stay in sync over a weekend.
- The schema and [`docs/api-contract.md`](docs/api-contract.md) are the shared agreement.
  Change them in a PR that both sides review, not in passing.
- Seed data lives in the repo so everyone develops against the same three real-ish grants.

## Open questions for Kelly

- Which five grants should we model first?
- Which outcome questions and reports do the top funders require?
- What can we export from DaxKo, and in what format?
- Who owns the app after the weekend, and where does it run?

## Team

| Role | Who |
| --- | --- |
| Product | James Horey |
| YMCA team lead | Kelly Martin |
| Frontend | TBD |
| Backend | TBD |
