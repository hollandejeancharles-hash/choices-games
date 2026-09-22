-- Existing installations: persistent, participant-only Duo history.
begin;
create index if not exists dilemma_duels_owner_recent on public.dilemma_duels(owner_id,created_at desc);
create index if not exists dilemma_duels_guest_recent on public.dilemma_duels(guest_id,created_at desc);
create or replace function public.list_dilemma_duos() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code',d.code,'createdAt',d.created_at,'complete',d.guest_answers is not null,
    'expired',d.expires_at<=now(),'owner',d.owner_id=auth.uid()
  ) order by d.created_at desc,d.id),'[]'::jsonb)
  from public.dilemma_duels d where d.owner_id=auth.uid() or d.guest_id=auth.uid();
$$;
revoke all on function public.list_dilemma_duos() from public;
grant execute on function public.list_dilemma_duos() to authenticated;

create or replace function public.read_dilemma_duel(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.dilemma_duels%rowtype; allowed boolean;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  select * into d from public.dilemma_duels where code=upper(btrim(p_code));
  if d.id is null then raise exception 'duel-not-found'; end if;
  if d.expires_at<=now() and not (d.guest_answers is not null and (d.owner_id=auth.uid() or d.guest_id=auth.uid())) then raise exception 'duel-not-found'; end if;
  allowed:=d.owner_id=auth.uid() or d.guest_id=auth.uid() or d.guest_id is null;
  if allowed is not true then raise exception 'duel-access-denied'; end if;
  return jsonb_build_object('code',d.code,'questions',d.question_ids,'complete',d.guest_answers is not null,'owner',d.owner_id=auth.uid(),'ownerAnswers',case when d.guest_answers is not null then d.owner_answers else null end,'guestAnswers',case when d.guest_answers is not null then d.guest_answers else null end);
end $$;

commit;
