-- Forkcast: daily limits for AI photo analysis.
-- One row per user per day counts how many photos they've analyzed.
-- Only the analyze-food Edge Function (service role) reads or writes it.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

-- Row Level Security on, with no policies: app users can't read or change it at all.
alter table public.ai_usage enable row level security;

-- Atomically checks both limits and, if allowed, counts one more analysis.
-- Returns 'ok', 'user_limit' or 'total_limit'. Days are UTC.
create or replace function public.claim_ai_analysis(p_user uuid, p_user_limit integer, p_total_limit integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  total integer;
  mine integer;
begin
  -- One claim at a time per day, so two photos at once can't both slip under the cap.
  perform pg_advisory_xact_lock(hashtext('forkcast_ai_' || today::text));

  select coalesce(sum(count), 0) into total from public.ai_usage where day = today;
  if total >= p_total_limit then
    return 'total_limit';
  end if;

  select count into mine from public.ai_usage where user_id = p_user and day = today;
  if coalesce(mine, 0) >= p_user_limit then
    return 'user_limit';
  end if;

  insert into public.ai_usage (user_id, day, count) values (p_user, today, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1;
  return 'ok';
end;
$$;

-- Gives one back when the AI call itself failed, so errors don't eat someone's allowance.
create or replace function public.refund_ai_analysis(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

revoke all on function public.claim_ai_analysis(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.refund_ai_analysis(uuid) from public, anon, authenticated;
grant execute on function public.claim_ai_analysis(uuid, integer, integer) to service_role;
grant execute on function public.refund_ai_analysis(uuid) to service_role;
