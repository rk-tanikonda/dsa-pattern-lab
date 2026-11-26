-- Memberships are written only by the verified billing webhook.
create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text unique not null,
  lock_token uuid,
  lock_until timestamptz
);
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription_id text unique not null,
  status text not null,
  plan text not null check (plan in ('monthly', 'annual')),
  paid_until timestamptz not null,
  cancel_at_period_end boolean not null default false,
  event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  resource text,
  status integer,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index usage_by_user_time on public.usage_events(user_id, created_at desc);
create index usage_by_time on public.usage_events(created_at desc);
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
revoke all on public.billing_customers, public.subscriptions, public.usage_events from public, anon, authenticated;
grant all on public.billing_customers, public.subscriptions, public.usage_events to service_role;
grant select on public.subscriptions, public.usage_events to authenticated;
create policy "Read own membership" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own usage" on public.usage_events for select to authenticated using ((select auth.uid()) = user_id);

create function public.has_paid_access() returns boolean
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and exists (select 1 from public.subscriptions where user_id = auth.uid()
      and status = 'active' and paid_until > now());
$$;
revoke all on function public.has_paid_access() from public, anon;
grant execute on function public.has_paid_access() to authenticated;

drop policy "Own progress only" on public.progress;
drop policy "Own notes only" on public.notes;
create policy "Paid owner progress" on public.progress for all to authenticated
  using ((select auth.uid()) = user_id and (select public.has_paid_access()))
  with check ((select auth.uid()) = user_id and (select public.has_paid_access()));
create policy "Paid owner notes" on public.notes for all to authenticated
  using ((select auth.uid()) = user_id and (select public.has_paid_access()))
  with check ((select auth.uid()) = user_id and (select public.has_paid_access()));

-- Count accepted execution requests atomically, across all application instances.
create or replace function public.consume_run_slot() returns boolean
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare
  uid uuid := auth.uid();
begin
  if not public.has_paid_access() then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 802631));
  delete from public.execution_quota where scope like uid::text || ':%' and expires_at <= now();
  if exists (select 1 from public.execution_quota where
    (scope = uid::text || ':minute' and runs >= 5) or
    (scope = uid::text || ':day' and runs >= 50) or
    (scope = uid::text || ':month' and runs >= 500)) then return false; end if;
  insert into public.execution_quota(scope,runs,expires_at) values
    (uid::text || ':minute',1,date_trunc('minute',now()) + interval '1 minute'),
    (uid::text || ':day',1,date_trunc('day',now()) + interval '1 day'),
    (uid::text || ':month',1,date_trunc('month',now()) + interval '1 month')
  on conflict(scope) do update set runs=public.execution_quota.runs+1;
  insert into public.usage_events(user_id,event) values(uid,'run_reserved');
  return true;
end;
$$;

create function public.track_learning_write() returns trigger
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
begin
  insert into public.usage_events(user_id,event,resource)
    values(new.user_id,case when tg_table_name = 'notes' then 'note_saved' else 'draft_saved' end,new.problem_id);
  return new;
end;
$$;
create trigger track_progress after insert or update on public.progress for each row execute function public.track_learning_write();
create trigger track_notes after insert or update on public.notes for each row execute function public.track_learning_write();

create function public.track_account_signin() returns trigger
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    insert into public.usage_events(user_id,event) values(new.id,'sign_in');
  end if;
  return new;
end;
$$;
create trigger track_signin after update of last_sign_in_at on auth.users for each row execute function public.track_account_signin();

create function public.usage_summary() returns jsonb
language sql stable security invoker set search_path = '' set timezone = 'UTC' as $$
  select jsonb_build_object(
    'runs',count(*) filter (where event = 'run_reserved'),
    'runs_today',count(*) filter (where event = 'run_reserved' and created_at >= date_trunc('day',now())),
    'saves',count(*) filter (where event = 'draft_saved'),
    'notes',count(*) filter (where event = 'note_saved'),
    'sign_ins',count(*) filter (where event = 'sign_in'),
    'page_views',count(*) filter (where event = 'page_view'),
    'requests',count(*) filter (where event = 'api_request'),
    'failures',count(*) filter (where event = 'api_request' and status >= 400),
    'reset_at',date_trunc('month',now()) + interval '1 month'
  ) from public.usage_events where user_id = auth.uid() and created_at >= date_trunc('month',now());
$$;
revoke all on function public.usage_summary() from public, anon;
grant execute on function public.usage_summary() to authenticated;

-- Event timestamps prevent an older Stripe delivery from overwriting newer state.
create function public.sync_subscription(p_user uuid, p_subscription text, p_status text, p_plan text,
  p_paid_until timestamptz, p_cancel boolean, p_created bigint) returns void
language sql security invoker set search_path = '' set timezone = 'UTC' as $$
  insert into public.subscriptions(user_id,subscription_id,status,plan,paid_until,cancel_at_period_end,event_created)
  values(p_user,p_subscription,p_status,p_plan,p_paid_until,p_cancel,p_created)
  on conflict(user_id) do update set subscription_id=excluded.subscription_id,status=excluded.status,
    plan=excluded.plan,paid_until=excluded.paid_until,cancel_at_period_end=excluded.cancel_at_period_end,
    event_created=excluded.event_created,updated_at=now()
  where public.subscriptions.event_created <= excluded.event_created
    and (public.subscriptions.subscription_id = excluded.subscription_id or excluded.status not in ('canceled','incomplete_expired'));
$$;
revoke all on function public.sync_subscription(uuid,text,text,text,timestamptz,boolean,bigint) from public,anon,authenticated;
grant execute on function public.sync_subscription(uuid,text,text,text,timestamptz,boolean,bigint) to service_role;

create function public.acquire_billing_lock(p_user uuid, p_token uuid) returns boolean
language plpgsql security invoker set search_path = '' set timezone = 'UTC' as $$
begin
  update public.billing_customers set lock_token=p_token,lock_until=now()+interval '90 seconds'
    where user_id=p_user and (lock_until is null or lock_until < now());
  return found;
end;
$$;
revoke all on function public.acquire_billing_lock(uuid,uuid) from public,anon,authenticated;
grant execute on function public.acquire_billing_lock(uuid,uuid) to service_role;

create function public.admin_usage_summary() returns jsonb
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.last_active desc nulls last),'[]'::jsonb) from (
    select u.id, u.email, u.phone, s.plan, s.status, s.paid_until,
      count(e.id) filter (where e.event='run_reserved') as runs,
      count(e.id) filter (where e.event='page_view') as page_views,
      count(e.id) filter (where e.event='api_request') as requests,
      count(e.id) filter (where e.event='api_request' and e.status>=400) as failures,
      count(e.id) filter (where e.event='draft_saved') as saves,
      count(e.id) filter (where e.event='note_saved') as notes,
      count(e.id) filter (where e.event='sign_in') as sign_ins,
      max(e.created_at) as last_active
    from auth.users u left join public.subscriptions s on s.user_id=u.id
    left join public.usage_events e on e.user_id=u.id and e.created_at>=date_trunc('month',now())
    group by u.id,u.email,u.phone,s.plan,s.status,s.paid_until
  ) t;
$$;
revoke all on function public.admin_usage_summary() from public,anon,authenticated;
grant execute on function public.admin_usage_summary() to service_role;

-- Navigation is client-reported analytics, never a billing or authorization input.
create function public.record_page_view(p_path text) returns boolean
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare uid uuid := auth.uid();
begin
  if not public.has_paid_access() or p_path !~ '^/learn(/(patterns|notes|problems(/[a-z0-9-]+)?))?$' or length(p_path)>150 then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,802634));
  if (select count(*) from public.usage_events where user_id=uid and event='page_view' and created_at>now()-interval '1 minute') >= 30 then return false; end if;
  insert into public.usage_events(user_id,event,resource) values(uid,'page_view',p_path);
  return true;
end;
$$;
revoke all on function public.record_page_view(text) from public,anon;
grant execute on function public.record_page_view(text) to authenticated;
