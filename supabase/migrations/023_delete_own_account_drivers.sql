-- ── Migration 023: in-app account deletion for drivers ───────────────────────
--
-- Extends delete_own_account() (migration 022) so the driver app can offer the
-- same in-app deletion Apple requires (5.1.1(v)).
--
-- For a driver, deleting only the auth.users row would leave their name, email
-- and phone in `drivers` (user_id is ON DELETE SET NULL). Instead:
--   • Refuse while the driver has a delivery in progress, so a parcel is never
--     orphaned mid-route. The app shows a friendly message for this error.
--   • Anonymise the drivers row (kept so past orders still reference a driver
--     id for accounting) and suspend it so it can never be dispatched.
--   • Remove their live location row.
-- Push tokens are removed by the push_tokens → auth.users cascade.
--
-- Customers are unaffected: they have no drivers row.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  drv record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  for drv in select id from drivers where user_id = uid loop
    if exists (
      select 1 from orders
      where assigned_driver_id = drv.id
        and status not in ('delivered', 'cancelled')
    ) then
      raise exception 'active_delivery'
        using hint = 'Finish or hand back your current delivery before deleting your account.';
    end if;

    delete from driver_locations where driver_id = drv.id;

    update drivers set
      name             = 'Deleted driver',
      initials         = '',
      phone            = '',
      email            = 'deleted+' || drv.id || '@citysend.invalid',
      vehicle          = '',
      status           = 'suspended',
      current_order_id = null
    where id = drv.id;
  end loop;

  delete from auth.users where id = uid;
end;
$$;

revoke all     on function public.delete_own_account() from public, anon;
grant  execute on function public.delete_own_account() to authenticated;
