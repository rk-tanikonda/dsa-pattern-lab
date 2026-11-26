-- Shared quotas survive cold starts and concurrent Vercel instances.
create table public.execution_quota (
  scope text primary key,
  runs integer not null default 0,
  expires_at timestamptz not null
);
alter table public.execution_quota enable row level security;
revoke all on public.execution_quota from public, anon, authenticated;

create function public.consume_run_slot() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  minute_end timestamptz := date_trunc('minute', now()) + interval '1 minute';
  day_end timestamptz := date_trunc('day', now()) + interval '1 day';
  month_end timestamptz := date_trunc('month', now()) + interval '1 month';
begin
  if uid is null then return false; end if;
  -- Serialize this small pilot's quota checks to prevent oversubscription.
  perform pg_advisory_xact_lock(802631);
  delete from public.execution_quota where expires_at <= now();
  if exists (select 1 from public.execution_quota where
    (scope = 'month' and runs >= 200) or
    (scope = uid::text || ':minute' and runs >= 5) or
    (scope = uid::text || ':day' and runs >= 50)) then
    return false;
  end if;
  insert into public.execution_quota(scope,runs,expires_at) values
    ('month',1,month_end),
    (uid::text || ':minute',1,minute_end),
    (uid::text || ':day',1,day_end)
  on conflict(scope) do update set runs=public.execution_quota.runs+1;
  return true;
end;
$$;
revoke all on function public.consume_run_slot() from public, anon;
grant execute on function public.consume_run_slot() to authenticated;
