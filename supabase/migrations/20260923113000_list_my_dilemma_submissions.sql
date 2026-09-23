create or replace function public.list_my_dilemma_submissions() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', submission.id,
    'locale', submission.locale,
    'prompt', submission.prompt,
    'optionA', submission.option_a,
    'optionB', submission.option_b,
    'status', submission.status,
    'createdAt', submission.created_at,
    'reviewedAt', submission.reviewed_at
  ) order by submission.created_at desc), '[]'::jsonb)
  from public.dilemma_submissions submission
  where submission.submitter_id = auth.uid();
$$;

revoke all on function public.list_my_dilemma_submissions() from public;
grant execute on function public.list_my_dilemma_submissions() to authenticated;
