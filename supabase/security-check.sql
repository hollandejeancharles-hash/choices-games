-- Run on a TEST project after community.sql, in SQL Editor. Everything rolls back.
begin;
set local role anon;
select public.submit_dilemma('fr','Une proposition de test suffisamment longue pour passer les contraintes.','Premier choix de test','Deuxième choix de test');
do $$ begin
 begin
  perform * from public.dilemma_submissions;
  raise exception 'FAIL: anonymous queue read allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.published_dilemmas(id,question) values(gen_random_uuid(),'{}');
  raise exception 'FAIL: anonymous publication allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
-- No JWT identity in this SQL session => not an admin.
do $$ begin
 if public.is_dilemma_admin() then raise exception 'FAIL: unexpected admin'; end if;
 if exists(select 1 from public.dilemma_submissions) then raise exception 'FAIL: ordinary queue read allowed'; end if;
 begin
  perform public.publish_dilemma(gen_random_uuid(),'{}');
  raise exception 'FAIL: ordinary publication allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.reject_dilemma(gen_random_uuid());
  raise exception 'FAIL: ordinary rejection allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
