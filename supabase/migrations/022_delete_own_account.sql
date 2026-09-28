-- ── Migration 022: in-app account deletion (Apple App Store 5.1.1(v)) ─────────
--
-- Apps that let users create an account must let them delete it from within the
-- app. The customer app calls supabase.rpc('delete_own_account') from Settings →
-- Danger zone. This SECURITY DEFINER function (owned by postgres) deletes the
-- caller's auth.users row; the profiles FK (references auth.users on delete
-- cascade, migration 001) removes their profile automatically.
--
-- Orders are intentionally NOT deleted: customer_id is a plain text column, not
-- an FK, and past deliveries are retained as business/accounting records that no
-- longer resolve to a live account. Tighten later if full erasure is required.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- Only a signed-in user may delete their own account.
revoke all     on function public.delete_own_account() from public, anon;
grant  execute on function public.delete_own_account() to authenticated;
