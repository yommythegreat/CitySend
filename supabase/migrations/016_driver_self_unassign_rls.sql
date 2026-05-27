-- ── Migration 016: Allow drivers to self-unassign (decline an offered job) ─────
--
-- The current WITH CHECK on drivers_update_assigned_orders requires that
-- assigned_driver_id always equals the driver's own ID. This blocks the
-- decline/timeout flow, which needs to clear assigned_driver_id and reset
-- status to 'new'. Fix: extend WITH CHECK to also allow clearing the assignment.

drop policy if exists "drivers_update_assigned_orders" on public.orders;

create policy "drivers_update_assigned_orders"
  on public.orders for update
  using (
    -- Driver must currently be the assigned driver to touch the row
    exists (
      select 1 from public.drivers d
      where  d.user_id = auth.uid()
      and    d.id      = public.orders.assigned_driver_id
    )
  )
  with check (
    -- Normal updates (accept, status progression): keep own assignment
    assigned_driver_id = (
      select d.id from public.drivers d where d.user_id = auth.uid() limit 1
    )
    or
    -- Self-unassign on decline/timeout: clear assignment, return to 'new'
    (
      assigned_driver_id   is null
      and assigned_driver_name is null
      and status               = 'new'
    )
  );
