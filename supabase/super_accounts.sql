-- 아이디 대소문자 허용 + 슈퍼계정 칸 (ranking.sql을 먼저 실행한 뒤, SQL Editor에 통째로 붙여 넣고 Run)
-- ⚠ 맨 위 delete는 지금 있는 계정과 랭킹 기록을 전부 지운다

-- 1) 기존 계정 전부 삭제 (프로필과 랭킹 기록도 같이 지워짐)
delete from auth.users;

-- 2) 아이디에 대문자 허용: 화면에는 쓴 그대로 보이고, 중복 검사는 대소문자를 무시
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (username ~ '^[A-Za-z0-9_]{3,16}$');
alter table public.profiles drop constraint if exists profiles_username_key;
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

-- 3) 슈퍼계정 표시: is_super(무한 코인·전부 해금), hide_rank(랭킹에서 빠짐)
--    가입할 때는 절대 켜지지 않는다. 계정을 만든 뒤 그 계정의 id로만 켠다 (promote_supers.sql)
--    → 아이디를 먼저 가로채서 가입해도 슈퍼계정이 되지 않음
alter table public.profiles add column if not exists is_super  boolean not null default false;
alter table public.profiles add column if not exists hide_rank boolean not null default false;
drop table if exists public.special_accounts;
-- 브라우저(로그인한 사용자 포함)는 프로필을 고칠 수 없다 (읽기 정책만 있음 + 쓰기 권한 회수)
revoke insert, update, delete on public.profiles from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;

-- 랭킹 화면에서 hide_rank 계정 빼기
create or replace view public.wave_rank_view with (security_invoker = true) as
  select r.month, r.user_id, p.username, r.wave, r.kills, r.updated_at
  from public.wave_rank r join public.profiles p on p.id = r.user_id
  where not p.hide_rank;

-- 기록 올리기(submit_wave)와 hide_rank 계정 제외는 secure_runs.sql에 있다
