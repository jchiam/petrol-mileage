# Petrol Tracker

Self-hosted petrol mileage tracker. Replaces an Excel-based tracker with a web app covering a dashboard with trends and forecasts, and a mobile-optimised entry screen bookmarkable on a phone.

Hosted on Vercel with a Neon PostgreSQL database, fronted by a Caddy reverse proxy on a UGREEN NAS so it is accessible over Tailscale only.

---

## Tech Stack

| Layer         | Choice                                            |
| ------------- | ------------------------------------------------- |
| Framework     | Next.js 15 (App Router, TypeScript strict)        |
| Database      | Neon PostgreSQL (serverless HTTP driver)          |
| ORM           | Drizzle ORM                                       |
| Styling       | Tailwind CSS v4                                   |
| UI primitives | shadcn/ui                                         |
| Charts        | Recharts                                          |
| PWA           | Serwist (service worker, asset caching)           |
| Tests         | Vitest + Testing Library (unit), Playwright (e2e) |
| Hosting       | Vercel (auto-deploys `master` + PR previews)      |
| Reverse proxy | Caddy (`tls internal`, Tailscale-gated)           |

---

## Screens

| Route           | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| `/`             | Dashboard — KPI tiles, trend charts, forecast card, recent fills table, vehicle comparison |
| `/log`          | Mobile entry — thumb-friendly form, bookmarkable as PWA                                    |
| `/admin/import` | Bulk import from `.xlsx` / `.csv` — drag-drop, auto-detect sheet, per-row preview          |

---

## Getting Started

### Prerequisites

- Node.js 24+
- A Neon PostgreSQL project (free tier works)

### Local development

```bash
# 1. Copy env file and set credentials
cp .env.example .env
# Edit .env — set DATABASE_URL, DATABASE_URL_UNPOOLED and PROXY_SECRET

# 2. Apply database migrations
npm install
npm run db:migrate

# 3. Start the dev server
npm run dev
# → http://localhost:3000
```

### Environment variables

| Variable                | Required | Description                                                              |
| ----------------------- | -------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`          | Yes      | Neon pooled connection string, used by the app at runtime                |
| `DATABASE_URL_UNPOOLED` | Yes      | Neon direct (unpooled) connection string, used by migrations/Drizzle Kit |
| `PROXY_SECRET`          | Yes      | Shared secret checked by Next.js middleware; requests without it get 404 |

Both URLs come from the Neon console (pooled vs direct endpoint of the same database).

---

## Database

Schema: two tables, append-only fill-ups.

```
vehicles  — id, name, make, model, year, plate, is_active, is_current
fill_ups  — id, vehicle_id, pump_date, petrol_l, mileage_km, cost, voided_at, void_reason
```

Derived metrics (`km/L`, `$/km`, `$/L`, `L/100km`) are **never stored** — computed on read.
Corrections use a void-and-re-enter flow; voided rows are retained for audit.

```bash
npm run db:generate   # generate migration SQL from schema changes
npm run db:migrate    # apply pending migrations
npm run db:studio     # open Drizzle Studio (DB browser)
```

---

## Testing

```bash
npm test               # run all unit tests once
npm run test:watch     # watch mode
npm run test:e2e       # Playwright e2e (builds a production bundle first via pretest hook)
npm run test:e2e:ui    # Playwright UI mode
npm run test:e2e:debug # Playwright debug mode
```

Unit tests cover all stats math (KPI computation, anomaly detection — efficiency >2σ, price >15% above median — forecast bounds, rolling averages, chart series grouping) plus component tests with Testing Library for the dashboard tiles, fills table, void dialog, log form, import wizard, and navigation.

E2E tests run against a production build (no dev server needed) with all server state mocked, covering the dashboard, log entry, import, and navigation flows. CI runs them in the official Playwright container.

---

## Production deployment (Vercel + Neon)

Deployment is handled by Vercel's GitHub integration — pushes to `master` deploy to production and pull requests get preview deployments. CI (lint, format, types, unit tests, build, audit, e2e) runs separately on GitHub Actions.

Set `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `PROXY_SECRET` in Vercel's environment variables.

Migrations are run locally against the Neon direct endpoint:

```bash
npm run db:migrate   # uses DATABASE_URL_UNPOOLED
```

Caddy snippet for the reverse proxy (runs on the NAS, gated by Tailscale):

```
import /path/to/docker/Caddyfile.snippet
```

See [`docker/Caddyfile.snippet`](docker/Caddyfile.snippet) for the full block.

The snippet proxies to the Vercel deployment and injects `X-Caddy-Auth` from `$CADDY_PROXY_SECRET`. Set `CADDY_PROXY_SECRET` in Caddy's environment to the same value as `PROXY_SECRET` in Vercel's environment variables. Requests arriving at Vercel without the matching header are rejected with 404.

### Backup & restore

Database backups are handled by Neon (history retention / point-in-time restore in the Neon console).

The previous self-hosted NAS stack (`docker-compose.yml`, `docker/`, `scripts/backup.sh`, `scripts/restore.sh`) is retained in the repo for reference but is no longer the deployment target.
