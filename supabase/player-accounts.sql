-- Private player cloud data. Run once as project owner.
begin;

create table if not exists public.dilemma_player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session jsonb not null check (jsonb_typeof(session) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.dilemma_player_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null check (char_length(fingerprint) between 3 and 100),
  completed_at timestamptz not null default now(),
  game_length integer not null check (game_length in (10, 15, 25)),
  archetype_id text not null check (char_length(archetype_id) between 2 and 40),
  vector jsonb not null check (jsonb_typeof(vector) = 'object'),
  unique (user_id, fingerprint)
);

create index if not exists dilemma_player_results_recent
  on public.dilemma_player_results(user_id, completed_at desc);

alter table public.dilemma_player_saves enable row level security;
alter table public.dilemma_player_results enable row level security;
revoke all on public.dilemma_player_saves, public.dilemma_player_results from anon;
grant select, insert, update, delete on public.dilemma_player_saves to authenticated;
grant select, insert, delete on public.dilemma_player_results to authenticated;

drop policy if exists player_owns_save on public.dilemma_player_saves;
create policy player_owns_save on public.dilemma_player_saves
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists player_reads_results on public.dilemma_player_results;
create policy player_reads_results on public.dilemma_player_results
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists player_inserts_results on public.dilemma_player_results;
create policy player_inserts_results on public.dilemma_player_results
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists player_deletes_results on public.dilemma_player_results;
create policy player_deletes_results on public.dilemma_player_results
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;
