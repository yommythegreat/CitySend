-- ── Migration 007: RLS for profiles, receipts, incidents, notifications,
--                  city_configs + new city_interest table
-- ──────────────────────────────────────────────────────────────────────────────
--
-- Migrations 005 and 006 hardened orders and drivers.
-- This migration completes RLS coverage for all remaining tables and
-- adds city_interest for the coming-soon city notification form.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Shared helper: is_admin() ─────────────────────────────────────────────────
-- security definer bypasses RLS on profiles so the function never recurses.
create or replace function public.is_admin()
  returns boolean
  language sql
  security definer
  stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- A. PROFILES
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;

drop policy if exists "cs_open_access"            on public.profiles;
drop policy if exists "users_read_own_profile"    on public.profiles;
drop policy if exists "users_update_own_profile"  on public.profiles;
drop policy if exists "admin_full_access_profiles" on public.profiles;

-- Users read and update their own row only
create policy "users_read_own_profile"
  on public.profiles for select
  using ( id = auth.uid() );

create policy "users_update_own_profile"
  on public.profiles for update
  using ( id = auth.uid() )
  with check ( id = auth.uid() );

-- Supabase auth trigger (service role) inserts profiles on signup — bypasses RLS.
-- Admins can read all profiles (needed for user management in admin console)
create policy "admin_full_access_profiles"
  on public.profiles for all
  using ( public.is_admin() );


-- ══════════════════════════════════════════════════════════════════════════════
-- B. RECEIPTS
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.receipts enable row level security;

drop policy if exists "cs_open_access"              on public.receipts;
drop policy if exists "customers_read_own_receipts" on public.receipts;
drop policy if exists "admin_full_access_receipts"  on public.receipts;

-- Customers see only their own receipts
create policy "customers_read_own_receipts"
  on public.receipts for select
  using (
    auth.uid() is not null
    and customer_id = auth.uid()::text
  );

-- Admins have full access (read + insert when order is delivered)
create policy "admin_full_access_receipts"
  on public.receipts for all
  using ( public.is_admin() );


-- ══════════════════════════════════════════════════════════════════════════════
-- C. INCIDENTS
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.incidents enable row level security;

drop policy if exists "cs_open_access"                 on public.incidents;
drop policy if exists "admin_full_access_incidents"    on public.incidents;
drop policy if exists "authenticated_insert_incidents" on public.incidents;
drop policy if exists "users_read_own_incidents"       on public.incidents;

-- Admins can do everything
create policy "admin_full_access_incidents"
  on public.incidents for all
  using ( public.is_admin() );

-- Any authenticated user can file an incident
create policy "authenticated_insert_incidents"
  on public.incidents for insert
  with check ( auth.uid() is not null );

-- Customers and drivers can read incidents on their own orders
create policy "users_read_own_incidents"
  on public.incidents for select
  using (
    auth.uid() is not null
    and (
      -- customer whose order this is
      exists (
        select 1 from public.orders o
        where  o.id = public.incidents.order_id
        and    o.customer_id = auth.uid()::text
      )
      or
      -- driver assigned to this order
      exists (
        select 1 from public.drivers d
        join   public.orders o on o.assigned_driver_id = d.id
        where  d.user_id = auth.uid()
        and    o.id      = public.incidents.order_id
      )
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- D. NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.notifications enable row level security;

drop policy if exists "cs_open_access"                    on public.notifications;
drop policy if exists "customers_read_own_notifications"  on public.notifications;
drop policy if exists "drivers_read_own_notifications"    on public.notifications;
drop policy if exists "admin_full_access_notifications"   on public.notifications;

-- Customers read their own notifications
create policy "customers_read_own_notifications"
  on public.notifications for select
  using (
    auth.uid() is not null
    and audience = 'customer'
    and customer_id = auth.uid()::text
  );

-- Drivers read their own notifications
create policy "drivers_read_own_notifications"
  on public.notifications for select
  using (
    auth.uid() is not null
    and audience = 'driver'
    and exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id      = public.notifications.driver_id
    )
  );

-- Admin notifications (audience = 'admin' or 'all') readable by admins
create policy "admin_full_access_notifications"
  on public.notifications for all
  using ( public.is_admin() );

-- System (service role) inserts notifications — bypasses RLS automatically.


-- ══════════════════════════════════════════════════════════════════════════════
-- E. CITY_CONFIGS
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.city_configs enable row level security;

drop policy if exists "cs_open_access"         on public.city_configs;
drop policy if exists "public_read_city_configs" on public.city_configs;
drop policy if exists "admin_write_city_configs" on public.city_configs;

-- Anyone (including unauthenticated) can read configs — needed for pricing display
create policy "public_read_city_configs"
  on public.city_configs for select
  using ( true );

-- Only admins can modify configs
create policy "admin_write_city_configs"
  on public.city_configs for insert
  with check ( public.is_admin() );

create policy "admin_update_city_configs"
  on public.city_configs for update
  using ( public.is_admin() );

create policy "admin_delete_city_configs"
  on public.city_configs for delete
  using ( public.is_admin() );


-- ══════════════════════════════════════════════════════════════════════════════
-- F. CITY_INTEREST (new table)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.city_interest (
  id         uuid        primary key default gen_random_uuid(),
  city_name  text        not null,
  contact    text        not null,
  is_email   boolean     not null default true,
  created_at timestamptz not null default now()
);

alter table public.city_interest enable row level security;

-- Anyone can submit interest — users haven't signed up yet when they see this screen
create policy "public_insert_city_interest"
  on public.city_interest for insert
  with check ( true );

-- Only admins can read the list (for outreach)
create policy "admin_read_city_interest"
  on public.city_interest for select
  using ( public.is_admin() );
