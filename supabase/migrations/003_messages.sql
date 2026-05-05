-- ── Messages table ────────────────────────────────────────────────────────────
-- In-app chat between customer and assigned driver, visible to admin.

create table if not exists public.messages (
  id            uuid        primary key default gen_random_uuid(),
  order_id      text        not null,
  sender_id     text        not null,
  sender_role   text        not null check (sender_role   in ('customer', 'driver', 'admin')),
  receiver_id   text        not null,
  receiver_role text        not null check (receiver_role in ('customer', 'driver', 'admin')),
  message_text  text        not null,
  is_read       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists messages_order_id_idx
  on public.messages (order_id, created_at asc);

-- ── Row-Level Security ────────────────────────────────────────────────────────

alter table public.messages enable row level security;

-- Customer: read all messages on their own orders
create policy "customer_read_own_order_messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = messages.order_id
        and orders.customer_id = auth.uid()::text
    )
  );

-- Customer: send messages on their own orders
create policy "customer_send_message"
  on public.messages for insert
  with check (
    sender_role = 'customer'
    and sender_id = auth.uid()::text
    and exists (
      select 1 from public.orders
      where orders.id = messages.order_id
        and orders.customer_id = auth.uid()::text
    )
  );

-- Customer: mark messages read when they are the receiver
create policy "customer_mark_read"
  on public.messages for update
  using (
    receiver_id = auth.uid()::text
    and receiver_role = 'customer'
  );

-- Driver: read messages for orders assigned to them
create policy "driver_read_assigned_order_messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = messages.order_id
        and orders.assigned_driver_id = auth.uid()::text
    )
  );

-- Driver: send messages on their assigned orders
create policy "driver_send_message"
  on public.messages for insert
  with check (
    sender_role = 'driver'
    and sender_id = auth.uid()::text
    and exists (
      select 1 from public.orders
      where orders.id = messages.order_id
        and orders.assigned_driver_id = auth.uid()::text
    )
  );

-- Driver: mark messages read when they are the receiver
create policy "driver_mark_read"
  on public.messages for update
  using (
    receiver_id = auth.uid()::text
    and receiver_role = 'driver'
  );

-- Admin: full access to all messages
create policy "admin_full_access_messages"
  on public.messages for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
