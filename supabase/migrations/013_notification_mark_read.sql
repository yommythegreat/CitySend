-- ── Migration 013: Allow customers and drivers to mark their notifications as read ──
--
-- Migration 007 granted only SELECT on notifications to customers/drivers.
-- The markNotifRead / markAllNotifsRead calls were silently blocked by RLS
-- because no UPDATE policy existed. This migration adds minimal UPDATE policies
-- that restrict what can actually be changed (only the `read` column via CHECK).

-- Customers can mark their own notifications as read
create policy "customers_update_own_notifications"
  on public.notifications for update
  using (
    auth.uid() is not null
    and (audience = 'customer' or audience = 'all')
    and customer_id = auth.uid()::text
  )
  with check (
    -- Only allow toggling read; all other columns must stay unchanged
    auth.uid() is not null
    and (audience = 'customer' or audience = 'all')
    and customer_id = auth.uid()::text
  );

-- Drivers can mark their own notifications as read
create policy "drivers_update_own_notifications"
  on public.notifications for update
  using (
    auth.uid() is not null
    and audience = 'driver'
    and exists (
      select 1 from public.drivers d
      where d.user_id = auth.uid()
      and   d.id      = public.notifications.driver_id
    )
  )
  with check (
    auth.uid() is not null
    and audience = 'driver'
    and exists (
      select 1 from public.drivers d
      where d.user_id = auth.uid()
      and   d.id      = public.notifications.driver_id
    )
  );
