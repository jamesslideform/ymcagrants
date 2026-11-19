# Data model

The shape below is the proposal the frontend types and the API contract are written
against. It is not frozen — change it in a PR both sides review, then update
[`api-contract.md`](api-contract.md) and `frontend/src/types.ts` in the same change.

PostgreSQL. Surrogate `uuid` primary keys, `created_at` / `updated_at` on every table.

## Core tables

### `funder`
The organization giving the money. Separate from `grant` because funders repeat and their
reporting quirks belong in one place.

| Column | Type | Notes |
| --- | --- | --- |
| `name` | `text` | "United Way of Greater Knoxville" |
| `contact_name` | `text` | nullable |
| `contact_email` | `text` | nullable |
| `notes` | `text` | reporting preferences, portal URLs |

### `program`
A YMCA program or service a grant can pay for. Long-lived; outlives any single grant.

| Column | Type | Notes |
| --- | --- | --- |
| `name` | `text` | "Y Learning after-school" |
| `description` | `text` | nullable |
| `is_active` | `boolean` | default `true` |

### `grant`
One award. The record Kelly opens.

| Column | Type | Notes |
| --- | --- | --- |
| `funder_id` | `uuid` | → `funder` |
| `title` | `text` | |
| `award_amount` | `numeric(12,2)` | nullable — some awards land before the number does |
| `period_start` | `date` | nullable |
| `period_end` | `date` | nullable |
| `status` | `text` | `prospect`, `submitted`, `active`, `closed`, `declined` |
| `notes` | `text` | |

`grant_program` joins grants to programs (many-to-many, with an optional
`allocation_amount` when a grant is split across programs).

### `deliverable`
Something the grant requires by a date: a report, a narrative, a renewal.

| Column | Type | Notes |
| --- | --- | --- |
| `grant_id` | `uuid` | → `grant` |
| `title` | `text` | "Q1 outcomes report" |
| `due_date` | `date` | drives the dashboard's deadline list |
| `status` | `text` | `not_started`, `in_progress`, `submitted` |
| `completed_at` | `timestamptz` | nullable |

## The flexible part

### `measure_definition` — the shared library
A reusable outcome question. Defined once, attached to many grants, so "youth served"
means the same thing everywhere and can be rolled up.

| Column | Type | Notes |
| --- | --- | --- |
| `name` | `text` | "Youth served" |
| `question_text` | `text` | "How many kids were positively affected by this grant?" |
| `value_type` | `text` | `count`, `currency`, `percent`, `boolean`, `narrative` |
| `unit` | `text` | nullable — "youth", "meals", "hours" |
| `population` | `text` | nullable — a **category**, never a person |
| `is_shared` | `boolean` | `false` for one-off questions a single funder asks |

### `grant_measure` — the question this grant promised
Attaching a definition to a grant, with that grant's own target and cadence.

| Column | Type | Notes |
| --- | --- | --- |
| `grant_id` | `uuid` | → `grant` |
| `measure_definition_id` | `uuid` | → `measure_definition` |
| `program_id` | `uuid` | nullable — when the promise is program-specific |
| `target_value` | `numeric` | nullable — not every question has a target |
| `cadence` | `text` | `monthly`, `quarterly`, `annual`, `grant_term` |

### `measurement` — the answer, for one period
One recorded value. This is the table that grows.

| Column | Type | Notes |
| --- | --- | --- |
| `grant_measure_id` | `uuid` | → `grant_measure` |
| `period_start` | `date` | |
| `period_end` | `date` | |
| `numeric_value` | `numeric` | for `count` / `currency` / `percent` |
| `boolean_value` | `boolean` | for `boolean` |
| `text_value` | `text` | for `narrative` |
| `is_estimated` | `boolean` | default `false` — honesty beats precision |
| `source_note` | `text` | "DaxKo attendance export, 2026-03-31" |
| `recorded_by` | `text` | |

One typed column per value kind rather than a single `text` column: the database keeps
doing the arithmetic, and `query_outcomes` can aggregate without parsing. A check
constraint enforces that the column populated matches the definition's `value_type`.

**Partial data is legal by design.** Only `grant_measure_id` and the period are required.
A measurement with no value is a known gap the dashboard can surface, which is the honest
representation of how this data actually arrives.

### `saved_view` — a stored analysis
What makes the dashboard customizable and the MCP layer additive rather than a second
system.

| Column | Type | Notes |
| --- | --- | --- |
| `name` | `text` | "Youth outcomes by program, FY26" |
| `definition` | `jsonb` | filters, group-by, metric, chart type |
| `created_by` | `text` | a staff member, or `claude` |
| `is_pinned` | `boolean` | pinned views render on the dashboard |

A saved view is a **query definition, not a screenshot**. The app renders it; the MCP
server writes the same object. Neither side gets a private path to the data.

## Privacy

No table above stores a client name, address, date of birth, or case detail. `population`
is a category ("youth 6–12", "seniors"), and measurements are counts and percentages. If a
funder ever demands client-level reporting, that's a conversation with Kelly and a separate
system — not a column added here.
