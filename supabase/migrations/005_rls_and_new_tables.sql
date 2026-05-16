-- ── Migration 005: Complete RLS + new tables (handoff codes, driver locations) ──
--
-- Covers:
--   A. orders        — tighten existing policies (customers only see own orders)
--   B. drivers       — tighten (drivers see own row only, admin sees all)
--   C. driver_locations (NEW) — driver writes own row, customers/admin read
--   D. delivery-photos storage bucket (instructions only — run in dashboard)
--   E. orders.handoff_code column
-- ──────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- A. ORDERS table
-- ══════════════════════════════════════════════════════════════════════════════

-- Add handoff_code column if it doesn't already exist
alter table public.orders
  add column if not exists handoff_code text;

-- Drop any existing permissive policies we're replacing
drop policy if exists "customers_read_own_orders"   on public.orders;
drop policy if exists "customers_insert_orders"      on public.orders;
drop policy if exists "drivers_read_assigned_orders" on public.orders;
drop policy if exists "drivers_update_assigned_order_status" on public.orders;
drop policy if exists "admin_full_access_orders"     on public.orders;

-- Make sure RLS is enabled
alter table public.orders enable row level security;

-- 1. Customers can read their own orders only
create policy "customers_read_own_orders"
  on public.orders for select
  using (
    auth.uid() is not null
    and customer_id = auth.uid()::text
  );

-- 2. Customers can insert new orders (their own only)
create policy "customers_insert_orders"
  on public.orders for insert
  with check (
    auth.uid() is not null
    and customer_id = auth.uid()::text
  );

-- 3. Drivers can read orders assigned to them
create policy "drivers_read_assigned_orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id      = public.orders.assigned_driver_id
    )
  );

-- 4. Drivers can update status + notes on their assigned orders only
--    (handoff_code is NOT updatable by drivers — read-only for them)
create policy "drivers_update_assigned_orders"
  on public.orders for update
  using (
    exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id      = public.orders.assigned_driver_id
    )
  )
  with check (
    -- driver cannot reassign the order to a different driver
    assigned_driver_id = (
      select d.id from public.drivers d where d.user_id = auth.uid() limit 1
    )
  );

-- 5. Admins have full access (read/write/delete)
create policy "admin_full_access_orders"
  on public.orders for all
  using (
    exists (
      select 1 from public.profiles p
      where  p.id   = auth.uid()
      and    p.role = 'admin'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- B. DRIVERS table
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.drivers enable row level security;

drop policy if exists "drivers_read_own_row"    on public.drivers;
drop policy if exists "drivers_update_own_row"  on public.drivers;
drop policy if exists "admin_full_access_drivers" on public.drivers;

-- Drivers can read their own row (to get driverId, vehicle, etc.)
create policy "drivers_read_own_row"
  on public.drivers for select
  using ( user_id = auth.uid() );

-- Drivers can update their own row (status, current_order_id)
create policy "drivers_update_own_row"
  on public.drivers for update
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

-- Admin full access
create policy "admin_full_access_drivers"
  on public.drivers for all
  using (
    exists (
      select 1 from public.profiles p
      where  p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Allow any authenticated user to read basic driver info
-- (needed so customers can display driver name on tracking screen)
create policy "authenticated_read_drivers"
  on public.drivers for select
  using ( auth.uid() is not null );


-- ══════════════════════════════════════════════════════════════════════════════
-- C. DRIVER_LOCATIONS table (new)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.driver_locations (
  driver_id   text        primary key,
  order_id    text,
  lat         double precision not null,
  lng         double precision not null,
  heading     double precision,
  accuracy_m  double precision,
  updated_at  timestamptz not null default now()
);

alter table public.driver_locations enable row level security;

-- Drivers can upsert their own location row
create policy "driver_write_own_location"
  on public.driver_locations for all
  using (
    exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id      = public.driver_locations.driver_id
    )
  )
  with check (
    exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id      = public.driver_locations.driver_id
    )
  );

-- Anyone authenticated (customers, admins) can read driver locations
-- (for tracking screen and dispatch map)
create policy "authenticated_read_driver_locations"
  on public.driver_locations for select
  using ( auth.uid() is not null );

-- Enable realtime for this table
alter publication supabase_realtime add table public.driver_locations;


-- ══════════════════════════════════════════════════════════════════════════════
-- D. STORAGE — delivery-photos bucket
-- ══════════════════════════════════════════════════════════════════════════════
-- Run this in the Supabase Dashboard → Storage, OR via the Supabase CLI:
--
--   supabase storage create delivery-photos --public
--
-- Or insert via SQL (storage schema is managed by Supabase internals):
--
insert into storage.buckets (id, name, public)
values ('delivery-photos', 'delivery-photos', true)
on conflict (id) do nothing;

-- Allow drivers to upload photos (INSERT)
create policy "drivers_upload_photos"
  on storage.objects for insert
  with check (
    bucket_id = 'delivery-photos'
    and auth.uid() is not null
    and exists (
      select 1 from public.drivers d where d.user_id = auth.uid()
    )
  );

-- Allow anyone to read delivery photos (public bucket, but explicit policy)
create policy "public_read_delivery_photos"
  on storage.objects for select
  using ( bucket_id = 'delivery-photos' );

-- Allow drivers to update (retake) their own photos
create policy "drivers_update_own_photos"
  on storage.objects for update
  using (
    bucket_id = 'delivery-photos'
    and auth.uid() is not null
    and exists (
      select 1 from public.drivers d where d.user_id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- E. INDEXES for new column
-- ══════════════════════════════════════════════════════════════════════════════

create index if not exists orders_handoff_code_idx on public.orders (handoff_code)
  where handoff_code is not null;
