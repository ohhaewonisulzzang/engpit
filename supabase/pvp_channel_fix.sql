-- 경쟁전 채널 권한 고치기 (pvp.sql을 이미 실행했다면 이것만 SQL Editor에서 Run)
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
