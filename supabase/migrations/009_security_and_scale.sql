-- ── Migration 009: Rate limiting, input validation, RLS tightening ────────────
--
-- A. Rate limit trigger  — max 5 order inserts per customer per 60 seconds
-- B. Input validation    — check constraints on orders (new rows + updates only)
-- C. RLS tightening      — replace broad driver read-all with targeted policy
-- ──────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════════
-- A. RATE LIMITING — orders insert
-- ══════════════════════════════════════════════════════════════════════════════
-- Blocks a single customer_id from creating more than 5 orders in 60 seconds.
-- Runs as SECURITY DEFINER so it can query orders despite RLS.

create or replace function public.check_order_rate_limit()
  returns trigger
  language plpgsql
  security definer
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from   public.orders
  where  customer_id = NEW.customer_id
    and  created_at  > now() - interval '1 minute';

  if recent_count >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'Rate limit exceeded: too many orders in a short period',
      hint    = 'RATE_LIMIT_EXCEEDED';
  end if;

  return NEW;
end;
$$;

drop trigger if exists orders_rate_limit_trigger on public.orders;
create trigger orders_rate_limit_trigger
  before insert on public.orders
  for each row execute function public.check_order_rate_limit();


-- ══════════════════════════════════════════════════════════════════════════════
-- B. INPUT VALIDATION — check constraints on orders
-- ══════════════════════════════════════════════════════════════════════════════
-- NOT VALID: only enforced on new inserts/updates, not retroactively against
-- existing rows — safe to run on a live database.

alter table public.orders
  add constraint orders_status_valid
    check (status in ('new','assigned','picked_up','in_transit','delivered','cancelled'))
    not valid,

  add constraint orders_city_id_valid
    check (city_id in ('winnipeg','toronto','calgary','vancouver','edmonton','ottawa','montreal'))
    not valid,

  add constraint orders_distance_positive
    check (distance_km > 0)
    not valid,

  add constraint orders_customer_id_nonempty
    check (length(customer_id) > 0)
    not valid,

  add constraint orders_parcel_size_valid
    check (parcel->>'size' in ('s','m','l'))
    not valid,

  add constraint orders_pickup_address_nonempty
    check (length(pickup->>'address') > 0)
    not valid,

  add constraint orders_dropoff_address_nonempty
    check (length(dropoff->>'address') > 0)
    not valid;


-- ══════════════════════════════════════════════════════════════════════════════
-- C. RLS TIGHTENING — drivers table
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 005 added a broad "authenticated_read_drivers" policy that allows
-- ANY logged-in user to read ALL driver rows — exposing phone, email, vehicle
-- for every driver in the system to every customer.
--
-- Replace it with a targeted policy: customers can only read a driver's row
-- when that driver is assigned to one of the customer's own orders.

drop policy if exists "authenticated_read_drivers" on public.drivers;

-- Customers see driver info only for their assigned driver
create policy "customers_read_assigned_driver"
  on public.drivers for select
  using (
    auth.uid() is not null
    and (
      -- driver reading their own row (belt-and-suspenders alongside drivers_read_own_row)
      user_id = auth.uid()
      or
      -- customer whose order is currently assigned to this driver
      exists (
        select 1 from public.orders o
        where  o.assigned_driver_id = public.drivers.id
          and  o.customer_id        = auth.uid()::text
      )
    )
  );
