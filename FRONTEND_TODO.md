# Frontend status, architecture, and TODO

Working notes for the frontend prototype. **Owner: James.** Updated 2026-11-19.

On `main` — `initiatives/frontend_0_1` was merged (#3) and deleted.

---

## Deployed

**https://ymca-grants-outcomes.redeep.dev** — unlisted, so the link works for anyone who has
it but it isn't advertised. The full link including the `?share=` token is what test users
need; it sets a cookie on first visit.

It runs the **stub API**, so: the seven grants are fictional, anything a tester enters is
gone on reload, and nothing is shared between testers. Good for "is this screen
understandable", useless for real data entry. Say so when you send the link.

**Send the whole URL including `?share=`.** The token sets a cookie on first visit; a bare
deep link like `…/#/grants/g-1001` fails for anyone who hasn't been through it once. After
that first visit, deep links work normally.

Redeploy after a change:

```bash
cd frontend && npm run build:demo
redeepctl publish ./dist --target managed \
  --id 53070C68-BEC9-4052-89FA-AAF38DAB6604 \
  --name "YMCA Grants & Outcomes" --kind page --entry index.html --visibility unlisted
```

**`build:demo`, not `build`.** Vite bakes `VITE_API_MODE` in at build time, so a
plain `npm run build` on a machine that has a live `.env.local` would ship a
tester site pointed at someone's local backend — measured, not theoretical.
`build:demo` forces the stub regardless of local env files.

Pass `--id` or it publishes a second site. Versions are retained (up to 5);
`redeepctl deployments rollback <id> <version>` goes back.

## Status

**Working today, against a stub API with example data.** No login — the prototype runs as
the grants manager. Every screen below is clickable end to end: add a grant and it shows up
in the list, the overview totals, and the recent list; record an outcome and the by-zip
rollup moves.

| Screen | Route | State |
| --- | --- | --- |
| Overview | `/` | Built — funding tiles, grants by status, deadlines, outcomes by zip, recently added |
| Grants list | `/grants` | Built — status filter + search, both held in the URL |
| Grant detail | `/grants/:grantId` | Built — terms, deadline, every outcome on the grant |
| New grant | `/grants/new` | Built — redirects to the new grant's detail page |
| Record outcome | `/outcomes/new` · `/grants/:grantId/outcomes/new` | Built — grant pre-filled when reached from a grant |
| Outcomes | `/outcomes` | Built — by-zip rollup plus all records |
| Not found | `*` | Built |

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

### Verified

- `tsc --noEmit` and the production build pass.
- 19 checks over the stub API through the real client: overview aggregates, status filter,
  search, grant detail with embedded outcomes, 404 on a missing grant, 422 on an empty
  grant, create-then-appears-in-list, create-then-overview-updates, new zip row appears,
  outcome rejected against an unknown grant.
- All 8 routes render without throwing.
- **Seen in a real browser**, on the deployed URL: the overview renders correctly (tiles,
  status bars, the overdue deadline flagged, outcomes by zip, footer lockup), and a cold
  load of `/#/grants/g-1001` resolves to the grant detail with both its outcomes. Console
  clean on both.
- **Also seen in a browser** since: the outcomes column sort, clicking a zip to filter and
  clicking it again to clear, and the grants list filtered to `?status=declined`.
- **Still unseen in a browser:** submitting either form, the grants-list search box, mobile
  widths, and keyboard navigation. The stub-API checks cover the form logic, but nobody has
  watched a browser do it.

---

## Architecture

```
pages/            One file per screen. Data in, markup out.
components/       Field, SelectField, TextAreaField, StatusBadge, StateMessage.
hooks/            useApiResource — fetch on mount, expose loading/error/data.
api/client.ts     The only place fetch is called. Typed against docs/api-contract.md.
types.ts          Domain types. Mirrors the contract.
format.ts         Money, number, and date formatting.
mocks/            The stub API. Deleted at migration.
styles.css        Design tokens from the product deck, then plain CSS.
```

**Rule:** no component calls `fetch` directly. Everything goes through `api` in
`src/api/client.ts`, which is why swapping the stub for Mike's backend touches no page.

### How the stub works

`src/mocks/mockServer.ts` patches `globalThis.fetch` and answers `/api/*` from an in-memory
store seeded by `src/mocks/fixtures.ts`. Anything that isn't `/api` falls through to the
real network.

This sits at the **fetch layer on purpose** rather than inside the client: the app runs its
real request code — URL building, status handling, the error envelope, JSON parsing — so
the migration can't surprise us with a code path that was never exercised. It also means
POSTs are stateful for the browser session, which is what makes the demo feel real.
Reloading resets to the fixtures.

### Which API is live, and the fallback

`src/api/mode.ts` decides once at startup and announces it in the console. **The
stub is the default and the fallback**: live needs an explicit
`VITE_API_MODE=live`, which in practice means someone has their own
`frontend/.env.local` with their backend config and AWS credentials. Measured
behaviour, all six cases:

| `.env.local` | Build | Result |
| --- | --- | --- |
| absent | `build` | **stub** |
| `VITE_API_MODE=live` | `build` | live |
| `VITE_API_MODE=live` | `build:demo` | **stub** |
| `VITE_API_MODE=Live` (typo) | `build` | **stub**, and warns |
| present, no mode line | `build` | **stub** |
| `VITE_API_MODE=` (empty) | `build` | **stub** |

It falls *back* rather than forward on purpose: the stub leaves a working app
full of sample data, while a half-configured live mode leaves a dead one, and
whoever is looking at it usually can't tell "misconfigured" from "broken".

### Migrating to Mike's backend

1. Set `VITE_API_MODE=live` in `frontend/.env.local` (gitignored; holds your own
   backend config — never commit it).
2. Set `API_PROXY_TARGET` there too if the API isn't on `localhost:3000`; the
   dev proxy keeps an API Gateway stage path, so `/api/grants` reaches
   `/prod/api/grants`.
3. When the stub is no longer wanted at all, delete `src/mocks/` and its import
   in `main.tsx`.

That's the whole migration on this side. No page, hook, or client change — provided the
backend matches `docs/api-contract.md`. Do it one endpoint at a time if useful: the stub
only answers routes it recognizes, so anything unimplemented 404s loudly rather than
silently returning fake data.

---

## For Mike — contract changes made here

Both are in `docs/api-contract.md` already; flagging them so they aren't a surprise.

1. **`status` is back on the grant** (`prospect | submitted | active | closed | declined`).
   The overview is built around the status breakdown, so it can't be derived. Required on
   create; the form defaults to `prospect`.
2. **`GET /api/overview` is new.** One request returning what the landing page needs:
   totals, status counts, people served, top zips, upcoming deadlines, recent grants. It's
   all derivable from grants + outcomes, so it can start as an in-handler aggregate. The
   alternative — four round trips from the browser — makes the first screen Kelly sees the
   slowest one.

---

## TODO

### Decisions waiting on James
- [ ] **Do declined grants belong in the overview totals?** The breakdown no longer lists
      Declined, but the header still says "7 grants tracked" and "funding requested"
      still includes the declined grant's $12,000 — so the visible status rows sum to 6
      while the tiles count 7. Either is defensible; right now it's neither, and someone
      adding up the bars will notice. Changing what a money tile means is a product call,
      which is why it wasn't folded into the hide-Declined change.
- [ ] **Font.** The YMCA brand guide specifies Cachet Pro, falling back to Verdana. The app
      uses Avenir Next. Cachet Pro is licensed and not bundled, and Verdana would
      noticeably coarsen the UI — so this is a deliberate deviation that someone should
      either bless or overrule before funder-facing output.

### Next up
- [ ] Click the **forms** through in a real browser — add a grant, record an outcome, use the
      search box. The overview, grant detail, outcomes sort/filter, and the grants status
      filter have been checked; these have not.
- [ ] Edit a grant (`/grants/:grantId/edit`) — right now a typo means re-creating it.
- [ ] Empty state for a brand-new install: zero grants should read as a welcome, not a bug.
- [ ] Form validation before submit — currently the stub rejects and we surface the error,
      which is correct but late. Required-field hints on blur.
- [ ] Loading skeletons instead of "Loading…" text on the overview.

### Before anyone demos it
- [ ] Keyboard pass: focus rings on chips and nav, tab order through the forms.
- [ ] Mobile width — the tables need a horizontal scroll container below ~700px.
- [ ] Decide whether the demo runs on the stub or the real backend, and rehearse that one.

### After the backend lands
- [ ] Migrate per the steps above, one endpoint at a time.
- [ ] Optimistic updates, or at least keep the form filled when a save fails.
- [ ] Pagination once the grant list outgrows one screen (`{ items, total }` already allows it).

### Deferred, named so they stay decisions
- [ ] **Auth.** No login by design for the prototype. When it lands, the route guard goes in
      `App.tsx` and the token goes in the `request()` helper in `client.ts` — nowhere else.
- [ ] **Deliverables as records.** Today a grant has one `dueDate`. Real grants have several
      deliverables with their own dates; that's a backend model change first.
- [ ] **Funders and programs as records**, instead of free text on the grant.
- [ ] **Flexible outcome measures** — the deck's measure library, replacing today's six
      fixed outcome fields. The big one. See `docs/data-model.md`.
- [ ] **Saved views and the MCP layer** — phases 3 and 4 in the README.
- [ ] **Export** to CSV/PDF for funder reports.
- [ ] **Tests.** No runner yet. When Vitest goes in, start by pinning the stub-API checks
      listed under Verified — they're written and were thrown away to avoid a half-wired
      test setup.

---

## Decisions

| Decision | Why | Revisit when |
| --- | --- | --- |
| React Router | Kelly needs to bookmark and share a grant URL; the back button has to work | — |
| **Hash** routing, not history | Redeep's managed static hosting has no SPA fallback — measured 2026-11-19: publishing with `--spa` still 404s `/grants` and `/nope`. With history routing a tester who refreshes anywhere but `/`, or opens a shared grant link, gets a 404. Hashing keeps every request at `/`. Cost is the `#` in `/#/grants/g-1001` | Moving to a host that rewrites unknown paths to `index.html` — then switch back in `main.tsx` |
| Stub at the fetch layer, not in the client | Exercises the real request path, so migration holds no surprises | Migration day |
| Filters live in the URL (`/grants?status=active`) | A filtered list is shareable, and the back button behaves | — |
| `useApiResource` over TanStack Query | ~50 lines, no dependency, enough for 7 screens | Caching or invalidation starts hurting |
| Plain CSS with deck tokens | No framework to fight during a hackathon | Someone wants a component library — decide before much is built on it |
| Money as decimal strings | Floats lose cents; formatting happens at the edge | — |
| Blank input saves as `null`, not `""` | Partial records are legal; empty strings pretending to be data are not | — |
