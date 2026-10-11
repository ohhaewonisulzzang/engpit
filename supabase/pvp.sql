-- 경쟁전(실시간 1대1) 매치 기록과 티어 점수 (SQL Editor에 통째로 붙여 넣고 Run)
-- 결과는 두 사람이 각자 보고하고, 서버가 맞춰 본 뒤에 점수를 바꾼다
--  - 진 사람이 "졌다"고 보고하면 바로 확정
--  - 이긴 사람만 보고하고 상대가 90초 동안 아무 보고가 없으면 (나갔거나 끊김):
--    나간 사람은 패배(-15점), 이긴 사람은 승리만 기록하고 점수는 0 (부계정으로 승리를 쌓는 것 방지)
--  - 둘 다 이겼다고 하면 무효
--  - 같은 상대와는 하루(한국 시간) 3판, 한 사람은 하루 20판까지만 점수가 바뀜
--  - 경기 채널(pvp-m-<매치 id>)은 비공개: 그 매치의 두 사람만 메시지를 읽고 쓸 수 있음 (맨 아래 정책)
--  (두 사람이 짜고 결과를 거짓으로 보고하는 것까지는 막지 못함 — 서버가 대결을 직접 돌리지 않기 때문)

create table if not exists public.pvp_rating (
  user_id uuid    not null references public.profiles (id) on delete cascade,
  season  text    not null,                 -- 한국 시간 기준 'YYYY-MM'
  pts     integer not null default 0,
  wins    integer not null default 0,
  losses  integer not null default 0,
  primary key (user_id, season)
);
alter table public.pvp_rating enable row level security;
drop policy if exists "pvp rating is public" on public.pvp_rating;
create policy "pvp rating is public" on public.pvp_rating for select using (true);
revoke insert, update, delete on public.pvp_rating from anon, authenticated;

create or replace view public.pvp_rating_view with (security_invoker = true) as
  select r.season, r.user_id, p.username, r.pts, r.wins, r.losses
  from public.pvp_rating r join public.profiles p on p.id = r.user_id;
grant select on public.pvp_rating_view to anon, authenticated;

create table if not exists public.pvp_matches (
  id         uuid        primary key default gen_random_uuid(),
  host       uuid        not null references public.profiles (id) on delete cascade,
  guest      uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  joined     boolean     not null default false,
  host_won   boolean,                -- 각자 보고한 결과 (null = 아직 보고 안 함)
  guest_won  boolean,
  first_claim_at timestamptz,
  settled    boolean     not null default false,
  winner     uuid
);
create index if not exists pvp_matches_pair on public.pvp_matches (host, guest, created_at desc);
alter table public.pvp_matches enable row level security; -- 정책 없음: 아래 함수로만

-- 호스트가 상대를 정해서 매치를 만든다
create or replace function public.pvp_create_match(p_guest uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_guest is null or p_guest = auth.uid() then raise exception 'bad opponent'; end if;
  if not exists (select 1 from profiles where id = p_guest) then raise exception 'bad opponent'; end if;
  if (select count(*) from pvp_matches where host = auth.uid() and created_at > now() - interval '10 minutes') >= 15 then
    raise exception 'too many matches';
  end if;
  insert into pvp_matches (host, guest) values (auth.uid(), p_guest) returning id into m;
  return m;
end $$;

-- 상대(게스트)가 매치에 들어왔다고 확인
create or replace function public.pvp_join_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update pvp_matches set joined = true
  where id = p_match and guest = auth.uid() and created_at > now() - interval '5 minutes';
  if not found then raise exception 'bad match'; end if;
end $$;

-- 점수 반영 (내부용)
drop function if exists public.pvp_settle(public.pvp_matches, uuid);
create or replace function public.pvp_settle(m public.pvp_matches, win uuid, full_win boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  s text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
  lose uuid := case when win = m.host then m.guest else m.host end;
  d text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');
  today integer;
  counts boolean;
  gain integer;
begin
  update pvp_matches set settled = true, winner = win where id = m.id;
  -- 같은 상대와 오늘 3판 넘게, 또는 둘 중 한 명이 오늘 20판 넘게 했으면 점수는 그대로
  select count(*) into today from pvp_matches
    where settled and winner is not null and id <> m.id
      and ((host = m.host and guest = m.guest) or (host = m.guest and guest = m.host))
      and to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') = d;
  counts := today < 3
    and (select count(*) from pvp_matches where settled and winner is not null and id <> m.id and m.host in (host, guest)
           and to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') = d) < 20
    and (select count(*) from pvp_matches where settled and winner is not null and id <> m.id and m.guest in (host, guest)
           and to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') = d) < 20;
  gain := case when counts and full_win then 25 else 0 end;
  insert into pvp_rating (user_id, season, pts, wins) values (win, s, gain, 1)
    on conflict (user_id, season) do update
    set pts = pvp_rating.pts + gain, wins = pvp_rating.wins + 1;
  insert into pvp_rating (user_id, season, pts, losses) values (lose, s, 0, 1)
    on conflict (user_id, season) do update
    set pts = greatest(0, pvp_rating.pts - case when counts then 15 else 0 end), losses = pvp_rating.losses + 1;
end $$;
revoke all on function public.pvp_settle(public.pvp_matches, uuid, boolean) from public, anon, authenticated;

-- 결과 보고. 돌려주는 값: 'win' | 'loss' | 'pending'(상대 보고를 기다리는 중) | 'void'(무효) | 'done'(이미 끝남)
create or replace function public.pvp_report(p_match uuid, p_won boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  m public.pvp_matches;
  me uuid := auth.uid();
  opp uuid;
begin
  if me is null then raise exception 'login required'; end if;
  select * into m from pvp_matches where id = p_match and (host = me or guest = me) and joined for update;
  if not found then raise exception 'bad match'; end if;
  if m.settled then return case when m.winner is null then 'void' when m.winner = me then 'win' else 'loss' end; end if;
  opp := case when m.host = me then m.guest else m.host end;

  -- 내 보고 적기 (처음 보고만 인정)
  if m.host = me and m.host_won is null then m.host_won := p_won; end if;
  if m.guest = me and m.guest_won is null then m.guest_won := p_won; end if;
  update pvp_matches set host_won = m.host_won, guest_won = m.guest_won, first_claim_at = coalesce(first_claim_at, now())
    where id = m.id returning * into m;

  if m.host_won is not null and m.guest_won is not null then
    if m.host_won = m.guest_won then
      update pvp_matches set settled = true where id = m.id;
      return 'void';
    end if;
    perform pvp_settle(m, case when m.host_won then m.host else m.guest end, true);
  elsif (m.host = me and m.host_won = false) or (m.guest = me and m.guest_won = false) then
    perform pvp_settle(m, opp, true);          -- 진 사람이 인정하면 바로 확정
  elsif m.first_claim_at < now() - interval '90 seconds' then
    perform pvp_settle(m, me, false);          -- 상대가 90초 동안 보고 없음 → 승리만 기록, 점수 0
  else
    return 'pending';
  end if;
  select * into m from pvp_matches where id = p_match;
  return case when m.winner = me then 'win' else 'loss' end;
end $$;

revoke all on function public.pvp_create_match(uuid) from public, anon;
revoke all on function public.pvp_join_match(uuid) from public, anon;
revoke all on function public.pvp_report(uuid, boolean) from public, anon;
grant execute on function public.pvp_create_match(uuid) to authenticated;
grant execute on function public.pvp_join_match(uuid) to authenticated;
grant execute on function public.pvp_report(uuid, boolean) to authenticated;

-- ---------- 경기 채널 비공개 ----------
-- 게임은 'pvp-m-<매치 id>' 비공개 채널로 신호를 주고받는다. 그 매치의 호스트·게스트만 읽고 쓸 수 있다
-- (pvp_matches는 브라우저가 직접 못 읽으므로, 확인은 security definer 함수로 한다)
create or replace function public.pvp_is_member(p_topic text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pvp_matches m
    where p_topic like 'pvp-m-%' and m.id::text = substring(p_topic from 7) and auth.uid() in (m.host, m.guest));
$$;
revoke all on function public.pvp_is_member(text) from public, anon;
grant execute on function public.pvp_is_member(text) to authenticated;

drop policy if exists "pvp match members can read" on realtime.messages;
create policy "pvp match members can read" on realtime.messages for select to authenticated
  using (public.pvp_is_member(realtime.topic()));
drop policy if exists "pvp match members can write" on realtime.messages;
create policy "pvp match members can write" on realtime.messages for insert to authenticated
  with check (public.pvp_is_member(realtime.topic()));
