-- ── Migration 014: Fix customer notification SELECT to include audience = 'all'
--
-- Migration 007 granted customers SELECT only on notifications where
-- audience = 'customer', which excluded broadcast notifications (audience = 'all').
-- The UPDATE policy in migration 013 already correctly allows 'all', but customers
-- could not even read those rows. This migration widens the SELECT policy to match.
--
-- Also widens the driver SELECT policy to include audience = 'all' for consistency,
-- since broadcast notifications should be visible to both customers and drivers.

-- ── Customers ────────────────────────────────────────────────────────────────

drop policy if exists "customers_read_own_notifications" on public.notifications;

create policy "customers_read_own_notifications"
  on public.notifications for select
  using (
    auth.uid() is not null
    and audience in ('customer', 'all')
    and customer_id = auth.uid()::text
  );

-- ── Drivers ──────────────────────────────────────────────────────────────────

drop policy if exists "drivers_read_own_notifications" on public.notifications;

create policy "drivers_read_own_notifications"
  on public.notifications for select
  using (
    auth.uid() is not null
    and audience in ('driver', 'all')
    and exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id      = public.notifications.driver_id
    )
  );
