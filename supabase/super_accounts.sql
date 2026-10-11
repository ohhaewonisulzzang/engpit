-- 슈퍼계정 + 아이디 대소문자 허용 (ranking.sql을 먼저 실행한 뒤, SQL Editor에 통째로 붙여 넣고 Run)
-- ⚠ 맨 위 delete는 지금 있는 계정과 랭킹 기록을 전부 지운다

-- 1) 기존 계정 전부 삭제 (프로필과 랭킹 기록도 같이 지워짐)
delete from auth.users;

-- 2) 아이디에 대문자 허용: 화면에는 쓴 그대로 보이고, 중복 검사는 대소문자를 무시
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (username ~ '^[A-Za-z0-9_]{3,16}$');
alter table public.profiles drop constraint if exists profiles_username_key;
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

-- 3) 슈퍼계정: 무한 코인·전부 해금 (게임 쪽에서 is_super를 보고 켬), hide_rank면 랭킹에서 빠짐
alter table public.profiles add column if not exists is_super  boolean not null default false;
alter table public.profiles add column if not exists hide_rank boolean not null default false;

create table if not exists public.special_accounts (
  username  text primary key,          -- 소문자로
  hide_rank boolean not null default false
);
alter table public.special_accounts enable row level security; -- 정책 없음: 브라우저에서 못 읽고 못 고침
insert into public.special_accounts (username, hide_rank) values ('young', false), ('granny', true)
  on conflict (username) do update set hide_rank = excluded.hide_rank;

-- 가입할 때 special_accounts에 있는 아이디면 슈퍼계정으로 만든다
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n text := new.raw_user_meta_data ->> 'username';
  sp public.special_accounts;
begin
  select * into sp from public.special_accounts where username = lower(n);
  insert into public.profiles (id, username, is_super, hide_rank)
  values (new.id, n, sp.username is not null, coalesce(sp.hide_rank, false));
  return new;
end $$;

-- 랭킹 화면에서 hide_rank 계정 빼기
create or replace view public.wave_rank_view with (security_invoker = true) as
  select r.month, r.user_id, p.username, r.wave, r.kills, r.updated_at
  from public.wave_rank r join public.profiles p on p.id = r.user_id
  where not p.hide_rank;

-- hide_rank 계정은 기록을 올려도 저장하지 않음
create or replace function public.submit_wave(p_wave integer, p_kills integer)
returns void language plpgsql security definer set search_path = public as $$
declare m text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if exists (select 1 from profiles where id = auth.uid() and hide_rank) then return; end if;
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
