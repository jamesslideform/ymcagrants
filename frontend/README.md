# Frontend

**Owner: James.** React + TypeScript on Vite, with React Router.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck, then production build into dist/
npm run typecheck  # types only
```

**It runs with no backend.** A stub API in `src/mocks/` answers `/api` from memory with
example data, so every screen works from a clean clone. Status, architecture, and the
migration plan live in [`../FRONTEND_TODO.md`](../FRONTEND_TODO.md) — read that first.

No login: the prototype runs as the grants manager.

## Screens

| Route | Screen |
| --- | --- |
| `/` | Overview — funding, grants by status, deadlines, outcomes by zip |
| `/grants` | All grants, filter by status, search name and funder |
| `/grants/new` | Add a grant |
| `/grants/:grantId` | One grant and every outcome on it |
| `/grants/:grantId/outcomes/new` | Record an outcome, grant pre-filled |
| `/outcomes` | By-zip rollup and all records |
| `/outcomes/new` | Record an outcome |

## Layout

```
src/
  pages/           One file per screen.
  components/      Field, SelectField, TextAreaField, StatusBadge, StateMessage.
  hooks/           useApiResource — fetch on mount, expose loading/error/data.
  api/client.ts    The only place fetch is called. Typed against docs/api-contract.md.
  mocks/           The stub API. Deleted at migration.
  types.ts         Domain types mirroring the contract.
  format.ts        Money, number, and date formatting.
  styles.css       Design tokens from the product deck, then plain CSS.
```

## Switching to the real backend

Set `VITE_API_MODE=live` in `.env.local`, check the proxy target in `vite.config.ts`, then
delete `src/mocks/` and its import in `main.tsx`. Nothing else changes — the stub answers
at the `fetch` layer, so the app already runs its real request code.

Point at a deployed API instead with `VITE_API_BASE_URL`.

## Conventions

- Explicit types on exported functions and props; `strict` is on.
- Every API call goes through `api` in `src/api/client.ts` — no bare `fetch` in a component.
- Money stays a decimal string until it's formatted. Don't put it in a `number`.
- A blank input submits as `null`, not `""`. Partial records are legal; empty strings
  pretending to be data are not.
- Dates are formatted with `formatDate` so a calendar date never shifts a day across time
  zones.
- Filters belong in the URL, so a filtered view can be shared.
- Outcomes hold counts and categories. Never a client name, address, or case detail.
