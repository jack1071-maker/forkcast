-- Forkcast: accounts, cloud backup and AI invite access.

-- One row per user, holding their whole Forkcast state (profile, goals, food log, weights).
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each signed-in user can only touch THEIR OWN row.
alter table public.user_state enable row level security;

drop policy if exists "Users can read their own state" on public.user_state;
create policy "Users can read their own state" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own state" on public.user_state;
create policy "Users can insert their own state" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own state" on public.user_state;
create policy "Users can update their own state" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own state" on public.user_state;
create policy "Users can delete their own state" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_state to authenticated;
revoke all on public.user_state from anon;

-- Stop one account storing a huge amount (1 MB is years of meals).
alter table public.user_state drop constraint if exists user_state_size_limit;
alter table public.user_state add constraint user_state_size_limit check (pg_column_size(state) < 1000000);

-- Who has entered the invite code for the photo AI. Only the analyze-food function touches it.
create table if not exists public.ai_access (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.ai_access enable row level security;
revoke all on public.ai_access from anon, authenticated;

-- "Delete my account": deletes only the caller's own account (and, by cascade, all their data).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
