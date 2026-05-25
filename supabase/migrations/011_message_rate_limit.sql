-- ── Migration 011: Message rate limiting ──────────────────────────────────────
--
-- Prevents a single sender from flooding a conversation.
-- Limit: 20 messages per sender per order per minute.
-- Applies to all roles (customer, driver, admin).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.check_message_rate_limit()
  returns trigger
  language plpgsql
  security definer
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from   public.messages
  where  order_id   = NEW.order_id
    and  sender_id  = NEW.sender_id
    and  created_at > now() - interval '1 minute';

  if recent_count >= 20 then
    raise exception using
      errcode = 'P0001',
      message = 'Too many messages',
      hint    = 'MESSAGE_RATE_LIMITED';
  end if;

  return NEW;
end;
$$;

drop trigger if exists message_rate_limit_trigger on public.messages;
create trigger message_rate_limit_trigger
  before insert on public.messages
  for each row execute function public.check_message_rate_limit();

-- Index to make the rate-limit COUNT fast (sender_id scoped within order)
create index if not exists messages_sender_rate_idx
  on public.messages (order_id, sender_id, created_at);
