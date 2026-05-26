-- ── Migration 015: 'offered' order status + saved_addresses on profiles ──────
--
-- 1. Extends the orders status constraint to include 'offered' — the state
--    between admin assigning a driver and the driver accepting the job.
--    Flow: new → offered (admin assigns) → assigned (driver accepts)
--          On decline/timeout: offered → new (driver cleared)
--
-- 2. Adds saved_addresses jsonb column to profiles so customer saved places
--    are stored in Supabase and available on any device / citysend.ca web.

-- ── 1. Orders status constraint ───────────────────────────────────────────────

alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_status_valid;

alter table public.orders
  add constraint orders_status_valid
    check (status in ('new','offered','assigned','picked_up','in_transit','delivered','cancelled'))
    not valid;

-- ── 2. Profiles: saved_addresses column ──────────────────────────────────────

alter table public.profiles
  add column if not exists saved_addresses jsonb not null default '[]'::jsonb;

-- Allow customers to read and update their own saved_addresses
-- (profiles RLS was previously open-access in migration 001, then tightened
--  in migration 007 — the existing update policy covers this column already)
