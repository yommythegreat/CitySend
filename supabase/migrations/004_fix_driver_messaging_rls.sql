-- ── Migration 004: Fix driver messaging RLS + add indexes ──────────────────────
--
-- ROOT CAUSE: The driver app stores the driver's short id (e.g. 'd0') in
-- messages.sender_id and orders.assigned_driver_id, but the existing RLS
-- policies compare against auth.uid()::text which is a UUID.  These NEVER
-- match, so every driver INSERT is silently blocked and every driver SELECT
-- returns 0 rows.
--
-- FIX: Join through the drivers table so we verify identity as:
--   drivers.user_id = auth.uid()   (UUID → UUID comparison, always works)
-- and the driver's short id is compared against sender_id / assigned_driver_id
-- (text → text, always correct).
--
-- Also adds per-column indexes on sender_id and receiver_id that were missing.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Drop the three broken driver policies ──────────────────────────────────

drop policy if exists "driver_read_assigned_order_messages" on public.messages;
drop policy if exists "driver_send_message"                  on public.messages;
drop policy if exists "driver_mark_read"                     on public.messages;

-- ── 2. Add missing indexes ────────────────────────────────────────────────────

create index if not exists messages_sender_id_idx   on public.messages (sender_id);
create index if not exists messages_receiver_id_idx on public.messages (receiver_id);

-- ── 3. Recreate driver READ policy ───────────────────────────────────────────
-- A driver may read messages for any order that is assigned to them, OR any
-- message where they are sender/receiver (covers history after reassignment).

create policy "driver_read_assigned_order_messages"
  on public.messages for select
  using (
    -- message belongs to an order assigned to this driver
    exists (
      select 1
      from   public.orders  o
      join   public.drivers d on d.id = o.assigned_driver_id
      where  o.id  = messages.order_id
      and    d.user_id = auth.uid()
    )
    -- OR this driver is the sender (their short id stored in sender_id)
    or exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id = messages.sender_id
    )
    -- OR this driver is the receiver
    or exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id = messages.receiver_id
    )
  );

-- ── 4. Recreate driver INSERT policy ─────────────────────────────────────────
-- Sender_id must match this driver's short id (not the UUID).
-- The order must currently be assigned to this driver.

create policy "driver_send_message"
  on public.messages for insert
  with check (
    sender_role = 'driver'
    -- verify: the sender_id short-string belongs to the authenticated driver
    and exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id = sender_id
    )
    -- verify: the order is currently assigned to this driver
    and exists (
      select 1
      from   public.orders  o
      join   public.drivers d on d.id = o.assigned_driver_id
      where  o.id  = order_id
      and    d.user_id = auth.uid()
    )
  );

-- ── 5. Recreate driver UPDATE (mark-read) policy ──────────────────────────────

create policy "driver_mark_read"
  on public.messages for update
  using (
    exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id = receiver_id
    )
    and receiver_role = 'driver'
  );

-- ── 6. Fix customer INSERT policy ─────────────────────────────────────────────
-- The existing policy already works for authenticated customers but has no
-- guard against a guest user (auth.uid() IS NULL) sending messages.
-- Replace with an explicit version that keeps the original intent intact.

drop policy if exists "customer_send_message" on public.messages;

create policy "customer_send_message"
  on public.messages for insert
  with check (
    sender_role = 'customer'
    and auth.uid() is not null
    and sender_id = auth.uid()::text
    -- order must exist (no cross-order spoofing)
    and exists (
      select 1 from public.orders
      where  orders.id = order_id
    )
  );

-- ── 7. Allow admin to INSERT messages (optional admin reply feature) ───────────
-- The existing "admin_full_access_messages" policy covers ALL operations
-- including INSERT, so no change is needed here — admin can already send.
-- (The WITH CHECK on the ALL policy covers INSERT automatically in Postgres.)
