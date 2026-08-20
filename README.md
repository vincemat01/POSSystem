# Kompass POS

Smart POS & business management for South African small businesses. Mobile-first,
offline-capable point of sale with a digital Credit Book and expiry/FEFO inventory tracking.

This is **Phase 1 (Foundation)** plus the start of **Phase 2 (POS)**, built against the spec in
`kompass-pos-spec.md` (§73, §85). See [Status](#status) below for what's real vs. not yet built.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4
- Supabase (Postgres, Auth, Row Level Security) — schema in `supabase/migrations/`
- Dexie (IndexedDB) for the offline product/customer cache and the outbox sync queue
- PWA shell (`public/manifest.webmanifest`, `public/sw.js`)

## Getting started

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` against it, in order (via the Supabase SQL editor,
   or `supabase db push` if you use the CLI).
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key.
4. `npm install && npm run dev`, then open http://localhost:3000.

First run: sign up → you'll land on `/onboarding` to create your business → `/home`.

## Architecture

- **Multi-tenancy**: every business-owned table carries `business_id`; isolation is enforced by
  Postgres RLS (`0009_rls_policies.sql`), not the frontend. `business_members` maps users to
  businesses with a role (`owner` / `manager` / `cashier` / `stock_manager`).
- **Ledgers, not counters**: stock (`inventory_movements` → `product_stock` view) and credit
  balances (`credit_transactions` → `credit_account_balances` view) are both derived from
  append-only transaction logs, never a mutable column. Sale line items capture `unit_cost` at
  time of sale, so historical profit reports don't shift when a product's price changes later.
- **FEFO / expiry**: expiry lives on `inventory_batches`, not on the product. `fefo_deduct()`
  (SQL function) deducts oldest-expiry-first; `record_sale()` calls it for any product with
  `tracks_expiry = true`.
- **Offline**: `record_sale` and `record_credit_payment` are idempotent Postgres functions keyed
  on a client-generated `client_transaction_id`. The POS (`src/components/pos`) writes to an
  IndexedDB outbox (`src/lib/offline/db.ts`) instead of calling Supabase directly; `src/lib/offline/sync.ts`
  drains that queue when online, so retries can never double-apply a sale. The product/customer
  catalog is mirrored into IndexedDB (`src/lib/offline/catalog-sync.ts`) so the POS can search and
  sell with no network at all.
- **Design system**: tokens in `src/app/globals.css` (`@theme`) follow the spec's deep-green /
  warm-gold palette; primitives in `src/components/ui`.

## Status

Built and working end-to-end (pending a live Supabase project to test against):

- Auth (email/password), business onboarding, multi-tenant schema + RLS
- App shell (mobile bottom nav / desktop sidebar), PWA manifest + offline shell caching
- Dashboard (Home) — real queries, no placeholder data
- Products: list, manual add, detail (price/margin/stock/batches)
- POS: offline-first cart, FEFO-aware checkout, cash/card/eft/credit tender
- Credit Book: customers, ledger, partial payments, overdue flagging
- Expiry dashboard, Expenses, Suppliers, Inventory movement ledger, basic Reports, Settings

Deliberately **not** built yet (each says so honestly in the UI rather than faking it):

- Barcode/camera product capture (AI product capture, Phase 7)
- Stock Take and Purchases/receiving screens (Phase 3) — schema and FEFO logic are ready, no UI
- AI business assistant / insights generation, WhatsApp integration (Phases 7–8)

## Database

See `supabase/migrations/*.sql` for the full schema, or `src/lib/supabase/types.ts` for a
hand-written TypeScript mirror (regenerate with `supabase gen types typescript --linked` once a
project is linked, and delete the hand-written version).
