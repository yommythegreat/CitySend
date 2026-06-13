-- ── Migration 018: Postgres triggers that emit admin notifications ───────────
--
-- The notifications table already gets rows from app code for some events
-- (driver decline / timeout — emitted by DriverContext's HIDE_JOB_OFFER sync).
-- This migration adds the missing admin-visibility events:
--
--   1. New order created  → admin gets "New order CS-XXXXX from <customer>"
--   2. Order delivered    → admin gets "Order CS-XXXXX delivered"
--   3. Order cancelled    → admin gets "Order CS-XXXXX cancelled"
--
-- The send-admin-email Edge Function then picks up audience='admin' rows
-- via a Database Webhook and forwards them to Resend.
--
-- All notification rows go through the same notifications table, so the
-- in-app admin notification bell (when admin app receives realtime push)
-- and the email delivery both light up off the same insert.

-- ── 1. New order created ─────────────────────────────────────────────────────
create or replace function public.emit_admin_notif_on_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only emit for orders that start in 'new' status (skip admin-recreations
  -- that may pass through different statuses later). Skip if a notification
  -- already exists for this order_id + event (idempotent).
  if new.status = 'new' then
    insert into public.notifications (
      id, event, audience, order_id, title, body, customer_id, created_at, read
    )
    values (
      'ntf-new-' || new.id,
      'order_created',
      'admin',
      new.id,
      'New order ' || new.id,
      coalesce(new.customer_name, 'A customer')
        || ' booked a delivery from '
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

drop trigger if exists trg_admin_notif_on_new_order on public.orders;
create trigger trg_admin_notif_on_new_order
  after insert on public.orders
  for each row execute function public.emit_admin_notif_on_new_order();


-- ── 2. Order delivered or cancelled ──────────────────────────────────────────
create or replace function public.emit_admin_notif_on_order_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_delivered  boolean;
  is_cancelled  boolean;
begin
  is_delivered := new.status = 'delivered' and old.status is distinct from 'delivered';
  is_cancelled := new.status = 'cancelled' and old.status is distinct from 'cancelled';

  if is_delivered then
    insert into public.notifications (
      id, event, audience, order_id, title, body, customer_id, driver_id, created_at, read
    )
    values (
      'ntf-delivered-' || new.id,
      'delivered',
      'admin',
      new.id,
      'Order ' || new.id || ' delivered',
      coalesce(new.assigned_driver_name, 'Driver')
        || ' delivered '
        || new.id
        || ' to '
        || coalesce(new.dropoff->>'address', 'drop-off')
        || '.',
      new.customer_id,
      new.assigned_driver_id,
      now(),
      false
    )
    on conflict (id) do nothing;
  end if;

  if is_cancelled then
    insert into public.notifications (
      id, event, audience, order_id, title, body, customer_id, driver_id, created_at, read
    )
    values (
      'ntf-cancelled-' || new.id,
      'cancelled',
      'admin',
      new.id,
      'Order ' || new.id || ' cancelled',
      'Order ' || new.id
        || ' was cancelled'
        || case when new.cancel_reason is not null
             then ' (reason: ' || new.cancel_reason || ')'
             else '' end
        || '.',
      new.customer_id,
      new.assigned_driver_id,
      now(),
      false
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_admin_notif_on_order_complete on public.orders;
create trigger trg_admin_notif_on_order_complete
  after update of status on public.orders
  for each row execute function public.emit_admin_notif_on_order_complete();
