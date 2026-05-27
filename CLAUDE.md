# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run unit tests (vitest)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright e2e tests
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier write
npm run format:check # Prettier check
npm run db:generate  # Generate Drizzle migrations (reads schema.ts)
npm run db:migrate   # Run pending migrations against DATABASE_URL_UNPOOLED
npm run db:studio    # Drizzle Studio UI
```

Run a single vitest file:

```bash
npx vitest run src/__tests__/stats.test.ts
```

## Environment

Copy `.env.example` to `.env`. Required at runtime:

- `DATABASE_URL` — Neon PostgreSQL pooled URL (used by the app via `@neondatabase/serverless`)
- `DATABASE_URL_UNPOOLED` — Neon direct URL (used by `db:migrate` and Drizzle Kit)
- `PROXY_SECRET` — shared secret with Caddy reverse proxy; middleware returns 404 if header `x-caddy-auth` doesn't match

## Architecture

### Stack

Next.js 15 App Router · React 19 · TypeScript · Drizzle ORM · Neon PostgreSQL · Tailwind CSS v4 · Recharts · ExcelJS · Serwist (PWA)

### Database (`src/db/`)

Two tables defined in `schema.ts`:

- `vehicles` — car records; `isCurrent` marks the active default
- `fill_ups` — individual fill events; soft-deleted via `voidedAt` / `voidReason`; partial unique index enforces no duplicate active fills

Drizzle uses the Neon **HTTP** driver (`drizzle-orm/neon-http`), not the WebSocket driver. All numeric DB columns (`petrol_l`, `mileage_km`, `cost`) are Drizzle `numeric` type and come back as **strings** — always `parseFloat()` before arithmetic.

### Pages & data flow

- `/` (dashboard) — Server Component fetches all vehicles + current vehicle fills, runs `computeStats()`, and passes serialized props to `<Dashboard>`. No waterfall.
- `/log` — Server Component fetches the current vehicle; `<LogForm>` is client-only.
- `/admin/import` — `<ImportWizard>` client component drives a two-step flow: POST to `/api/admin/parse-import` → preview → POST to `/api/import`.

Server Components pass `Date` objects serialized as ISO strings (Next.js can't pass `Date` objects as props). API routes use `export const dynamic = 'force-dynamic'`.

### Stats (`src/lib/stats.ts`)

Pure functions with no DB access — all accept `FillUp[]` arrays. Key exports:

- `computeStats(fills)` — returns `{ kpis, forecast, charts, fillsWithAnomalies }`
- `detectAnomalies(current, trailing)` — flags efficiency deviations >2σ and price >15% above trailing median
- All date helpers use **Asia/Singapore** timezone

### Import parser (`src/lib/import-parser.ts`)

Handles `.xlsx` and `.csv` via ExcelJS. Fuzzy-matches column headers (aliases defined at top of file). Skips rows with `-` or `#VALUE!` in petrol column (GrabHitch rows). Returns `ParseResult[]` or `ParseError`.

### Client–server boundary

`<Dashboard>` is a client component that holds all display state. It skips the initial stats fetch (data already in props via `skipInitialFetch` ref) and only re-fetches when the vehicle selector changes. Charts component is lazy-loaded (`next/dynamic`, `ssr: false`) because Recharts is browser-only.

### Auth / middleware

`src/middleware.ts` runs on every non-static request, checks `x-caddy-auth` header against `PROXY_SECRET` using a constant-time comparison. Returns 404 (not 401) on mismatch to avoid leaking existence.

### PWA

Serwist config in `next.config.ts`: source at `src/app/sw.ts`, output to `public/sw.js`. Service worker registered inline via `<Script>` in `layout.tsx`.

## Conventions

- `@/` path alias maps to `src/`
- Tailwind classes sorted by prettier-plugin-tailwindcss
- Import order enforced by eslint-plugin-simple-import-sort
- `src/__tests__/` contains unit tests for pure logic only (stats, import-parser)
