-- ── Migration 010: Handoff code hardening, private photos, city_interest spam ──
--
-- A. handoff_attempts table + validate_handoff_code RPC
--      - Tracks every code entry attempt (success/fail) per order
--      - Rate-limits failed attempts: 5 wrong tries in 15 min triggers lockout
--      - The stored code is never returned to the client
-- B. delivery-photos bucket — make private
--      - Drop public read policy; drivers get 1-hour signed URLs instead
-- C. city_interest duplicate gate
--      - Prevent the same contact submitting interest more than once per 24 h
-- ──────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════════
-- A. HANDOFF CODE — attempt tracking + rate-limited RPC
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.handoff_attempts (
  id         uuid        primary key default gen_random_uuid(),
  order_id   text        not null,
  success    boolean     not null,
  created_at timestamptz not null default now()
);

-- Index to make the rate-limit COUNT fast
create index if not exists handoff_attempts_order_created_idx
  on public.handoff_attempts (order_id, created_at);

-- RLS: only the system (service role) writes; nobody reads
alter table public.handoff_attempts enable row level security;

-- Drivers can insert their own attempts (via RPC — belt-and-suspenders)
create policy "drivers_insert_own_attempts"
  on public.handoff_attempts for insert
  with check ( auth.uid() is not null );

-- Admins can read for audit purposes
create policy "admin_read_attempts"
  on public.handoff_attempts for select
  using ( public.is_admin() );


-- RPC: validates code, logs attempt, enforces rate limit
-- SECURITY DEFINER so the stored handoff_code column is never exposed to clients.
create or replace function public.validate_handoff_code(
  p_order_id text,
  p_code     text
)
  returns boolean
  language plpgsql
  security definer
as $$
declare
  v_recent_fails int;
  v_stored_code  text;
  v_match        boolean;
begin
  -- Rate limit: 5 failed attempts per order per 15 minutes
  select count(*) into v_recent_fails
  from   public.handoff_attempts
  where  order_id   = p_order_id
    and  success    = false
    and  created_at > now() - interval '15 minutes';

  if v_recent_fails >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'Too many incorrect code attempts',
      hint    = 'HANDOFF_RATE_LIMITED';
  end if;

  -- Read stored code (SECURITY DEFINER bypasses RLS — code never sent to client)
  select handoff_code into v_stored_code
  from   public.orders
  where  id = p_order_id;

  v_match := (v_stored_code is not null and v_stored_code = p_code);

  -- Log attempt
  insert into public.handoff_attempts (order_id, success)
  values (p_order_id, v_match);

  return v_match;
end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- B. DELIVERY-PHOTOS — make bucket private
-- ══════════════════════════════════════════════════════════════════════════════
-- Drop the public-read policy added in migration 005.
-- Drivers now receive 1-hour signed URLs from the app instead.

drop policy if exists "public_read_delivery_photos" on storage.objects;

-- Update bucket to non-public (so Supabase CDN stops serving objects openly)
update storage.buckets
set    public = false
where  id     = 'delivery-photos';


-- ══════════════════════════════════════════════════════════════════════════════
-- C. CITY_INTEREST — prevent duplicate submissions
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.check_city_interest_duplicate()
  returns trigger
  language plpgsql
  security definer
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from   public.city_interest
  where  contact    = NEW.contact
    and  created_at > now() - interval '24 hours';

  if recent_count >= 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Interest already recorded for this contact',
      hint    = 'CITY_INTEREST_DUPLICATE';
  end if;

  return NEW;
end;
$$;

drop trigger if exists city_interest_duplicate_trigger on public.city_interest;
create trigger city_interest_duplicate_trigger
  before insert on public.city_interest
  for each row execute function public.check_city_interest_duplicate();
