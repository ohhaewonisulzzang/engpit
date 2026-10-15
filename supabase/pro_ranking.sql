-- 프로랭킹: 하드 모드 월간 기록 (secure_runs.sql 다음에 SQL Editor에 통째로 붙여 넣고 Run)
-- 규칙은 일반 랭킹과 같다: 이번 달 최고 웨이브, 같으면 처치 수. 한 사람당 한 달에 한 줄
-- 판 번호(start_run)도 일반 전투와 같이 쓴다. 하드 모드는 단계마다 시작 웨이브가 높아서
-- 시간 검사는 (도달 웨이브 - 시작 웨이브)로 한다. 시작 웨이브는 src/battle/data.js의 PRO_STAGES와 같아야 함

create table if not exists public.pro_rank (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  month      text        not null,               -- 한국 시간 기준 'YYYY-MM'
  wave       integer     not null,
  kills      integer     not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
create index if not exists pro_rank_order on public.pro_rank (month, wave desc, kills desc, updated_at);
alter table public.pro_rank enable row level security;
drop policy if exists "pro rank is public" on public.pro_rank;
create policy "pro rank is public" on public.pro_rank for select using (true);
-- 쓰기 정책은 없음: 기록은 아래 함수로만 올릴 수 있다

create or replace view public.pro_rank_view with (security_invoker = true) as
  select r.month, r.user_id, p.username, r.wave, r.kills, r.updated_at
  from public.pro_rank r join public.profiles p on p.id = r.user_id;
grant select on public.pro_rank_view to anon, authenticated;

create or replace function public.submit_pro(p_run uuid, p_stage integer, p_wave integer, p_kills integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  m text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
  starts integer[] := array[30, 45, 60, 80, 100];   -- 하드 Ⅰ~Ⅴ 시작 웨이브
  st integer;
  run public.runs;
  sec double precision;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into run from runs where id = p_run and user_id = auth.uid() and not used for update;
  if not found then raise exception 'bad run'; end if;
  update runs set used = true where id = p_run;

  if p_stage is null or p_stage < 0 or p_stage >= array_length(starts, 1) then raise exception 'bad stage'; end if;
  st := starts[p_stage + 1];
  sec := extract(epoch from now() - run.started_at);
  if sec > 6 * 3600 then raise exception 'run expired'; end if;
  if p_wave is null or p_wave < st or p_wave > 300 or p_kills is null or p_kills < 0 then raise exception 'bad record'; end if;
  if (p_wave - st) * 40 > sec + 5 then raise exception 'too fast'; end if;     -- 웨이브마다 40초
  if p_kills > sec * 60 + 50 then raise exception 'too many kills'; end if;

  if exists (select 1 from profiles where id = auth.uid() and hide_rank) then return; end if;
  insert into pro_rank (user_id, month, wave, kills) values (auth.uid(), m, p_wave, p_kills)
  on conflict (user_id, month) do update
    set wave = excluded.wave, kills = excluded.kills, updated_at = now()
    where (excluded.wave, excluded.kills) > (pro_rank.wave, pro_rank.kills);
end $$;

revoke all on function public.submit_pro(uuid, integer, integer, integer) from public, anon;
grant execute on function public.submit_pro(uuid, integer, integer, integer) to authenticated;
