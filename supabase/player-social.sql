-- Account controls, daily dilemma, asynchronous duels and private circles.
begin;

create table if not exists public.dilemma_daily_answers (
  day date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 2 and 100),
  option smallint not null check (option in (0, 1)),
  answered_at timestamptz not null default now(),
  primary key (day, user_id)
);
alter table public.dilemma_daily_answers enable row level security;
revoke all on public.dilemma_daily_answers from anon, authenticated;

create or replace function public.dilemma_daily_vote(p_day date, p_question text, p_option integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare mine integer; a bigint; b bigint;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if p_day is distinct from current_date then raise exception 'invalid-day'; end if;
  if char_length(p_question) not between 2 and 100 then raise exception 'invalid-question'; end if;
  if p_option is not null then
    if p_option not in (0, 1) then raise exception 'invalid-option'; end if;
    insert into public.dilemma_daily_answers(day,user_id,question_id,option)
    values(p_day,auth.uid(),p_question,p_option)
    on conflict(day,user_id) do update set question_id=excluded.question_id,option=excluded.option,answered_at=now();
  end if;
  select option into mine from public.dilemma_daily_answers where day=p_day and user_id=auth.uid() and question_id=p_question;
  select count(*) filter(where option=0),count(*) filter(where option=1) into a,b
  from public.dilemma_daily_answers where day=p_day and question_id=p_question;
  return jsonb_build_object('mine',mine,'a',a,'b',b);
end $$;
revoke all on function public.dilemma_daily_vote(date,text,integer) from public;
grant execute on function public.dilemma_daily_vote(date,text,integer) to authenticated;

create table if not exists public.dilemma_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.dilemma_circle_members (
  circle_id uuid not null references public.dilemma_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(circle_id,user_id)
);
alter table public.dilemma_circles enable row level security;
alter table public.dilemma_circle_members enable row level security;
revoke all on public.dilemma_circles,public.dilemma_circle_members from anon,authenticated;

create table if not exists public.dilemma_duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete cascade,
  circle_id uuid references public.dilemma_circles(id) on delete set null,
  question_ids jsonb not null check (jsonb_typeof(question_ids)='array' and jsonb_array_length(question_ids)=5),
  owner_answers jsonb not null check (jsonb_typeof(owner_answers)='array' and jsonb_array_length(owner_answers)=5),
  guest_answers jsonb check (guest_answers is null or (jsonb_typeof(guest_answers)='array' and jsonb_array_length(guest_answers)=5)),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default now()+interval '14 days'
);
create index if not exists dilemma_duels_circle_recent on public.dilemma_duels(circle_id,created_at desc);
alter table public.dilemma_duels enable row level security;
revoke all on public.dilemma_duels from anon,authenticated;

create or replace function public.create_dilemma_circle(p_name text) returns text
language plpgsql security definer set search_path='' as $$
declare new_id uuid; new_code text;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if char_length(btrim(p_name)) not between 2 and 40 then raise exception 'invalid-name'; end if;
  loop new_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); exit when not exists(select 1 from public.dilemma_circles where code=new_code); end loop;
  insert into public.dilemma_circles(owner_id,name,code) values(auth.uid(),btrim(p_name),new_code) returning id into new_id;
  insert into public.dilemma_circle_members(circle_id,user_id) values(new_id,auth.uid());
  return new_code;
end $$;

create or replace function public.join_dilemma_circle(p_code text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  select id into target from public.dilemma_circles where code=upper(btrim(p_code));
  if target is null then raise exception 'circle-not-found'; end if;
  insert into public.dilemma_circle_members(circle_id,user_id) values(target,auth.uid()) on conflict do nothing;
end $$;

create or replace function public.list_dilemma_circles() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'code',c.code,'owner',c.owner_id=auth.uid(),'members',(select count(*) from public.dilemma_circle_members x where x.circle_id=c.id),'duels',(select count(*) from public.dilemma_duels d where d.circle_id=c.id and d.completed_at is not null)) order by c.created_at desc),'[]'::jsonb)
  from public.dilemma_circles c join public.dilemma_circle_members m on m.circle_id=c.id where m.user_id=auth.uid();
$$;

create or replace function public.create_dilemma_duel(p_questions jsonb,p_answers jsonb,p_circle uuid default null) returns text
language plpgsql security definer set search_path='' as $$
declare new_code text;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions)<>5 or exists(select 1 from jsonb_array_elements(p_questions) as x(value) where jsonb_typeof(value)<>'string') then raise exception 'invalid-questions'; end if;
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>5 or exists(select 1 from jsonb_array_elements(p_answers) as x(value) where value not in ('0'::jsonb,'1'::jsonb)) then raise exception 'invalid-answers'; end if;
  if p_circle is not null and not exists(select 1 from public.dilemma_circle_members where circle_id=p_circle and user_id=auth.uid()) then raise exception 'circle-access-denied'; end if;
  loop new_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); exit when not exists(select 1 from public.dilemma_duels where code=new_code); end loop;
  insert into public.dilemma_duels(code,owner_id,circle_id,question_ids,owner_answers) values(new_code,auth.uid(),p_circle,p_questions,p_answers);
  return new_code;
end $$;

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

create or replace function public.answer_dilemma_duel(p_code text,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.dilemma_duels%rowtype;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>5 or exists(select 1 from jsonb_array_elements(p_answers) as x(value) where value not in ('0'::jsonb,'1'::jsonb)) then raise exception 'invalid-answers'; end if;
  select * into d from public.dilemma_duels where code=upper(btrim(p_code)) and expires_at>now() for update;
  if d.id is null then raise exception 'duel-not-found'; end if;
  if d.owner_id=auth.uid() then raise exception 'owner-cannot-join'; end if;
  if d.guest_id is not null and d.guest_id<>auth.uid() then raise exception 'duel-already-claimed'; end if;
  update public.dilemma_duels set guest_id=auth.uid(),guest_answers=p_answers,completed_at=coalesce(completed_at,now()) where id=d.id;
  return public.read_dilemma_duel(p_code);
end $$;

create or replace function public.circle_dilemma_history(p_circle uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select case when exists(select 1 from public.dilemma_circle_members where circle_id=p_circle and user_id=auth.uid()) then
    coalesce((select jsonb_agg(jsonb_build_object('code',d.code,'completedAt',d.completed_at,'agreements',(select count(*) from generate_series(0,4) i where d.owner_answers->i=d.guest_answers->i)) order by d.completed_at desc) from public.dilemma_duels d where d.circle_id=p_circle and d.completed_at is not null),'[]'::jsonb)
  else '[]'::jsonb end;
$$;

create or replace function public.delete_dilemma_player_account() returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  delete from auth.users where id=auth.uid();
end $$;

revoke all on function public.create_dilemma_circle(text),public.join_dilemma_circle(text),public.list_dilemma_circles(),public.create_dilemma_duel(jsonb,jsonb,uuid),public.read_dilemma_duel(text),public.answer_dilemma_duel(text,jsonb),public.circle_dilemma_history(uuid),public.delete_dilemma_player_account() from public;
grant execute on function public.create_dilemma_circle(text),public.join_dilemma_circle(text),public.list_dilemma_circles(),public.create_dilemma_duel(jsonb,jsonb,uuid),public.read_dilemma_duel(text),public.answer_dilemma_duel(text,jsonb),public.circle_dilemma_history(uuid),public.delete_dilemma_player_account() to authenticated;

commit;
