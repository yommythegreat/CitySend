-- ── Migration 012: Fix admin realtime INSERT visibility ───────────────────────
--
-- Problem: admin_full_access_orders and admin_full_access_drivers (from
-- migration 005) use a direct EXISTS subquery against public.profiles.
-- Migration 007 subsequently enabled RLS on profiles, creating a multi-hop
-- policy chain that Supabase Realtime's event-filter context can't reliably
-- resolve — INSERT events are silently dropped for admin subscribers.
--
-- Fix: replace both policies with is_admin() (SECURITY DEFINER, created in
-- migration 007) which bypasses profiles RLS in one call, matching every other
-- admin policy in the schema.

-- ── orders ────────────────────────────────────────────────────────────────────

drop policy if exists "admin_full_access_orders" on public.orders;

create policy "admin_full_access_orders"
  on public.orders for all
  using      ( public.is_admin() )
  with check ( public.is_admin() );


-- ── drivers ───────────────────────────────────────────────────────────────────

drop policy if exists "admin_full_access_drivers" on public.drivers;

create policy "admin_full_access_drivers"
  on public.drivers for all
  using      ( public.is_admin() )
  with check ( public.is_admin() );
