# Frontend

**Owner: James.** React + TypeScript on Vite. Two screens for the proof of concept: the
grant form and outcomes by zip.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck, then production build into dist/
npm run typecheck  # types only
```

The dev server proxies `/api` to `http://localhost:3000`, so the browser sees one origin
and nobody fights CORS. To point at a deployed API, copy `.env.example` to `.env.local` and
set `VITE_API_BASE_URL`.

**The backend doesn't have to exist for this to run.** Both screens treat an unreachable
API as an expected state ("No backend yet") rather than a crash.

## Layout

```
src/
  api/client.ts        Typed client for docs/api-contract.md. All fetching goes through it.
  components/          Field inputs and the shared loading / error / empty panel.
  hooks/               useApiResource — fetch once, expose loading/error/data.
  views/
    GrantFormView      The grant form, plus the list of what's been submitted.
    OutcomesView       Outcomes by zip, plus the form that feeds it.
  types.ts             Domain types mirroring docs/api-contract.md.
  format.ts            Money, number, and date formatting.
  styles.css           Design tokens from the product deck, then plain CSS.
```

## Choices made, and when to revisit them

- **No router.** Two screens switch on local state. Add one when deep-linking to a grant
  matters — likely in phase 1, alongside a grant detail page.
- **No data-fetching library.** `useApiResource` is ~50 lines and refetches on a token
  bump after a write. Swap in TanStack Query when caching or invalidation starts hurting;
  call sites keep their shape.
- **No component library.** Plain CSS with the deck's palette. If the team wants MUI,
  Tailwind, or shadcn, decide before much is built on top of `styles.css`.
- **No test runner yet.** Vitest + Testing Library when there's logic worth pinning. The
  form's empty-string-to-`null` conversion is the first candidate.

Deliberately small, so they're cheap to overturn. What isn't cheap to overturn is the API
contract, so changes there go through a PR both owners review.

## Conventions

- Explicit types on exported functions and props; `strict` is on.
- Every API call goes through `api` in `src/api/client.ts` — no bare `fetch` in components.
- Money stays a decimal string until it's formatted for display. Don't put it in a `number`.
- A blank input submits as `null`, not `""`. Partial records are legal; empty strings
  pretending to be data are not.
- Dates are formatted with `formatDate` so a calendar date never shifts a day across time
  zones.
