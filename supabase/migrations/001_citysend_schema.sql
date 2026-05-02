-- ============================================================
-- CitySend — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. profiles ──────────────────────────────────────────────
-- One row per auth.users user, holding display name + role.
create table if not exists profiles (
  id         uuid          primary key references auth.users(id) on delete cascade,
  name       text          not null default '',
  phone      text          not null default '',
  role       text          not null default 'customer'
                           check (role in ('customer','admin','driver')),
  city_id    text          not null default 'winnipeg',
  created_at timestamptz   not null default now()
);

-- Auto-create a profile row whenever a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. drivers ───────────────────────────────────────────────
-- Admin-managed driver records. user_id links to auth.users when
-- the driver has a login account.
create table if not exists drivers (
  id               text          primary key,   -- e.g. 'd0', 'd1'
  user_id          uuid          references auth.users(id) on delete set null,
  name             text          not null,
  initials         text          not null default '',
  phone            text          not null default '',
  email            text          not null,
  vehicle          text          not null default '',
  status           text          not null default 'offline'
                                 check (status in ('available','busy','offline','suspended')),
  current_order_id text,
  rating           numeric(4,2)  not null default 5.0,
  completed_orders integer       not null default 0,
  joined_at        timestamptz   not null default now()
);

-- ── 3. orders ────────────────────────────────────────────────
-- Core delivery record. pickup/dropoff/parcel/price_breakdown
-- kept as JSONB to mirror the existing TypeScript shape exactly.
-- notes is a JSONB array of AdminNote objects.
create table if not exists orders (
  id                   text          primary key,
  customer_id          text          not null,
  customer_name        text          not null,
  pickup               jsonb         not null default '{}',
  dropoff              jsonb         not null default '{}',
  parcel               jsonb         not null default '{}',
  status               text          not null default 'new'
                                     check (status in (
                                       'new','assigned','picked_up',
                                       'in_transit','delivered','cancelled')),
  assigned_driver_id   text          references drivers(id) on delete set null,
  assigned_driver_name text,
  price_breakdown      jsonb         not null default '{}',
  city_id              text          not null default 'winnipeg',
  distance_km          numeric(8,2)  not null default 0,
  cancel_reason        text,
  notes                jsonb         not null default '[]',
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

-- Keep updated_at fresh automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute procedure public.set_updated_at();

-- ── 4. receipts ──────────────────────────────────────────────
create table if not exists receipts (
  id             text          primary key,
  order_id       text          not null references orders(id) on delete cascade,
  customer_id    text          not null,
  customer_name  text          not null,
  amount         numeric(10,2) not null default 0,
  tax            numeric(10,2) not null default 0,
  tip            numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  payment_method text          not null default 'card',
  last4          text          not null default '4242',
  brand          text          not null default 'visa',
  created_at     timestamptz   not null default now()
);

-- ── 5. incidents ─────────────────────────────────────────────
-- notes is a JSONB array of IncidentNote objects.
create table if not exists incidents (
  id            text          primary key,
  order_id      text          not null,
  source        text          not null check (source in ('customer','driver','admin')),
  reporter_id   text          not null,
  reporter_name text          not null,
  category      text          not null,
  description   text          not null default '',
  severity      text          not null check (severity in ('low','medium','high','critical')),
  status        text          not null default 'new'
                              check (status in ('new','in_review','resolved','escalated','closed')),
  assigned_to   text,
  notes         jsonb         not null default '[]',
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

drop trigger if exists incidents_updated_at on incidents;
create trigger incidents_updated_at
  before update on incidents
  for each row execute procedure public.set_updated_at();

-- ── 6. notifications ─────────────────────────────────────────
create table if not exists notifications (
  id          text          primary key,
  event       text          not null,
  audience    text          not null check (audience in ('customer','driver','admin','all')),
  order_id    text          not null default '',
  title       text          not null,
  body        text          not null,
  customer_id text,
  driver_id   text,
  read        boolean       not null default false,
  created_at  timestamptz   not null default now()
);

-- ── 7. city_configs ──────────────────────────────────────────
-- Stores the full CityConfig JSON, one row per city.
-- Seeded from compile-time defaults; admin can override.
create table if not exists city_configs (
  city_id    text          primary key,
  config     jsonb         not null default '{}',
  updated_at timestamptz   not null default now()
);

-- ── Row Level Security ────────────────────────────────────────
-- MVP policy: open access so all three client apps can read/write
-- without a server-side proxy.  Tighten before production.

alter table profiles      enable row level security;
alter table drivers       enable row level security;
alter table orders        enable row level security;
alter table receipts      enable row level security;
alter table incidents     enable row level security;
alter table notifications enable row level security;
alter table city_configs  enable row level security;

-- Drop any old policies first (idempotent re-run)
do $$ declare r record;
begin
  for r in select policyname, tablename
           from pg_policies
           where schemaname = 'public'
             and policyname = 'cs_open_access'
  loop
    execute format('drop policy if exists cs_open_access on %I', r.tablename);
  end loop;
end $$;

create policy cs_open_access on profiles      for all using (true) with check (true);
create policy cs_open_access on drivers       for all using (true) with check (true);
create policy cs_open_access on orders        for all using (true) with check (true);
create policy cs_open_access on receipts      for all using (true) with check (true);
create policy cs_open_access on incidents     for all using (true) with check (true);
create policy cs_open_access on notifications for all using (true) with check (true);
create policy cs_open_access on city_configs  for all using (true) with check (true);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime for tables that need cross-app sync.
-- Run once; safe to re-run.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table drivers;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table receipts;
alter publication supabase_realtime add table city_configs;
