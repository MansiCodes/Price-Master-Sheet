# Cable Junction Ops

Monorepo: **Price Sheet** (Google Sheets rates) + **Plant P&L** (Postgres daily entry & live P&L).

## Apps

- `apps/web` — Next.js 15 (Auth.js, Prisma, Plant forms, P&L, Price Sheet UI)

## Setup

```bash
cd apps/web
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, SUPER_ADMIN_PASSWORD, Google Sheets vars
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000 — login with Super Admin from `.env`.

## Modules

| Path | Who |
|------|-----|
| `/` | Module home (Plant P&L / Price Sheet) |
| `/plants/[id]/today` | Accountant daily checklist |
| `/plants/[id]/purchase` etc. | Daily forms |
| `/plants/[id]/pnl` | Live P&L |
| `/price-sheet` | Cable rates (ACL) |
| `/admin/*` | Plants, completion, export, audit, punctuality |

## Cron

`GET /api/cron/daily-reminders` with `Authorization: Bearer $CRON_SECRET` (scheduled 16:00 UTC ≈ 9:30 PM IST).

## Vercel

In the existing project (`price-master-sheet`), set **Root Directory** to `apps/web`.

Add env vars from `apps/web/.env.example` (at minimum: `DATABASE_URL`, `AUTH_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, Google Sheets vars, `CRON_SECRET`).

After first deploy with `DATABASE_URL` set, run locally once:

```bash
cd apps/web
npx prisma db push
npm run db:seed
```

(Or use a one-off Vercel / Neon SQL + seed from CI.)
