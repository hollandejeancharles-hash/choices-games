create table if not exists public.dilemma_push_dispatch (
  singleton boolean primary key default true check (singleton),
  last_started_at timestamptz
);
insert into public.dilemma_push_dispatch(singleton) values(true) on conflict do nothing;
alter table public.dilemma_push_dispatch enable row level security;
revoke all on public.dilemma_push_dispatch from anon, authenticated;

create or replace function public.claim_dilemma_push_dispatch() returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
  update public.dilemma_push_dispatch
    set last_started_at=now()
    where singleton and (last_started_at is null or last_started_at < now()-interval '10 minutes')
    returning true into claimed;
  return coalesce(claimed,false);
end $$;
revoke all on function public.claim_dilemma_push_dispatch() from public;
grant execute on function public.claim_dilemma_push_dispatch() to service_role;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $$ begin
  perform cron.unschedule('dilemma-daily-push');
exception when others then null;
end $$;
select cron.schedule(
  'dilemma-daily-push',
  '5 * * * *',
  $schedule$
    select net.http_post(
      url := 'https://xkutdvtqjtamjpjbwhme.supabase.co/functions/v1/send-push',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $schedule$
);
