-- Dilemme private rooms v2. Run as project owner. Idempotent, preserves existing rooms.
begin;
create table if not exists public.dilemma_room_questions (id text primary key, pack text not null, axis text not null, question jsonb not null);
create table if not exists public.dilemma_rooms (
 code text primary key, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '2 hours',
 phase text not null default 'lobby' check(phase in ('lobby','question','reveal','finished','closed')),
 host_id uuid not null, settings jsonb not null, deck jsonb not null, round integer not null default 0, started_at timestamptz,
 seed integer not null default floor(random()*2147483647)::integer
);
create table if not exists public.dilemma_room_players (
 id uuid primary key default gen_random_uuid(), code text not null references public.dilemma_rooms(code) on delete cascade,
 token_hash bytea unique not null, name text not null check(length(name) between 1 and 40), joined_at timestamptz not null default now(), seen_at timestamptz not null default now()
);
create table if not exists public.dilemma_room_answers (
 code text not null references public.dilemma_rooms(code) on delete cascade, player_id uuid not null references public.dilemma_room_players(id) on delete cascade,
 round integer not null, option integer not null check(option in (0,1)), duration integer not null check(duration>=0), primary key(code,player_id,round)
);
alter table public.dilemma_room_answers add column if not exists guesses jsonb not null default '{}'::jsonb;
alter table public.dilemma_room_questions enable row level security;
alter table public.dilemma_rooms enable row level security;
alter table public.dilemma_room_players enable row level security;
alter table public.dilemma_room_answers enable row level security;
revoke all on public.dilemma_room_questions,public.dilemma_rooms,public.dilemma_room_players,public.dilemma_room_answers from public,anon,authenticated;
create or replace function public.dilemma_room(action text, token text, room_code text default '', payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 r public.dilemma_rooms%rowtype; p public.dilemma_room_players%rowtype; tok bytea; new_code text; member uuid; settings jsonb;
 ids text[]; deck jsonb; n integer; total integer; idx integer; target integer; opts integer; expose boolean; result jsonb;
begin
 if token is null or token !~ '^[a-f0-9-]{36}$' then raise exception 'invalid-token'; end if;
 tok:=sha256(convert_to(token,'UTF8'));
 if action='create' then
   perform pg_advisory_xact_lock(912735);
   select * into p from public.dilemma_room_players where token_hash=tok;
   if found then room_code:=p.code;
   else
     delete from public.dilemma_rooms where expires_at<now();
     if (select count(*) from public.dilemma_rooms where created_at>now()-interval '1 minute')>=30 or (select count(*) from public.dilemma_rooms)>=2000 then raise exception 'busy'; end if;
     settings:=payload->'settings';
     if settings is null or settings->>'pack' not in ('general','friendship','couple','family') or settings->>'reveal' not in ('round','end') or settings->>'timer' not in ('0','20','30') or settings->>'length' not in ('10','15','25') then raise exception 'invalid-settings'; end if;
     if settings ? 'predictions' and jsonb_typeof(settings->'predictions') <> 'boolean' then raise exception 'invalid-settings'; end if;
     n:=(settings->>'length')::integer;
     select array_agg(value) into ids from jsonb_array_elements_text(payload->'deck');
     if cardinality(ids) is distinct from n or (select count(distinct v) from unnest(ids) v)<>n then raise exception 'invalid-deck'; end if;
     if (select count(*) from public.dilemma_room_questions where id=any(ids) and pack=settings->>'pack')<>n then raise exception 'catalog-mismatch'; end if;
     for idx in 1..6 loop
       target:=n/6+case when idx<=n%6 then 1 else 0 end;
       if (select count(*) from public.dilemma_room_questions where id=any(ids) and axis=(array['adventure','reason','independence','future','structure','ambition'])[idx])<>target then raise exception 'invalid-deck'; end if;
     end loop;
     select jsonb_agg(q.question order by d.ord) into deck from unnest(ids) with ordinality d(id,ord) join public.dilemma_room_questions q on q.id=d.id;
     if length(trim(coalesce(payload->>'name',''))) not between 1 and 40 then raise exception 'invalid-name'; end if;
     member:=gen_random_uuid();
     loop
       new_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
       exit when not exists(select 1 from public.dilemma_rooms where code=new_code);
     end loop;
     insert into public.dilemma_rooms(code,host_id,settings,deck) values(new_code,member,settings,deck);
     insert into public.dilemma_room_players(id,code,token_hash,name) values(member,new_code,tok,trim(payload->>'name'));
     room_code:=new_code;
   end if;
 end if;
 room_code:=upper(trim(room_code));
 select * into r from public.dilemma_rooms where code=room_code for update;
 if not found or r.expires_at<now() then raise exception 'room-unavailable'; end if;
 select * into p from public.dilemma_room_players where code=r.code and token_hash=tok;
 if action='join' and p.id is null then
   if r.phase<>'lobby' then raise exception 'already-started'; end if;
   if (select count(*) from public.dilemma_room_players where code=r.code)>=6 then raise exception 'room-full'; end if;
   if length(trim(coalesce(payload->>'name',''))) not between 1 and 40 then raise exception 'invalid-name'; end if;
   insert into public.dilemma_room_players(code,token_hash,name) values(r.code,tok,trim(payload->>'name')) returning * into p;
 end if;
 if p.id is null then raise exception 'not-a-member'; end if;
 update public.dilemma_room_players set seen_at=now() where id=p.id;
 if action in ('start','next','close','remove') and p.id<>r.host_id then raise exception 'host-only'; end if;
 if action='close' then update public.dilemma_rooms set phase='closed' where code=r.code;
 elsif action='remove' then
   if r.phase<>'lobby' or payload->>'player'=r.host_id::text then raise exception 'invalid-action'; end if;
   delete from public.dilemma_room_players where code=r.code and id::text=payload->>'player';
 elsif action='start' and r.phase='lobby' then
   if (select count(*) from public.dilemma_room_players where code=r.code)<2 then raise exception 'need-players'; end if;
   update public.dilemma_rooms set phase='question',started_at=now() where code=r.code;
 elsif action='answer' then
   idx:=(payload->>'round')::integer; opts:=(payload->>'option')::integer;
   if idx is null or opts is null or opts not in (0,1) then raise exception 'invalid-answer'; end if;
   -- Commit the personal choice and all predictions atomically, before any reveal.
   if r.settings->>'predictions'='true' then
     if jsonb_typeof(payload->'guesses') is distinct from 'object' then raise exception 'incomplete-predictions'; end if;
     if (select count(*) from jsonb_each(payload->'guesses')) <> (select count(*)-1 from public.dilemma_room_players where code=r.code)
       or exists(select 1 from jsonb_each(payload->'guesses') g where g.value not in ('0'::jsonb,'1'::jsonb) or not exists(select 1 from public.dilemma_room_players m where m.code=r.code and m.id::text=g.key and m.id<>p.id)) then raise exception 'invalid-predictions'; end if;
   end if;
   -- Identical retries are safe; accepted predictions can never be changed.
   if exists(select 1 from public.dilemma_room_answers a where a.code=r.code and a.player_id=p.id and a.round=idx and (a.option<>opts or (r.settings->>'predictions'='true' and a.guesses is distinct from payload->'guesses'))) then raise exception 'answer-locked'; end if;
   if exists(select 1 from public.dilemma_room_answers where code=r.code and player_id=p.id and round=idx and option=opts) then null;
   else
     if r.phase<>'question' or idx<>r.round then raise exception 'stale-question'; end if;
     insert into public.dilemma_room_answers(code,player_id,round,option,guesses,duration) values(r.code,p.id,idx,opts,case when r.settings->>'predictions'='true' then payload->'guesses' else '{}'::jsonb end,least(7200000,greatest(0,floor(extract(epoch from(now()-r.started_at))*1000)::integer)));
     select count(*) into total from public.dilemma_room_players where code=r.code;
     if (select count(*) from public.dilemma_room_answers where code=r.code and round=r.round)=total then
       if r.settings->>'reveal'='round' then update public.dilemma_rooms set phase='reveal' where code=r.code;
       elsif r.round=jsonb_array_length(r.deck)-1 then update public.dilemma_rooms set phase='finished' where code=r.code;
       else update public.dilemma_rooms set round=round+1,started_at=now() where code=r.code;
       end if;
     end if;
   end if;
 elsif action='next' then
   if r.phase<>'reveal' or (payload->>'round')::integer is distinct from r.round then raise exception 'stale-question'; end if;
   if r.round=jsonb_array_length(r.deck)-1 then update public.dilemma_rooms set phase='finished' where code=r.code;
   else update public.dilemma_rooms set phase='question',round=round+1,started_at=now() where code=r.code; end if;
 elsif action not in ('create','join','state','start','answer','next','close','remove') then raise exception 'invalid-action';
 end if;
 select * into r from public.dilemma_rooms where code=room_code;
 expose:=r.phase='finished' or (r.phase='reveal' and r.settings->>'reveal'='round');
 select jsonb_build_object('code',r.code,'phase',r.phase,'round',r.round,'seed',r.seed,'settings',r.settings,'me',p.id,'host',r.host_id,'serverNow',now(),'startedAt',r.started_at,'expiresAt',r.expires_at,
 'question',case when r.phase in ('question','reveal') then r.deck->r.round else null end,
 'deck',case when r.phase='finished' then r.deck else null end,
 'players',(select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'online',m.seen_at>now()-interval '15 seconds','answered',exists(select 1 from public.dilemma_room_answers a where a.code=r.code and a.player_id=m.id and a.round=r.round)) order by m.joined_at,m.id) from public.dilemma_room_players m where m.code=r.code),
 'predictions',case when expose then coalesce((select jsonb_agg(jsonb_build_object('player',a.player_id,'target',g.key,'round',a.round,'option',g.value)) from public.dilemma_room_answers a cross join lateral jsonb_each(a.guesses) g where a.code=r.code and (r.phase='finished' or a.round=r.round)),'[]'::jsonb) else '[]'::jsonb end,
 'answers',case when expose then coalesce((select jsonb_agg(jsonb_build_object('player',a.player_id,'round',a.round,'option',a.option,'duration',a.duration)) from public.dilemma_room_answers a where a.code=r.code and (r.phase='finished' or a.round=r.round)),'[]'::jsonb) else '[]'::jsonb end) into result;
 return result;
end $$;
revoke all on function public.dilemma_room(text,text,text,jsonb) from public;
grant execute on function public.dilemma_room(text,text,text,jsonb) to anon,authenticated;
commit;
