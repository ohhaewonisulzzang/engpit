-- Young 랭킹 제외 + 관리 계정 (secure_runs.sql 다음에 SQL Editor에 통째로 붙여 넣고 Run)
-- 관리 계정: 로컬 대시보드(admin/control.html, 저장소에 안 올라감)에서 코인·무기·전투 레벨·갤럭시 파워·최고 웨이브를 바꾼다
--  - 대시보드는 service_role 키로 account_control 표에 바꿀 값(patch)을 적는다
--  - 게임은 그 계정으로 로그인했을 때 ctl_sync로 자기 줄만 읽어서 적용하고, 지금 상태(snapshot)를 올려 둔다
--  - 브라우저(anon·로그인한 사용자)는 표를 직접 읽거나 고칠 수 없고, 자기 줄에 snapshot만 적을 수 있다

-- 1) Young: 슈퍼계정은 그대로, 랭킹에서는 빠짐 (이미 올라간 기록도 지움)
update public.profiles set hide_rank = true where id = 'ec1f0abf-2310-4dd3-9fb2-8a6f2d4ad988'; -- Young
delete from public.wave_rank where user_id = 'ec1f0abf-2310-4dd3-9fb2-8a6f2d4ad988';

-- 2) 관리 계정 표
create table if not exists public.account_control (
  user_id     uuid        primary key references public.profiles (id) on delete cascade,
  rev         integer     not null default 0,   -- 대시보드가 저장할 때마다 1씩 올라감
  patch       jsonb,                            -- 게임에 적용할 값 { coins, inv, armUp, galaxy, best }
  applied_rev integer     not null default 0,   -- 게임이 적용했다고 알려 온 rev
  snapshot    jsonb,                            -- 게임이 올린 지금 상태
  snapshot_at timestamptz,
  updated_at  timestamptz not null default now()
);
alter table public.account_control enable row level security; -- 정책 없음: service_role과 아래 함수로만 다룸
revoke all on public.account_control from anon, authenticated;

-- 3) 게임이 부르는 함수: 관리 계정이 아니면 null, 맞으면 { rev, patch }
create or replace function public.ctl_sync(p_snapshot jsonb default null, p_rev integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.account_control;
begin
  if auth.uid() is null then return null; end if;
  select * into c from account_control where user_id = auth.uid();
  if not found then return null; end if;
  if p_snapshot is not null and octet_length(p_snapshot::text) < 100000 then
    update account_control
      set snapshot = p_snapshot, snapshot_at = now(),
          applied_rev = greatest(applied_rev, least(coalesce(p_rev, 0), rev))
      where user_id = auth.uid();
  end if;
  return jsonb_build_object('rev', c.rev, 'patch', c.patch);
end $$;
revoke all on function public.ctl_sync(jsonb, integer) from public, anon;
grant execute on function public.ctl_sync(jsonb, integer) to authenticated;

-- 4) 관리 계정 지정은 대시보드에서 아이디로 등록하거나, 여기서 계정 id로 한다
-- insert into public.account_control (user_id) values ('<새 계정 id>') on conflict do nothing;

select p.username, p.is_super, p.hide_rank, (c.user_id is not null) as controlled
from public.profiles p left join public.account_control c on c.user_id = p.id
order by p.created_at;
