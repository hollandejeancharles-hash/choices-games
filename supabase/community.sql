-- Run once in a new Supabase project's SQL Editor as database owner.
begin;
create table public.dilemma_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.dilemma_admins enable row level security;
revoke all on public.dilemma_admins from anon, authenticated;
create function public.is_dilemma_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.dilemma_admins where user_id = auth.uid());
$$;
revoke all on function public.is_dilemma_admin() from public;
grant execute on function public.is_dilemma_admin() to authenticated;

create table public.dilemma_submissions (
 id uuid primary key default gen_random_uuid(),
 locale text not null check(locale in ('fr','en')),
 prompt text not null check(char_length(btrim(prompt)) between 30 and 1200),
 option_a text not null check(char_length(btrim(option_a)) between 10 and 500),
 option_b text not null check(char_length(btrim(option_b)) between 10 and 500),
 submitter_id uuid references auth.users(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 check(btrim(option_a) <> btrim(option_b))
);
create index on public.dilemma_submissions(created_at);
alter table public.dilemma_submissions enable row level security;
revoke all on public.dilemma_submissions from anon, authenticated;
grant select on public.dilemma_submissions to authenticated;
create policy admin_read on public.dilemma_submissions for select to authenticated using ((select public.is_dilemma_admin()));

create table public.published_dilemmas (
 id uuid primary key references public.dilemma_submissions(id),
 question jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.published_dilemmas enable row level security;
revoke all on public.published_dilemmas from anon, authenticated;
grant select on public.published_dilemmas to anon, authenticated;
create policy published_read on public.published_dilemmas for select to anon, authenticated using(true);

-- The form is public, but submission requires a verified player session.
create function public.submit_dilemma(p_locale text, p_prompt text, p_a text, p_b text) returns uuid
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

create function public.publish_dilemma(p_id uuid, p_draft jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare field text; content text; axis text; current_status text; q jsonb;
begin
 if not public.is_dilemma_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 select status into current_status from public.dilemma_submissions where id=p_id for update;
 if current_status is distinct from 'pending' then raise exception 'Not pending'; end if;
 if jsonb_typeof(p_draft) is distinct from 'object' then raise exception 'Invalid draft'; end if;
 foreach field in array array['prompt_fr','prompt_en','a_fr','a_en','b_fr','b_en'] loop
   if jsonb_typeof(p_draft->field) is distinct from 'string' then raise exception 'Missing text'; end if;
   content := btrim(p_draft->>field);
   if left(field,6)='prompt' then
     if char_length(content) not between 30 and 1200 then raise exception 'Invalid scenario length'; end if;
   elsif char_length(content) not between 10 and 500 then raise exception 'Invalid choice length'; end if;
 end loop;
 if btrim(p_draft->>'a_fr')=btrim(p_draft->>'b_fr') or btrim(p_draft->>'a_en')=btrim(p_draft->>'b_en') then raise exception 'Choices must differ'; end if;
 axis := p_draft->>'axis';
 if axis is null or axis not in ('adventure','reason','independence','future','structure','ambition') then raise exception 'Invalid axis'; end if;
 if (select count(*) from public.published_dilemmas)>=1000 then raise exception 'Catalog capacity reached'; end if;
 q := jsonb_build_object('id','community-'||p_id,'theme','ethics',
  'prompt',jsonb_build_object('fr',btrim(p_draft->>'prompt_fr'),'en',btrim(p_draft->>'prompt_en')),
  'options',jsonb_build_array(
    jsonb_build_object('text',jsonb_build_object('fr',btrim(p_draft->>'a_fr'),'en',btrim(p_draft->>'a_en')),'weights',jsonb_build_object(axis,3)),
    jsonb_build_object('text',jsonb_build_object('fr',btrim(p_draft->>'b_fr'),'en',btrim(p_draft->>'b_en')),'weights',jsonb_build_object(axis,-3))));
 insert into public.published_dilemmas(id,question) values(p_id,q);
 -- Keep online room validation in sync with the balanced local catalog.
 insert into public.dilemma_room_questions(id,pack,axis,question)
 values ('balanced-community-'||p_id,'general',axis,
 q || jsonb_build_object('id','balanced-community-'||p_id,'pack','general','stableScoring',true));
 update public.dilemma_submissions set status='published',reviewed_at=now(),reviewed_by=auth.uid() where id=p_id;
end;
$$;
revoke all on function public.publish_dilemma(uuid,jsonb) from public;
grant execute on function public.publish_dilemma(uuid,jsonb) to authenticated;

create function public.reject_dilemma(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_dilemma_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 update public.dilemma_submissions set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where id=p_id and status='pending';
 if not found then raise exception 'Not pending'; end if;
end;
$$;
revoke all on function public.reject_dilemma(uuid) from public;
grant execute on function public.reject_dilemma(uuid) to authenticated;
commit;
