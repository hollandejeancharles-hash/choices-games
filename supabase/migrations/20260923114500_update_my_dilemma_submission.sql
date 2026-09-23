create or replace function public.update_my_dilemma_submission(
  p_id uuid,
  p_prompt text,
  p_a text,
  p_b text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Account required' using errcode = '42501';
  end if;
  if char_length(btrim(p_prompt)) not between 30 and 1200
    or char_length(btrim(p_a)) not between 10 and 500
    or char_length(btrim(p_b)) not between 10 and 500
    or btrim(p_a) = btrim(p_b) then
    raise exception 'Invalid dilemma' using errcode = '23514';
  end if;
  update public.dilemma_submissions
  set prompt = btrim(p_prompt), option_a = btrim(p_a), option_b = btrim(p_b)
  where id = p_id and submitter_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Pending submission not found' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_my_dilemma_submission(uuid,text,text,text) from public;
grant execute on function public.update_my_dilemma_submission(uuid,text,text,text) to authenticated;
