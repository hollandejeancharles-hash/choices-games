-- Targeted Duo invitations: in-account notification plus transactional email.
begin;

create table if not exists public.dilemma_duel_invitations (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null unique references public.dilemma_duels(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete set null,
  email text not null,
  created_at timestamptz not null default now(),
  delivery text not null default 'unsent' check(delivery in ('unsent','sending','sent','failed')),
  last_sent_at timestamptz,
  attempt_id uuid,
  send_attempts integer not null default 0
);
create index if not exists dilemma_duel_invites_recipient on public.dilemma_duel_invitations(recipient_id,created_at desc);
alter table public.dilemma_duel_invitations enable row level security;
revoke all on public.dilemma_duel_invitations from anon,authenticated;

create or replace function public.create_dilemma_duel_invitation(p_code text,p_friend uuid default null,p_email text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.dilemma_duels%rowtype; target uuid; e text; own_email text; invite_id uuid;
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  select * into d from public.dilemma_duels where code=upper(btrim(p_code)) and owner_id=auth.uid() and guest_id is null and expires_at>now();
  if not found then raise exception 'duel-unavailable'; end if;
  if (p_friend is null)=(nullif(btrim(p_email),'') is null) then raise exception 'choose-one-recipient'; end if;
  select lower(email) into own_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if p_friend is not null then
    if not exists(select 1 from public.dilemma_friendships where user_a=least(auth.uid(),p_friend) and user_b=greatest(auth.uid(),p_friend)) then raise exception 'friend-required'; end if;
    target:=p_friend;
    select lower(email) into e from auth.users where id=target and email_confirmed_at is not null;
  else
    e:=lower(btrim(p_email));
    if length(e)>254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid-email'; end if;
    select id into target from auth.users where lower(email)=e and email_confirmed_at is not null limit 1;
  end if;
  if e is null then raise exception 'verified-email-required'; end if;
  if e=own_email or target=auth.uid() then raise exception 'self-invitation'; end if;
  if (select count(*) from public.dilemma_duel_invitations where sender_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'rate-limit'; end if;
  insert into public.dilemma_duel_invitations(duel_id,sender_id,recipient_id,email)
    values(d.id,auth.uid(),target,e)
    on conflict(duel_id) do update set recipient_id=excluded.recipient_id,email=excluded.email
    returning id into invite_id;
  return jsonb_build_object('id',invite_id,'recipientFound',target is not null);
end $$;

create or replace function public.list_dilemma_duos() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code',d.code,'createdAt',d.created_at,'complete',d.guest_answers is not null,
    'expired',d.expires_at<=now(),'owner',d.owner_id=auth.uid(),
    'invited',di.recipient_id=auth.uid() and d.guest_id is null
  ) order by d.created_at desc,d.id),'[]'::jsonb)
  from public.dilemma_duels d
  left join public.dilemma_duel_invitations di on di.duel_id=d.id
  where d.owner_id=auth.uid() or d.guest_id=auth.uid() or di.recipient_id=auth.uid();
$$;

create or replace function public.claim_dilemma_duel_email(p_id uuid,p_sender uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.dilemma_duel_invitations%rowtype; code text;
begin
  perform 1 from auth.users where id=p_sender for update;
  select * into i from public.dilemma_duel_invitations where id=p_id and sender_id=p_sender for update;
  if not found then raise exception 'invitation-unavailable'; end if;
  if i.send_attempts>=5 or i.last_sent_at>now()-interval '1 minute' then raise exception 'rate-limit'; end if;
  update public.dilemma_duel_invitations set delivery='sending',last_sent_at=now(),send_attempts=send_attempts+1,attempt_id=case when delivery='sent' or attempt_id is null then gen_random_uuid() else attempt_id end where id=p_id returning * into i;
  select d.code into code from public.dilemma_duels d where d.id=i.duel_id and d.guest_id is null and d.expires_at>now();
  if code is null then raise exception 'invitation-unavailable'; end if;
  return jsonb_build_object('email',i.email,'code',code,'attempt',i.attempt_id);
end $$;

create or replace function public.finish_dilemma_duel_email(p_id uuid,p_attempt uuid,p_sent boolean) returns void
language sql security definer set search_path='' as $$
 update public.dilemma_duel_invitations set delivery=case when p_sent then 'sent' else 'failed' end where id=p_id and attempt_id=p_attempt;
$$;

revoke all on function public.create_dilemma_duel_invitation(text,uuid,text),public.claim_dilemma_duel_email(uuid,uuid),public.finish_dilemma_duel_email(uuid,uuid,boolean) from public;
grant execute on function public.create_dilemma_duel_invitation(text,uuid,text) to authenticated;
grant execute on function public.claim_dilemma_duel_email(uuid,uuid),public.finish_dilemma_duel_email(uuid,uuid,boolean) to service_role;

commit;
