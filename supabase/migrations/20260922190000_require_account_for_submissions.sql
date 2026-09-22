alter table public.dilemma_submissions
  add column if not exists submitter_id uuid references auth.users(id) on delete set null;
create index if not exists dilemma_submissions_submitter on public.dilemma_submissions(submitter_id,created_at desc);

create or replace function public.submit_dilemma(p_locale text, p_prompt text, p_a text, p_b text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Account required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.dilemma_submissions where submitter_id=auth.uid() and created_at > now() - interval '1 hour') >= 5
 or (select count(*) from public.dilemma_submissions where status = 'pending') >= 2000 then
   raise exception 'Submission capacity reached';
 end if;
 insert into public.dilemma_submissions(locale,prompt,option_a,option_b,submitter_id)
 values(p_locale,btrim(p_prompt),btrim(p_a),btrim(p_b),auth.uid()) returning id into result;
 return result;
end;
$$;
revoke all on function public.submit_dilemma(text,text,text,text) from public;
grant execute on function public.submit_dilemma(text,text,text,text) to authenticated;
