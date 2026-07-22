-- ── Migration 020: Scheduled delivery workflow ───────────────────────────────
--
-- Introduces Morning/Evening scheduled deliveries alongside Express.
--   • Two new order statuses: 'scheduled' (booked, waiting for its window) and
--     'preparing' (admin is about to dispatch). Express is unaffected.
--   • Three new columns making delivery type + window the DB source of truth
--     (no longer derived from the parcel JSONB text label):
--        delivery_type          'express' | 'morning' | 'evening'
--        delivery_window_start   timestamptz (null for express)
--        delivery_window_end     timestamptz (null for express)
--
-- Flow:
--   Express          new → offered → assigned → picked_up → in_transit → delivered
--   Morning/Evening  scheduled → preparing → new → offered → … → delivered
--   Dispatch (admin) moves preparing → new (enters the assignable pool).

-- ── 1. Status CHECK constraint — append scheduled + preparing ─────────────────
alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_status_valid;

alter table public.orders
  add constraint orders_status_valid
    check (status in (
      'new','offered','assigned','picked_up','in_transit','delivered','cancelled',
      'scheduled','preparing'
    ))
    not valid;

-- ── 2. New columns ────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists delivery_type        text,
  add column if not exists delivery_window_start timestamptz,
  add column if not exists delivery_window_end   timestamptz;

-- Backfill delivery_type from the parcel JSONB the branch already wrote; rows
-- without it predate the feature and are treated as immediate/express.
update public.orders
set delivery_type = coalesce(parcel->>'deliveryWindow', 'express')
where delivery_type is null;

-- ── 3. Admin notification also fires for scheduled bookings ───────────────────
-- Migration 018's trigger only fired on status='new' INSERTs. Scheduled orders
-- INSERT as 'scheduled', so admin would never be notified of them. Extend it.
create or replace function public.emit_admin_notif_on_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('new', 'scheduled') then
    insert into public.notifications (
      id, event, audience, order_id, title, body, customer_id, created_at, read
    )
    values (
      'ntf-new-' || new.id,
      'order_created',
      'admin',
      new.id,
      case when new.status = 'scheduled'
           then 'New scheduled order ' || new.id
           else 'New order ' || new.id end,
      coalesce(new.customer_name, 'A customer')
        || ' booked a '
        || coalesce(new.delivery_type, 'express')
        || ' delivery from '
        || coalesce(new.pickup->>'address', 'unknown pickup')
        || ' to '
        || coalesce(new.dropoff->>'address', 'unknown drop-off')
        || '.',
      new.customer_id,
      now(),
      false
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
