-- 슈퍼계정 지정 (계정을 만든 뒤 SQL Editor에서 Run)
-- 아이디가 아니라 계정 id(uuid)로 지정해서, 같은 이름을 가로챈 다른 계정이 슈퍼계정이 되지 않게 한다
--   Young  : 무한 코인·전부 해금, 랭킹에서 빠짐 (control.sql)
--   granny : 무한 코인·전부 해금, 랭킹에서 빠짐
update public.profiles set is_super = true, hide_rank = true  where id = 'ec1f0abf-2310-4dd3-9fb2-8a6f2d4ad988'; -- Young
update public.profiles set is_super = true, hide_rank = true  where id = '7294044d-924b-4fdc-bde5-1bf6f3cfc07e'; -- granny

select username, is_super, hide_rank from public.profiles order by created_at;
