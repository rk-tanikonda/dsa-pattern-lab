-- Apply once in the Supabase SQL editor or with `supabase db push`.
create table public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null check (char_length(problem_id) between 1 and 100),
  status text not null default 'in_progress' check (status in ('in_progress','solved','review')),
  code text not null default '' check (octet_length(code) <= 64000),
  language text not null default 'go' check (language in ('go','python','javascript')),
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);
create table public.notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null check (char_length(problem_id) between 1 and 100),
  body text not null default '' check (octet_length(body) <= 32000),
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);
alter table public.progress enable row level security;
alter table public.notes enable row level security;
create policy "Own progress only" on public.progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own notes only" on public.notes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.progress, public.notes from anon;
grant select, insert, update, delete on public.progress, public.notes to authenticated;
create index notes_recent on public.notes (user_id, updated_at desc);

-- A draft saved by another tab cannot race a successful run and erase acceptance.
create function public.preserve_progress() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.status = 'solved' and new.status = 'in_progress' then
    new.status := 'solved';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger preserve_progress_before_update before update on public.progress
  for each row execute function public.preserve_progress();

-- A failed run must never erase an earlier successful run.
-- Progress is private learning data, not a trusted certificate or leaderboard.
create function public.record_run(p_problem_id text, p_code text, p_language text, p_passed boolean)
returns void language sql security invoker set search_path = '' as $$
  insert into public.progress (user_id,problem_id,code,language,status,updated_at)
  values (auth.uid(),p_problem_id,p_code,p_language,case when p_passed then 'solved' else 'in_progress' end,now())
  on conflict (user_id,problem_id) do update set
    code=excluded.code, language=excluded.language, updated_at=now(),
    status=case when excluded.status='solved' or public.progress.status='solved' then 'solved' else public.progress.status end;
$$;
revoke all on function public.record_run(text,text,text,boolean) from public, anon;
grant execute on function public.record_run(text,text,text,boolean) to authenticated;
