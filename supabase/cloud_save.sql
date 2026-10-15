-- 계정별 서버 저장 (control.sql 다음에 SQL Editor에 통째로 붙여 넣고 Run)
-- 예전에는 진행 상황(코인·무기·기계 레벨…)이 브라우저(localStorage)에만 있어서
-- 다른 기기에서 로그인하면 진행이 안 따라오고, 기기마다 코인을 따로 쓰는 복사 버그가 있었다.
--  - 일반 계정의 진행 상황은 이 표에 한 줄로 저장되고, 로그인하면 서버 것을 불러온다
--  - 저장할 때마다 rev가 1씩 오른다. 게임은 마지막으로 받은 rev를 같이 보내고,
--    그 사이에 다른 기기가 먼저 저장했으면(rev가 다르면) 거절된다 → 옛 상태(줄지 않은 코인)로 덮어쓸 수 없음
--  - 업데이트 전 기기에 남아 있던 진행은 기기마다 한 번 옮겨지고, 그중 진행이 가장 많은 것이 남는다 (migrate_save)
--  - 브라우저는 표를 직접 읽거나 고칠 수 없고, 아래 함수로 자기 줄만 다룬다

create table if not exists public.saves (
  user_id    uuid        primary key references public.profiles (id) on delete cascade,
  rev        integer     not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security; -- 정책 없음: 아래 함수로만 다룸
revoke all on public.saves from anon, authenticated;

-- 내 저장 불러오기: { rev, data } (아직 없으면 null)
create or replace function public.load_save()
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.saves;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into s from saves where user_id = auth.uid();
  if not found then return null; end if;
  return jsonb_build_object('rev', s.rev, 'data', s.data);
end $$;

-- 저장하기: p_rev는 게임이 마지막으로 받은 rev (처음이면 0)
-- 성공하면 { ok: true, rev: 새 rev }, 다른 기기가 먼저 저장했으면 { ok: false, rev, data } (서버의 지금 상태)
create or replace function public.put_save(p_rev integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.saves; r integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 500000 then raise exception 'bad save'; end if;
  if coalesce(p_rev, 0) = 0 then
    insert into saves (user_id, rev, data) values (auth.uid(), 1, p_data) on conflict (user_id) do nothing;
    if found then return jsonb_build_object('ok', true, 'rev', 1); end if;
  else
    update saves set data = p_data, rev = rev + 1, updated_at = now()
      where user_id = auth.uid() and rev = p_rev returning rev into r;
    if found then return jsonb_build_object('ok', true, 'rev', r); end if;
  end if;
  select * into s from saves where user_id = auth.uid();
  return jsonb_build_object('ok', false, 'rev', s.rev, 'data', s.data);
end $$;

-- 진행이 얼마나 되었나: 가진 무기 수 → 기계 레벨 → 올린 전투 레벨 합 → 뽑은 횟수 순으로 비교 (배열은 앞에서부터 비교됨)
create or replace function public.save_score(d jsonb)
returns integer[] language sql immutable set search_path = public as $$
  select array[
    (select count(*)::int from jsonb_each_text(coalesce(d->'inv', '{}')) where value ~ '^[0-9]+$' and value::int > 0),
    coalesce((d->>'level')::int, 1),
    (select coalesce(sum(value::int), 0)::int from jsonb_each_text(coalesce(d->'armUp', '{}')) where value ~ '^[0-9]+$'),
    coalesce((d->>'pulls')::int, 0)
  ]
$$;

-- 예전 저장 옮기기: 업데이트 전부터 이 브라우저에 있던 진행을 계정으로 옮긴다 (기기마다 한 번, 게임이 옮긴 뒤 지움)
-- 서버에 저장이 없거나, 서버 것보다 진행이 더 많으면 통째로 바꾼다 (합치지 않으므로 기기 두 개로 불리기는 안 됨)
-- 돌려주는 값은 put_save와 같음: 바꿨으면 { ok: true, rev }, 서버 것이 더 많으면 { ok: false, rev, data }
create or replace function public.migrate_save(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.saves; r integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 500000 then raise exception 'bad save'; end if;
  insert into saves (user_id, rev, data) values (auth.uid(), 1, p_data) on conflict (user_id) do nothing;
  if found then return jsonb_build_object('ok', true, 'rev', 1); end if;
  select * into s from saves where user_id = auth.uid() for update;
  if save_score(p_data) > save_score(s.data) then
    update saves set data = p_data, rev = rev + 1, updated_at = now() where user_id = auth.uid() returning rev into r;
    return jsonb_build_object('ok', true, 'rev', r);
  end if;
  return jsonb_build_object('ok', false, 'rev', s.rev, 'data', s.data);
end $$;

revoke all on function public.load_save() from public, anon;
grant execute on function public.load_save() to authenticated;
revoke all on function public.put_save(integer, jsonb) from public, anon;
grant execute on function public.put_save(integer, jsonb) to authenticated;
revoke all on function public.migrate_save(jsonb) from public, anon;
grant execute on function public.migrate_save(jsonb) to authenticated;
