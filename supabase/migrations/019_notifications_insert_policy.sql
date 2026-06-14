-- ── Migration 019: Allow authenticated users to INSERT notifications ─────────
--
-- Migration 007 set up SELECT policies for customers/drivers and full-access
-- for admins — but never added an INSERT policy for non-admin authenticated
-- users. The driver app's decline / timeout sync (DriverContext) tries to
-- INSERT an admin-audience notification when a driver declines a job; RLS
-- silently blocks it (Promise.allSettled hides the failure), so the admin
-- email never fires.
--
-- Fix: allow any authenticated user to INSERT into notifications. The
-- inserted content is low-risk (title + body strings for alerts) and the
-- app code controls what gets sent. SELECT policies still scope what each
-- role can see (customers read their own; drivers read their own;
-- admins read everything).
--
-- If we ever need to restrict who can insert what audience, we can tighten
-- this with a more specific policy.

drop policy if exists "authenticated_insert_notifications" on public.notifications;

create policy "authenticated_insert_notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);
