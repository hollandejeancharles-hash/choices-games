-- Dilemme production maintenance. Run as project owner.
-- Expired multiplayer rooms are transient and all child rows use ON DELETE CASCADE.

create extension if not exists pg_cron with schema extensions;

do $$
declare
  existing_job bigint;
begin
  select jobid
    into existing_job
    from cron.job
   where jobname = 'dilemma-clean-expired-rooms';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'dilemma-clean-expired-rooms',
    '17 * * * *',
    $job$delete from public.dilemma_rooms where expires_at < now();$job$
  );
end
$$;

