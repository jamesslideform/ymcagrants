# Frontend

React + TypeScript on Vite. Grant entry, the leadership dashboard, and (phase 3) saved
views.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck, then production build into dist/
npm run typecheck  # types only
```

The dev server proxies `/api` to `http://localhost:3000`, so the browser sees one origin
and nobody fights CORS. Point the app at a deployed API by copying `.env.example` to
`.env.local` and setting `VITE_API_BASE_URL`.

**The backend doesn't exist yet, and that's fine.** Every screen handles an unreachable API
as an expected state rather than a crash, so this runs from a clean clone today.

## Layout

```
src/
  api/client.ts        Typed client for docs/api-contract.md. All fetching goes through it.
  components/          Shared presentational pieces.
  hooks/               useApiResource — fetch once, expose loading/error/data.
  views/               One file per screen: DashboardView, GrantsView.
  types.ts             Domain types mirroring docs/data-model.md.
  format.ts            Money, number, and date formatting.
  styles.css           Design tokens from the product deck, then plain CSS.
```

## Choices made, and when to revisit them

- **No router.** Two screens switch on local state. Add one (React Router or TanStack
  Router) when deep-linking to a grant matters — likely during phase 1.
- **No data-fetching library.** `useApiResource` is ~40 lines. Swap in TanStack Query when
  caching or invalidation starts hurting; call sites keep their shape.
- **No component library.** Plain CSS with the deck's palette. If the team wants MUI,
  Tailwind, or shadcn, decide in hour one and replace `styles.css` before much is built on
  top of it.
- **No test runner yet.** Vitest + Testing Library is the natural fit when there's logic
  worth pinning — outcome progress math and CSV import mapping are the first candidates.

These are deliberately small so they're cheap to overturn. What isn't cheap to overturn is
the API contract, so changes there go through a PR both sides review.

## Conventions

- Explicit types on exported functions and props; `strict` is on.
- Every API call goes through `api` in `src/api/client.ts` — no bare `fetch` in components.
- Money stays a decimal string until it's formatted for display. Don't put it in a `number`.
- Dates are formatted with `formatDate` so a calendar date never shifts a day across time
  zones.
