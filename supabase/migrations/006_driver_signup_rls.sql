-- ── Migration 006: Driver self-signup RLS policy ──────────────────────────────
--
-- Allows a newly authenticated user to INSERT their own row in the drivers table.
-- The WITH CHECK ensures they can only set user_id = their own auth.uid().
--
-- This is safe because:
--   1. The row can only be inserted if auth.uid() matches the user_id column.
--   2. Admin approval is enforced at the application level (status starts 'offline').
--   3. Admins can change status to 'available' to activate the driver.
-- ──────────────────────────────────────────────────────────────────────────────

-- Drop the open-access policy from migration 001 if it still exists
-- (migration 005 already dropped+recreated the named policies)
drop policy if exists "cs_open_access"          on public.drivers;
drop policy if exists "drivers_insert_own_row"  on public.drivers;

-- Any authenticated user may insert exactly one row for themselves
create policy "drivers_insert_own_row"
  on public.drivers for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );
