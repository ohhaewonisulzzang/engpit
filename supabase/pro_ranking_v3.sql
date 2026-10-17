-- 프로랭킹 v3: 하드 모드가 일반의 약 1.7배 → 약 2.7배로 세짐 (2026-10-17). 기준이 달라져서 이번 달 프로랭킹을 비운다
-- SQL Editor에 붙여 넣고 Run (함수·표는 그대로, 기록만 지움)

delete from public.pro_rank where month = to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
