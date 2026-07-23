-- ── Migration 021: null-safe handle_new_user (supports anonymous users) ───────
--
-- Guest checkout signs users in anonymously (see app/src/lib/guestSession.ts).
-- Anonymous auth.users rows have NULL email and no signup metadata, so the
-- previous trigger computed:
--   name = coalesce(nullif(trim(raw_user_meta_data->>'name'),''),
--                   split_part(new.email,'@',1))
--        = coalesce(NULL, split_part(NULL,'@',1)) = NULL
-- and profiles.name is NOT NULL — an explicit NULL bypasses the column default
-- and violates the constraint. GoTrue reports this as
-- "Database error creating anonymous user" and the sign-in fails.
--
-- Fix: fall back to 'Guest' so name is never NULL, and guard split_part against
-- a NULL email. Registered signups are unaffected (they still carry name/email).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do update set
    email = excluded.email,
    name  = case
              when profiles.name  = '' then excluded.name
              else profiles.name
            end,
    phone = case
              when profiles.phone = '' then excluded.phone
              else profiles.phone
            end;
  return new;
end;
$$;

-- Trigger is already attached from migration 002; re-attach idempotently.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
