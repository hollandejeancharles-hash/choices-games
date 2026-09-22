-- Apply after player-social.sql. All relationship changes require explicit acceptance.
begin;
create table if not exists public.dilemma_friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_a,user_b), check(user_a<user_b)
);
create table if not exists public.dilemma_invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  circle_id uuid references public.dilemma_circles(id) on delete cascade,
  kind text not null check(kind in ('circle','friend')),
  email text,
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  recipient_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '14 days',
  delivery text not null default 'unsent' check(delivery in ('unsent','sending','sent','failed')),
  last_sent_at timestamptz,
  attempt_id uuid,
  send_attempts integer not null default 0,
  check ((kind='circle')=(circle_id is not null))
);
create index if not exists dilemma_invites_sender on public.dilemma_invitations(sender_id,created_at desc);
create index if not exists dilemma_invites_email on public.dilemma_invitations(email) where status='pending';
alter table public.dilemma_friendships enable row level security;
alter table public.dilemma_invitations enable row level security;
revoke all on public.dilemma_friendships, public.dilemma_invitations from anon,authenticated;

create or replace function public.create_dilemma_invitation(p_kind text,p_circle uuid default null,p_email text default null,p_request uuid default gen_random_uuid()) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.dilemma_invitations%rowtype; e text:=nullif(lower(btrim(p_email)),''); own_email text;
begin
 if auth.uid() is null then raise exception 'sign-in-required'; end if;
 -- Serialize quotas per sender; repeated request IDs return the same invitation.
 perform 1 from auth.users where id=auth.uid() for update;
 select * into i from public.dilemma_invitations where id=p_request and sender_id=auth.uid();
 if found then return jsonb_build_object('id',i.id,'token',i.token); end if;
 select lower(email) into own_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if own_email is null then raise exception 'verified-email-required'; end if;
 if p_kind not in ('friend','circle') or p_kind is null or ((p_kind='circle') is distinct from (p_circle is not null)) then raise exception 'invalid-kind'; end if;
 if p_circle is not null and not exists(select 1 from public.dilemma_circle_members where circle_id=p_circle and user_id=auth.uid()) then raise exception 'circle-access-denied'; end if;
 if e is not null and (length(e)>254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'invalid-email'; end if;
 if e=own_email then raise exception 'self-invitation'; end if;
 if (select count(*) from public.dilemma_invitations where sender_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'rate-limit'; end if;
 if e is not null and (select count(*) from public.dilemma_invitations where sender_id=auth.uid() and email=e and created_at>now()-interval '1 day')>=3 then raise exception 'rate-limit'; end if;
 insert into public.dilemma_invitations(id,sender_id,kind,circle_id,email) values(p_request,auth.uid(),p_kind,p_circle,e) returning * into i;
 return jsonb_build_object('id',i.id,'token',i.token);
end $$;

create or replace function public.dilemma_social_state() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'friends',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Joueur')) order by f.created_at desc)
 from public.dilemma_friendships f join auth.users u on u.id=case when f.user_a=auth.uid() then f.user_b else f.user_a end where auth.uid() in (f.user_a,f.user_b)),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object(
 'id',i.id,'token',case when i.sender_id=auth.uid() or i.status='pending' then i.token else null end,
 'kind',i.kind,'circleName',c.name,'senderName',coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Joueur'),
 'outgoing',i.sender_id=auth.uid(),'email',case when i.sender_id=auth.uid() then i.email else null end,
 'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
 'delivery',i.delivery,'createdAt',i.created_at)
 order by i.created_at desc) from public.dilemma_invitations i join auth.users u on u.id=i.sender_id left join public.dilemma_circles c on c.id=i.circle_id
 where i.sender_id=auth.uid() or i.recipient_id=auth.uid() or (i.status='pending' and i.email=(select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null))),'[]'::jsonb));
$$;

create or replace function public.preview_dilemma_invitation(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i public.dilemma_invitations%rowtype; e text;
begin
 if auth.uid() is null then raise exception 'sign-in-required'; end if;
 select * into i from public.dilemma_invitations where token=p_token;
 if not found or i.status<>'pending' or i.expires_at<=now() then raise exception 'invitation-unavailable'; end if;
 select lower(email) into e from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if i.email is not null and e is distinct from i.email and i.sender_id<>auth.uid() then raise exception 'wrong-account'; end if;
 return jsonb_build_object('token',i.token,'kind',i.kind,'outgoing',i.sender_id=auth.uid(),'senderName',(select coalesce(nullif(raw_user_meta_data->>'display_name',''),'Joueur') from auth.users where id=i.sender_id),'circleName',(select name from public.dilemma_circles where id=i.circle_id));
end $$;

create or replace function public.respond_dilemma_invitation(p_token uuid,p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare i public.dilemma_invitations%rowtype; e text;
begin
 if auth.uid() is null then raise exception 'sign-in-required'; end if;
 select * into i from public.dilemma_invitations where token=p_token for update;
 if not found then raise exception 'invitation-unavailable'; end if;
 if i.recipient_id=auth.uid() and i.status=(case when p_accept then 'accepted' else 'declined' end) then return; end if;
 if i.status<>'pending' or i.expires_at<=now() then raise exception 'invitation-unavailable'; end if;
 select lower(email) into e from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if e is null then raise exception 'verified-email-required'; end if;
 if i.sender_id=auth.uid() then raise exception 'self-invitation'; end if;
 if i.email is not null and e is distinct from i.email then raise exception 'wrong-account'; end if;
 if p_accept and i.kind='circle' then
   if not exists(select 1 from public.dilemma_circle_members where circle_id=i.circle_id and user_id=i.sender_id) then raise exception 'invitation-unavailable'; end if;
   insert into public.dilemma_circle_members(circle_id,user_id) values(i.circle_id,auth.uid()) on conflict do nothing;
 elsif p_accept and i.kind='friend' then
   insert into public.dilemma_friendships(user_a,user_b) values(least(i.sender_id,auth.uid()),greatest(i.sender_id,auth.uid())) on conflict do nothing;
 end if;
 update public.dilemma_invitations set status=case when p_accept then 'accepted' else 'declined' end,recipient_id=auth.uid() where id=i.id;
end $$;

create or replace function public.cancel_dilemma_invitation(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'sign-in-required'; end if;
 update public.dilemma_invitations set status='cancelled' where id=p_id and sender_id=auth.uid() and status='pending';
 if not found then raise exception 'invitation-unavailable'; end if;
end $$;

create or replace function public.remove_dilemma_friend(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'sign-in-required'; end if;
 delete from public.dilemma_friendships where user_a=least(auth.uid(),p_user) and user_b=greatest(auth.uid(),p_user);
end $$;

-- Only the authenticated Edge Function (service role) can claim and finish mail delivery.
create or replace function public.claim_dilemma_invitation_email(p_id uuid,p_sender uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.dilemma_invitations%rowtype;
begin
 perform 1 from auth.users where id=p_sender for update;
 select * into i from public.dilemma_invitations where id=p_id and sender_id=p_sender for update;
 if not found or i.email is null or i.status<>'pending' or i.expires_at<=now() then raise exception 'invitation-unavailable'; end if;
 if i.send_attempts>=5 then raise exception 'rate-limit'; end if;
 if i.last_sent_at>now()-interval '1 minute' then raise exception 'rate-limit'; end if;
 if (select count(*) from public.dilemma_invitations where sender_id=p_sender and last_sent_at>now()-interval '1 hour')>=10 then raise exception 'rate-limit'; end if;
 update public.dilemma_invitations set delivery='sending',last_sent_at=now(),send_attempts=send_attempts+1,attempt_id=case when delivery='sent' or attempt_id is null then gen_random_uuid() else attempt_id end where id=p_id returning * into i;
 return jsonb_build_object('email',i.email,'token',i.token,'attempt',i.attempt_id,'kind',i.kind);
end $$;
create or replace function public.finish_dilemma_invitation_email(p_id uuid,p_attempt uuid,p_sent boolean) returns void
language sql security definer set search_path='' as $$
 update public.dilemma_invitations set delivery=case when p_sent then 'sent' else 'failed' end where id=p_id and attempt_id=p_attempt;
$$;

revoke all on function public.create_dilemma_invitation(text,uuid,text,uuid),public.dilemma_social_state(),public.preview_dilemma_invitation(uuid),public.respond_dilemma_invitation(uuid,boolean),public.cancel_dilemma_invitation(uuid),public.remove_dilemma_friend(uuid),public.claim_dilemma_invitation_email(uuid,uuid),public.finish_dilemma_invitation_email(uuid,uuid,boolean) from public;
grant execute on function public.create_dilemma_invitation(text,uuid,text,uuid),public.dilemma_social_state(),public.preview_dilemma_invitation(uuid),public.respond_dilemma_invitation(uuid,boolean),public.cancel_dilemma_invitation(uuid),public.remove_dilemma_friend(uuid) to authenticated;
grant execute on function public.claim_dilemma_invitation_email(uuid,uuid),public.finish_dilemma_invitation_email(uuid,uuid,boolean) to service_role;
commit;
