-- ============================================================
-- CitySend — profiles schema fix
-- Run this ONCE in Supabase SQL Editor after 001_citysend_schema.sql
-- ============================================================

-- ── 1. Add email column (idempotent) ─────────────────────────────────────────
alter table public.profiles
  add column if not exists email text not null default '';

-- ── 2. Backfill email from auth.users for existing rows ──────────────────────
update public.profiles p
set    email = u.email
from   auth.users u
where  p.id    = u.id
  and  p.email = '';

-- ── 3. Replace trigger function ───────────────────────────────────────────────
-- Captures name, email, phone, and role from signup metadata.
-- "on conflict … do update" keeps existing values unless they are blank,
-- so re-running after a signup never clobbers data the user changed.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do update set
    email = excluded.email,
    name  = case
              when profiles.name  = '' then excluded.name
              else profiles.name
            end,
    phone = case
              when profiles.phone = '' then excluded.phone
              else profiles.phone
            end;
  return new;
end;
$$;

-- Ensure trigger is attached (drop + recreate is idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
