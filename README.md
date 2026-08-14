# Cable Junction Ops

Single Next.js 15 app: **Price Sheet** (Google Sheets rates) + **Plant P&L** (Postgres daily entry & live P&L).

## Project Directory Layout

```
Price-master-sheet/
├── src/                   # Application source (App Router, components, lib, API routes)
│   ├── app/               # Pages and Route Handlers
│   ├── components/        # UI, shell, dashboard, today, admin
│   ├── hooks/
│   ├── lib/               # Prisma, RBAC, sheets rates, P&L, audit
│   └── types/
├── prisma/                # Database schema & seed
├── public/
├── credentials/           # Local Google service-account credentials
├── docker-compose.yml     # Local PostgreSQL
├── .env                   # Environment configuration
└── package.json
```

## Environment (.env) Setup

Copy `.env.example` to `.env` and fill in values. Next.js and Prisma load this file from the project root.

## Setup & Running

```bash
cp .env.example .env
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

Use the repository root as the project root (not `apps/web`).

Add env vars from `.env.example` (at minimum: `DATABASE_URL`, `AUTH_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, Google Sheets vars, `CRON_SECRET`).

After first deploy with `DATABASE_URL` set, run locally once:

```bash
npx prisma db push
npm run db:seed
```
