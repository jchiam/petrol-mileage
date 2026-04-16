# Petrol Tracker

Self-hosted petrol mileage tracker. Replaces an Excel-based tracker with a web app covering a dashboard with trends and forecasts, and a mobile-optimised entry screen bookmarkable on a phone.

Runs on a UGREEN NAS via Docker Compose, accessible over Tailscale only.

---

## Tech Stack

| Layer         | Choice                                          |
| ------------- | ----------------------------------------------- |
| Framework     | Next.js 15 (App Router, TypeScript strict)      |
| Database      | Postgres 16 (alpine, Docker)                    |
| ORM           | Drizzle ORM                                     |
| Styling       | Tailwind CSS v4                                 |
| UI primitives | shadcn/ui                                       |
| Charts        | Recharts                                        |
| Tests         | Vitest (unit), Playwright (e2e)                 |
| Runtime       | Node.js 20 (Docker, non-root `nextjs` uid 1001) |
| Reverse proxy | Caddy (`tls internal`, Tailscale-gated)         |

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

- Docker + Docker Compose
- Node.js 20+

### Local development

```bash
# 1. Copy env file and set credentials
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD at minimum

# 2. Start Postgres with the dev port override (exposes 127.0.0.1:5432)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up db -d

# 3. Apply database migrations
npm install
npm run db:migrate

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

### Environment variables

| Variable            | Required | Description                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------ |
| `POSTGRES_USER`     | Yes      | Postgres username (used by compose + backup)                             |
| `POSTGRES_PASSWORD` | Yes      | Postgres password                                                        |
| `POSTGRES_DB`       | No       | Database name (default: `petrol_mileage`)                                |
| `DATABASE_URL`      | Yes      | Full connection string for the app and migration runner                  |
| `BACKUP_DIR`        | No       | Host path for `.sql.gz` backup files                                     |
| `PROXY_SECRET`      | Yes      | Shared secret checked by Next.js middleware; requests without it get 404 |

`DATABASE_URL` format:

- **Local dev** (host → Docker): `postgresql://petrol:<password>@localhost:5432/petrol_mileage`
- **Production** (inside Docker): `postgresql://petrol:<password>@db:5432/petrol_mileage`

---

## Database

Schema: two tables, append-only fill-ups.

```
vehicles  — id, name, make, model, year, plate, is_active
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
npm test              # run all unit tests once
npm run test:watch    # watch mode
npm run test:e2e      # run Playwright e2e tests (requires dev server)
```

Unit tests cover all stats math: KPI computation, anomaly detection (efficiency >2σ, price >15% above median), forecast bounds, rolling averages, and chart series grouping.

E2E tests cover the dashboard, log entry, import, and navigation flows.

---

## Production deployment (NAS)

```bash
# On the NAS — no dev override, no host port for DB
docker-compose up -d

# Run migrations after first deploy or schema changes
docker-compose exec app npm run db:migrate
```

Caddy snippet for the reverse proxy:

```
import /path/to/docker/Caddyfile.snippet
```

See [`docker/Caddyfile.snippet`](docker/Caddyfile.snippet) for the full block.

The snippet proxies to the Vercel deployment and injects `X-Caddy-Auth` from `$CADDY_PROXY_SECRET`. Set `CADDY_PROXY_SECRET` in Caddy's environment to the same value as `PROXY_SECRET` in Vercel's environment variables. Requests arriving at Vercel without the matching header are rejected with 404.

### Backup & restore

The `backup` sidecar runs automatically:

- Immediate backup on container start
- Daily at 03:00 SGT
- Rolling retention: 10 most recent `.sql.gz` files

To restore:

```bash
./scripts/restore.sh /path/to/backup.sql.gz
```
