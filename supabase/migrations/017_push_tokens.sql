-- ── Migration 017: Device push token registry ────────────────────────────────
--
-- Stores APNS / FCM device tokens captured when a user grants push permission
-- in the native (Capacitor) apps. The Supabase Edge Function `send-push` looks
-- up rows in this table to find which devices to deliver a push to.
--
-- One row per (user, device). The same user can have multiple devices (phone +
-- tablet + reinstall). On re-registration of the same device, the token may
-- rotate — we upsert on (user_id, app, platform, device_id) so the row is
-- updated rather than duplicated. device_id is the Capacitor-generated UUID.
--
-- app: 'customer' or 'driver' — determines which Apple bundle ID / FCM project
--      the token belongs to. Customer and driver apps have separate APNS keys
--      and FCM credentials, so we route by this column.
-- platform: 'ios' or 'android' — picks APNS vs FCM at send time.

create table if not exists public.push_tokens (
  id           bigserial   primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  app          text        not null check (app in ('customer', 'driver')),
  platform     text        not null check (platform in ('ios', 'android')),
  device_id    text        not null,
  token        text        not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- One token per device per app. Re-registration updates instead of duplicates.
  constraint push_tokens_unique_device unique (user_id, app, platform, device_id)
);

create index if not exists push_tokens_user_id_app_idx
  on public.push_tokens (user_id, app);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.push_tokens enable row level security;

-- Users can insert / update / delete their own push tokens.
drop policy if exists "users_manage_own_push_tokens" on public.push_tokens;
create policy "users_manage_own_push_tokens"
  on public.push_tokens for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The send-push Edge Function uses the service role (bypasses RLS) to read
-- tokens for any user, so no SELECT policy needed for it.
