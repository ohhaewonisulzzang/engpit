-- 랭킹 조작 막기 (super_accounts.sql 다음에 SQL Editor에 통째로 붙여 넣고 Run)
-- 판을 시작할 때 서버가 시간을 적어 두고(start_run), 끝날 때 그 판 번호로만 기록을 올릴 수 있게 한다(submit_wave).
--  - 판 번호는 한 번만 쓸 수 있고, 남의 판 번호는 못 쓴다
--  - 웨이브 w에 도달하려면 앞 웨이브를 각각 40초 이상 버텨야 하므로, 실제로 흐른 시간보다 높은 웨이브는 거절
--  - 처치 수도 흐른 시간에 비해 너무 많으면 거절
--  - 1분에 판을 10번 넘게 열 수 없고, 새 판을 열면 예전 판은 못 씀 (판은 하나만 열려 있음)
--  - 웨이브는 최대 300
-- (브라우저 코드를 고쳐서 게임을 쉽게 만드는 것까지는 못 막지만, 콘솔에서 숫자만 보내는 조작은 막힌다)

create table if not exists public.runs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  used       boolean     not null default false
);
create index if not exists runs_user_started on public.runs (user_id, started_at desc);
alter table public.runs enable row level security; -- 정책 없음: 아래 함수로만 다룸

create or replace function public.start_run()
returns uuid language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if (select count(*) from runs where user_id = auth.uid() and started_at > now() - interval '1 minute') >= 10 then
    raise exception 'too many runs';
  end if;
  delete from runs where user_id = auth.uid() and started_at < now() - interval '1 day';
  -- 새 판을 열면 끝내지 않은 예전 판은 못 쓰게 됨 (판을 여러 개 열어 두고 기다리는 것 방지)
  update runs set used = true where user_id = auth.uid() and not used;
  insert into runs (user_id) values (auth.uid()) returning id into r;
  return r;
end $$;

-- 예전 함수(판 번호 없이 올리던 것)는 지운다
drop function if exists public.submit_wave(integer, integer);

create or replace function public.submit_wave(p_run uuid, p_wave integer, p_kills integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  m text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
  run public.runs;
  sec double precision;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into run from runs where id = p_run and user_id = auth.uid() and not used for update;
  if not found then raise exception 'bad run'; end if;
  update runs set used = true where id = p_run;

  sec := extract(epoch from now() - run.started_at);
  if sec > 6 * 3600 then raise exception 'run expired'; end if;
  if p_wave is null or p_wave < 1 or p_wave > 300 or p_kills is null or p_kills < 0 then raise exception 'bad record'; end if;
  if (p_wave - 1) * 40 > sec + 5 then raise exception 'too fast'; end if;      -- 웨이브마다 40초
  if p_kills > sec * 60 + 50 then raise exception 'too many kills'; end if;    -- 1초에 60마리는 넉넉한 상한

  if exists (select 1 from profiles where id = auth.uid() and hide_rank) then return; end if;
  insert into wave_rank (user_id, month, wave, kills) values (auth.uid(), m, p_wave, p_kills)
  on conflict (user_id, month) do update
    set wave = excluded.wave, kills = excluded.kills, updated_at = now()
    where (excluded.wave, excluded.kills) > (wave_rank.wave, wave_rank.kills);
end $$;

revoke all on function public.start_run() from public, anon;
grant execute on function public.start_run() to authenticated;
revoke all on function public.submit_wave(uuid, integer, integer) from public, anon;
grant execute on function public.submit_wave(uuid, integer, integer) to authenticated;
