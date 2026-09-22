-- Per-device Web Push subscriptions. Delivery is performed by send-push.
begin;

create table if not exists public.dilemma_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  timezone text not null default 'UTC',
  locale text not null default 'fr' check (locale in ('fr','en')),
  daily_enabled boolean not null default true,
  preferred_hour smallint not null default 18 check (preferred_hour between 0 and 23),
  last_daily_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dilemma_push_user on public.dilemma_push_subscriptions(user_id);
alter table public.dilemma_push_subscriptions enable row level security;
revoke all on public.dilemma_push_subscriptions from anon, authenticated;

create or replace function public.register_dilemma_push(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_timezone text default 'UTC',
  p_locale text default 'fr'
) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'sign-in-required'; end if;
  if length(p_endpoint)>2048 or length(p_endpoint)<20 or length(p_p256dh)<20 or length(p_auth)<8 then
    raise exception 'invalid-subscription';
  end if;
  insert into public.dilemma_push_subscriptions(user_id,endpoint,p256dh,auth_key,timezone,locale,daily_enabled,updated_at)
  values(auth.uid(),p_endpoint,p_p256dh,p_auth,coalesce(nullif(p_timezone,''),'UTC'),case when p_locale='en' then 'en' else 'fr' end,true,now())
  on conflict(endpoint) do update set
    user_id=excluded.user_id,p256dh=excluded.p256dh,auth_key=excluded.auth_key,
    timezone=excluded.timezone,locale=excluded.locale,daily_enabled=true,updated_at=now();
end $$;

create or replace function public.disable_dilemma_push() returns void
language sql security definer set search_path='' as $$
  delete from public.dilemma_push_subscriptions where user_id=auth.uid();
$$;

revoke all on function public.register_dilemma_push(text,text,text,text,text), public.disable_dilemma_push() from public;
grant execute on function public.register_dilemma_push(text,text,text,text,text), public.disable_dilemma_push() to authenticated;

commit;
