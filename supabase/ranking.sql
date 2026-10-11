-- 회원(아이디) + 월간 전투 랭킹
-- Supabase SQL Editor에 통째로 붙여 넣고 Run.
-- 그리고 Authentication → Sign In / Providers → Email 에서 "Confirm email"을 꺼 주세요.
--   (게임은 아이디를 '아이디@engpit.game' 이라는 가짜 이메일로 바꿔서 가입시키기 때문에 인증 메일을 받을 수 없음)

-- ---------- 회원 프로필: 가입할 때 아이디가 자동으로 들어감 ----------
create table if not exists public.profiles (
  id       uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 월간 전투 기록: 한 사람당 한 달에 한 줄 (가장 좋은 판) ----------
create table if not exists public.wave_rank (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  month      text        not null,               -- 한국 시간 기준 'YYYY-MM'
  wave       integer     not null,
  kills      integer     not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
create index if not exists wave_rank_order on public.wave_rank (month, wave desc, kills desc, updated_at);
alter table public.wave_rank enable row level security;
drop policy if exists "wave rank is public" on public.wave_rank;
create policy "wave rank is public" on public.wave_rank for select using (true);
-- 쓰기 정책은 없음: 기록은 아래 함수로만 올릴 수 있다

-- 화면용: 아이디까지 붙인 순위표
create or replace view public.wave_rank_view with (security_invoker = true) as
  select r.month, r.user_id, p.username, r.wave, r.kills, r.updated_at
  from public.wave_rank r join public.profiles p on p.id = r.user_id;
grant select on public.wave_rank_view to anon, authenticated;

-- 로그인한 사람의 판 결과 올리기: 이번 달 기록보다 좋을 때만 바뀜
create or replace function public.submit_wave(p_wave integer, p_kills integer)
returns void language plpgsql security definer set search_path = public as $$
declare m text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_wave is null or p_wave < 1 or p_wave > 500 or p_kills is null or p_kills < 0 or p_kills > 1000000 then
    raise exception 'bad record';
  end if;
  insert into wave_rank (user_id, month, wave, kills) values (auth.uid(), m, p_wave, p_kills)
  on conflict (user_id, month) do update
    set wave = excluded.wave, kills = excluded.kills, updated_at = now()
    where (excluded.wave, excluded.kills) > (wave_rank.wave, wave_rank.kills);
end $$;
revoke all on function public.submit_wave(integer, integer) from public, anon;
grant execute on function public.submit_wave(integer, integer) to authenticated;
