-- Persist each player's prediction of their partner's answers.
begin;

alter table public.dilemma_duels
  add column if not exists owner_guesses jsonb
    check (owner_guesses is null or (jsonb_typeof(owner_guesses)='array' and jsonb_array_length(owner_guesses)=5)),
  add column if not exists guest_guesses jsonb
    check (guest_guesses is null or (jsonb_typeof(guest_guesses)='array' and jsonb_array_length(guest_guesses)=5));

create or replace function public.create_dilemma_duel_v2(
  p_questions jsonb,
  p_answers jsonb,
  p_circle uuid default null,
  p_guesses jsonb default null
) returns text
language plpgsql security definer set search_path='' as $$
declare new_code text;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions)<>5 or exists(select 1 from jsonb_array_elements(p_questions) as x(value) where jsonb_typeof(value)<>'string') then raise exception 'invalid-questions'; end if;
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>5 or exists(select 1 from jsonb_array_elements(p_answers) as x(value) where value not in ('0'::jsonb,'1'::jsonb)) then raise exception 'invalid-answers'; end if;
  if p_guesses is not null and (jsonb_typeof(p_guesses) is distinct from 'array' or jsonb_array_length(p_guesses)<>5 or exists(select 1 from jsonb_array_elements(p_guesses) as x(value) where value not in ('0'::jsonb,'1'::jsonb))) then raise exception 'invalid-guesses'; end if;
  if p_circle is not null and not exists(select 1 from public.dilemma_circle_members where circle_id=p_circle and user_id=auth.uid()) then raise exception 'circle-access-denied'; end if;
  loop new_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); exit when not exists(select 1 from public.dilemma_duels where code=new_code); end loop;
  insert into public.dilemma_duels(code,owner_id,circle_id,question_ids,owner_answers,owner_guesses)
    values(new_code,auth.uid(),p_circle,p_questions,p_answers,p_guesses);
  return new_code;
end $$;

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
  return jsonb_build_object(
    'code',d.code,'questions',d.question_ids,'complete',d.guest_answers is not null,
    'owner',d.owner_id=auth.uid(),
    'ownerAnswers',case when d.guest_answers is not null then d.owner_answers else null end,
    'guestAnswers',case when d.guest_answers is not null then d.guest_answers else null end,
    'ownerGuesses',case when d.guest_answers is not null then d.owner_guesses else null end,
    'guestGuesses',case when d.guest_answers is not null then d.guest_guesses else null end
  );
end $$;

create or replace function public.answer_dilemma_duel_v2(
  p_code text,
  p_answers jsonb,
  p_guesses jsonb default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.dilemma_duels%rowtype;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>5 or exists(select 1 from jsonb_array_elements(p_answers) as x(value) where value not in ('0'::jsonb,'1'::jsonb)) then raise exception 'invalid-answers'; end if;
  if p_guesses is not null and (jsonb_typeof(p_guesses) is distinct from 'array' or jsonb_array_length(p_guesses)<>5 or exists(select 1 from jsonb_array_elements(p_guesses) as x(value) where value not in ('0'::jsonb,'1'::jsonb))) then raise exception 'invalid-guesses'; end if;
  select * into d from public.dilemma_duels where code=upper(btrim(p_code)) and expires_at>now() for update;
  if d.id is null then raise exception 'duel-not-found'; end if;
  if d.owner_id=auth.uid() then raise exception 'owner-cannot-join'; end if;
  if d.guest_id is not null and d.guest_id<>auth.uid() then raise exception 'duel-already-claimed'; end if;
  update public.dilemma_duels set guest_id=auth.uid(),guest_answers=p_answers,guest_guesses=p_guesses,completed_at=coalesce(completed_at,now()) where id=d.id;
  return public.read_dilemma_duel(p_code);
end $$;

revoke all on function public.create_dilemma_duel_v2(jsonb,jsonb,uuid,jsonb), public.answer_dilemma_duel_v2(text,jsonb,jsonb) from public;
grant execute on function public.create_dilemma_duel_v2(jsonb,jsonb,uuid,jsonb), public.answer_dilemma_duel_v2(text,jsonb,jsonb) to authenticated;

commit;
