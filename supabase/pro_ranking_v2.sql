-- 프로랭킹 v2: 하드 모드가 단계(하드 Ⅰ~Ⅴ, 웨이브 30~100에서 시작) 없이 일반 전투처럼 웨이브 1부터 시작하도록 바뀜
-- pro_ranking.sql 다음에 SQL Editor에 통째로 붙여 넣고 Run (submit_pro의 시작 웨이브 검사만 바꾼다. 표·기록은 그대로)

create or replace function public.submit_pro(p_run uuid, p_stage integer, p_wave integer, p_kills integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  m text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
  st integer := 1;   -- 하드 모드도 웨이브 1부터
  run public.runs;
  sec double precision;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into run from runs where id = p_run and user_id = auth.uid() and not used for update;
  if not found then raise exception 'bad run'; end if;
  update runs set used = true where id = p_run;

  if p_stage is distinct from 0 then raise exception 'bad stage'; end if;   -- 단계는 없어짐 (게임은 0을 보냄)
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

-- (선택) 예전 단계 방식으로 올라간 이번 달 프로랭킹 기록은 기준이 달라요. 지우려면 아래 줄의 -- 를 지우고 Run
-- delete from public.pro_rank where month = to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
