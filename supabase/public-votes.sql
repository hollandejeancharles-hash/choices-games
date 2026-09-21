-- Anonymous aggregate voting for every dilemma. Run once as project owner.
begin;

create table if not exists public.dilemma_public_votes (
  question_id text not null check (
    char_length(question_id) between 2 and 100
    and question_id ~ '^[A-Za-z0-9_-]+$'
  ),
  voter_id uuid not null,
  option smallint not null check (option in (0, 1)),
  updated_at timestamptz not null default now(),
  primary key (question_id, voter_id)
);

create index if not exists dilemma_public_votes_question
  on public.dilemma_public_votes(question_id, option);

alter table public.dilemma_public_votes enable row level security;
revoke all on public.dilemma_public_votes from anon, authenticated;

create or replace function public.dilemma_public_vote(
  p_question text,
  p_voter uuid,
  p_option integer default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  mine integer;
  count_a bigint;
  count_b bigint;
begin
  if p_voter is null then raise exception 'invalid-voter'; end if;
  if char_length(p_question) not between 2 and 100
    or p_question !~ '^[A-Za-z0-9_-]+$'
  then raise exception 'invalid-question'; end if;

  if p_option is not null then
    if p_option not in (0, 1) then raise exception 'invalid-option'; end if;
    insert into public.dilemma_public_votes(question_id, voter_id, option)
    values (p_question, p_voter, p_option)
    on conflict (question_id, voter_id) do update
      set option = excluded.option, updated_at = now();
  end if;

  select option into mine
  from public.dilemma_public_votes
  where question_id = p_question and voter_id = p_voter;

  select
    count(*) filter (where option = 0),
    count(*) filter (where option = 1)
  into count_a, count_b
  from public.dilemma_public_votes
  where question_id = p_question;

  return jsonb_build_object(
    'mine', mine,
    'a', count_a,
    'b', count_b
  );
end $$;

revoke all on function public.dilemma_public_vote(text, uuid, integer) from public;
grant execute on function public.dilemma_public_vote(text, uuid, integer)
  to anon, authenticated;

commit;
