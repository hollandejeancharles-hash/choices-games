-- Create and invite a Duo before either participant answers.
begin;

alter table public.dilemma_duels
  alter column owner_answers drop not null;

create or replace function public.create_dilemma_duel_v3(
  p_questions jsonb,
  p_circle uuid default null
) returns text
language plpgsql security definer set search_path='' as $$
declare new_code text;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if jsonb_typeof(p_questions) is distinct from 'array'
    or jsonb_array_length(p_questions)<>5
    or exists(
      select 1 from jsonb_array_elements(p_questions) as x(value)
      where jsonb_typeof(value)<>'string'
    )
  then raise exception 'invalid-questions'; end if;
  if p_circle is not null and not exists(
    select 1 from public.dilemma_circle_members
    where circle_id=p_circle and user_id=auth.uid()
  ) then raise exception 'circle-access-denied'; end if;
  loop
    new_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    exit when not exists(select 1 from public.dilemma_duels where code=new_code);
  end loop;
  insert into public.dilemma_duels(code,owner_id,circle_id,question_ids,owner_answers)
    values(new_code,auth.uid(),p_circle,p_questions,null);
  return new_code;
end $$;

create or replace function public.read_dilemma_duel(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  d public.dilemma_duels%rowtype;
  target uuid;
  allowed boolean;
  complete boolean;
  is_owner boolean;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  select * into d from public.dilemma_duels where code=upper(btrim(p_code));
  if d.id is null then raise exception 'duel-not-found'; end if;
  select recipient_id into target
    from public.dilemma_duel_invitations where duel_id=d.id;
  complete:=d.owner_answers is not null and d.guest_answers is not null;
  if d.expires_at<=now() and not (
    complete and (d.owner_id=auth.uid() or d.guest_id=auth.uid())
  ) then raise exception 'duel-not-found'; end if;
  allowed:=d.owner_id=auth.uid()
    or d.guest_id=auth.uid()
    or (d.guest_id is null and (target is null or target=auth.uid()));
  if allowed is not true then raise exception 'duel-access-denied'; end if;
  is_owner:=d.owner_id=auth.uid();
  return jsonb_build_object(
    'code',d.code,
    'questions',d.question_ids,
    'complete',complete,
    'owner',is_owner,
    'mineAnswered',case when is_owner then d.owner_answers is not null else d.guest_answers is not null end,
    'partnerAnswered',case when is_owner then d.guest_answers is not null else d.owner_answers is not null end,
    'ownerAnswers',case when complete then d.owner_answers else null end,
    'guestAnswers',case when complete then d.guest_answers else null end,
    'ownerGuesses',case when complete then d.owner_guesses else null end,
    'guestGuesses',case when complete then d.guest_guesses else null end
  );
end $$;

create or replace function public.answer_dilemma_duel_v3(
  p_code text,
  p_answers jsonb,
  p_guesses jsonb default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  d public.dilemma_duels%rowtype;
  target uuid;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if jsonb_typeof(p_answers) is distinct from 'array'
    or jsonb_array_length(p_answers)<>5
    or exists(
      select 1 from jsonb_array_elements(p_answers) as x(value)
      where value not in ('0'::jsonb,'1'::jsonb)
    )
  then raise exception 'invalid-answers'; end if;
  if p_guesses is not null and (
    jsonb_typeof(p_guesses) is distinct from 'array'
    or jsonb_array_length(p_guesses)<>5
    or exists(
      select 1 from jsonb_array_elements(p_guesses) as x(value)
      where value not in ('0'::jsonb,'1'::jsonb)
    )
  ) then raise exception 'invalid-guesses'; end if;
  select * into d from public.dilemma_duels
    where code=upper(btrim(p_code)) and expires_at>now() for update;
  if d.id is null then raise exception 'duel-not-found'; end if;

  if d.owner_id=auth.uid() then
    if d.owner_answers is not null then raise exception 'already-answered'; end if;
    update public.dilemma_duels
      set owner_answers=p_answers,owner_guesses=p_guesses
      where id=d.id;
  else
    select recipient_id into target
      from public.dilemma_duel_invitations where duel_id=d.id;
    if d.guest_id is not null and d.guest_id<>auth.uid() then
      raise exception 'duel-already-claimed';
    end if;
    if d.guest_id is null and target is not null and target<>auth.uid() then
      raise exception 'duel-access-denied';
    end if;
    if d.guest_answers is not null then raise exception 'already-answered'; end if;
    update public.dilemma_duels
      set guest_id=auth.uid(),guest_answers=p_answers,guest_guesses=p_guesses
      where id=d.id;
  end if;

  update public.dilemma_duels
    set completed_at=coalesce(completed_at,now())
    where id=d.id and owner_answers is not null and guest_answers is not null;
  return public.read_dilemma_duel(p_code);
end $$;

create or replace function public.list_dilemma_duos() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code',d.code,
    'createdAt',d.created_at,
    'complete',d.owner_answers is not null and d.guest_answers is not null,
    'expired',d.expires_at<=now(),
    'owner',d.owner_id=auth.uid(),
    'invited',di.recipient_id=auth.uid() and d.guest_id is null,
    'mineAnswered',case
      when d.owner_id=auth.uid() then d.owner_answers is not null
      else d.guest_answers is not null
    end,
    'partnerAnswered',case
      when d.owner_id=auth.uid() then d.guest_answers is not null
      else d.owner_answers is not null
    end
  ) order by d.created_at desc,d.id),'[]'::jsonb)
  from public.dilemma_duels d
  left join public.dilemma_duel_invitations di on di.duel_id=d.id
  where d.owner_id=auth.uid() or d.guest_id=auth.uid() or di.recipient_id=auth.uid();
$$;

revoke all on function public.create_dilemma_duel_v3(jsonb,uuid),
  public.answer_dilemma_duel_v3(text,jsonb,jsonb) from public;
grant execute on function public.create_dilemma_duel_v3(jsonb,uuid),
  public.answer_dilemma_duel_v3(text,jsonb,jsonb) to authenticated;

commit;
