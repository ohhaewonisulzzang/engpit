-- 경쟁전 삭제 (게임에서 경쟁전을 뺐으므로 서버에 남은 경쟁전 표·함수·채널 규칙을 지운다)
-- SQL Editor에 통째로 붙여 넣고 Run. 랭킹(전투 최고 웨이브)과 계정은 그대로 남는다

drop policy if exists "pvp match members can read" on realtime.messages;
drop policy if exists "pvp match members can write" on realtime.messages;
drop function if exists public.pvp_is_member(text);
drop function if exists public.pvp_report(uuid, boolean);
drop function if exists public.pvp_settle(public.pvp_matches, uuid, boolean);
drop function if exists public.pvp_settle(public.pvp_matches, uuid);
drop function if exists public.pvp_join_match(uuid);
drop function if exists public.pvp_create_match(uuid);
drop view if exists public.pvp_rating_view;
drop table if exists public.pvp_matches;
drop table if exists public.pvp_rating;
