# Home Expense Tracker (HomeLedger)

A household expense app that replaces the Excel sheet: quick daily entry, an always-correct balance, monthly Home budgets, yearly shopping budgets per family member, a spreadsheet-style ledger, analytics, Excel/CSV export and import, and an installable PWA.

**Stack:** Next.js 16 (App Router) Â· TypeScript Â· Tailwind CSS 4 Â· shadcn-style components on Radix Â· TanStack Table Â· Recharts Â· React Hook Form + Zod Â· Prisma Â· PostgreSQL (Neon) Â· SheetJS.

## Getting started

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and JWT_SECRET
npm run db:push               # create / update the database schema
npm run seed                  # optional: sample data (development only)
npm run dev
```

Open http://localhost:3000. With no account yet, **Create an account** and the setup wizard asks for the household name, currency, Home categories, shopping members and yearly budgets. With seed data, sign in with username `demo` and password `demo-password`.

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build, serve |
| `npm test` | Financial calculation tests (balances, budgets, years, months, validation) |
| `npm run typecheck` / `lint` | Static checks |
| `npm run db:push` | Apply `prisma/schema.prisma` to the database |
| `npm run seed` | Seed an **empty** database; `npm run seed -- --reset` wipes everything first. Refuses to run when `NODE_ENV=production`. |

### Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes in production | Random string, at least 32 characters (`openssl rand -base64 48`) |
| `SIGNUP_ENABLED` | no | Sign-up is only open while there are no users. Set to `true` to allow more accounts (each gets its own private household). |

Never commit `.env`. It is already ignored by git.

## How the numbers work

- **Money** is stored as `NUMERIC(14,2)` and every calculation uses integer paisa, never floating point (`src/lib/money.ts`).
- **Dates** are stored as Postgres `DATE` and handled as `YYYY-MM-DD` strings, so a record for October 1 can never show up on September 30 (`src/lib/dates.ts`). "Today" and "this month" use the household timezone (default `Asia/Karachi`).
- **Balance** = starting balance + money received âˆ’ expenses. It is never stored: the dashboard sums it, and the ledger computes a running balance per row with a Postgres window function (`src/server/queries/ledger.ts`).
- **Shopping budget remaining** = that member's budget **for that year** âˆ’ their shopping in that year. Budgets live in `ShoppingBudget(memberId, year)`, so changing next year never changes history.
- **Home budget** = each category's expected monthly amount âˆ’ that month's spending.
- Editing or deleting anything refreshes every page, because all totals are derived from transactions. The pure calculation code lives in `src/lib/calculations.ts` and is covered by `tests/`.

## Project layout

```
prisma/            schema + development seed
src/proxy.ts       blocks signed-out access to pages and APIs
src/server/        server-only: auth, db, queries, server actions, export builder
src/lib/           shared, pure: money, dates, calculations, validation (zod), backup format
src/components/    ui/ (primitives), ledger/ (domain), forms/, charts/, app/ (shell, offline sync)
src/app/(auth)     login, signup
src/app/onboarding first-run setup
src/app/(app)      dashboard, home, shopping, outing, records, analytics, export, settings/*
src/app/api/export Excel / CSV / JSON downloads
public/sw.js       service worker (app shell + previously visited pages offline)
tests/             node:test suites
```

## Security

- Passwords are bcrypt-hashed. Sessions are signed, `httpOnly` cookies verified on every request.
- Every query and server action takes the household from the session, never from the browser, so IDs from another household do nothing.
- Inputs are validated with zod on the server. Users see friendly messages; errors are logged only on the server.
- Signing out also clears the offline page cache on the device.

## Offline & PWA

Install from the browser ("Add to Home Screen" on iPhone, or the install button on Android and desktop). Pages you have opened stay available offline. Expenses and money received entered offline are saved on the device and synced automatically when the connection returns. Each one carries a unique ID, so syncing twice can never create duplicates.

## Import & backup

- **Import** (Export page): choose Home, Shopping or Outing, upload a CSV or Excel file, match the columns, check the rows (invalid rows are listed with the reason), then confirm. Nothing is written before you confirm.
- **Backup**: a JSON file with every transaction, category, member, yearly budget and setting. **Restore** (Settings â†’ Data Management) shows what's inside and asks you to type `RESTORE` before replacing anything.

## Future: recurring expenses

The schema is ready for a `RecurringExpense` template table (category, amount, day of month, `enabled = false` by default). Generated rows would be ordinary expenses, and nothing is inserted automatically unless the feature is turned on.
