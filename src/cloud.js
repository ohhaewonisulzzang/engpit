import { state, CLOUD, FROM_GUEST, GUEST_KEY, SLOT_KEY, onSave, writeLocal, replaceState, lockSave } from './state.js';
import { session, loadSave, putSave } from './ranking.js';

/* =========================================================
   계정별 서버 저장 (서버 규칙은 supabase/cloud_save.sql)
   - 일반 계정으로 로그인하면 서버의 저장이 진짜다. 게임을 시작할 때 서버 것을 받아 오고, 바뀔 때마다 올린다
   - 올릴 때 마지막으로 받은 저장 번호(rev)를 같이 보내서, 그 사이 다른 기기가 먼저 저장했으면 거절된다.
     그러면 이 기기의 옛 상태(다른 기기에서 쓴 코인이 안 줄어든 상태)는 버리고 서버 저장으로 다시 불러온다
   ========================================================= */

/* ---------- 저장 칸 ----------
   일반 계정은 'u_<id>', 슈퍼계정은 'super_<id>'(무한 코인, 전부 해금), 관리 계정은 'ctl_<id>'(control.js),
   로그아웃하면 로그인 안 한 저장으로 돌아간다. 바뀔 때는 새로고침해서 처음부터 다시 불러온다 */
export function syncSlot() {
  const want = !session ? null : session.super ? 'super_' + session.uid : session.ctl ? 'ctl_' + session.uid : 'u_' + session.uid;
  const have = (() => { try { return localStorage.getItem(SLOT_KEY); } catch (e) { return null; } })();
  if (want === have) return false;
  try { want ? localStorage.setItem(SLOT_KEY, want) : localStorage.removeItem(SLOT_KEY); } catch (e) { return false; }
  location.reload();
  return true;
}

// 화면 전체를 막는 안내 (불러오는 중 / 연결 실패 / 다른 기기에서 저장됨)
function gate(msg, btn, onBtn) {
  let g = document.getElementById('cloudGate');
  if (!g) { g = document.createElement('div'); g.id = 'cloudGate'; g.className = 'modal show cloud-gate'; document.body.append(g); }
  g.innerHTML = `<div class="modal-box"><p>${msg}</p>${btn ? `<button class="btn primary">${btn}</button>` : ''}</div>`;
  if (btn) g.querySelector('button').onclick = onBtn;
}
const ungate = () => document.getElementById('cloudGate')?.remove();

const data = () => { const { cloudRev, cloudDirty, ...d } = state; return d; };

// 다른 기기가 먼저 저장했음: 서버 저장으로 바꾸고 새로고침 (이 기기에서 그 뒤에 한 것은 버림)
function overwritten(res) {
  replaceState(res.data, res.rev); lockSave();
  gate('다른 기기에서 이 계정으로 진행한 내용이 있어요.<br>서버에 저장된 진행 상황으로 다시 불러올게요.', '다시 불러오기', () => location.reload());
}

/* ---------- 시작할 때: 서버 저장에 맞추기 ----------
   연결이 안 되면 게임을 열지 않고 다시 시도하게 한다 (옛 상태로 뽑기를 못 하게) */
export async function cloudBoot() {
  if (!CLOUD) return;
  gate('저장된 진행 상황을 불러오는 중…');
  for (;;) {
    try { await first(); ungate(); return; }
    catch (e) {
      if (e.code === 'auth') { syncSlot(); return new Promise(() => {}); } // 로그인이 풀림: 로그인 안 한 저장으로 새로고침
      await new Promise(ok => gate('서버에 연결하지 못했어요.<br>인터넷 연결을 확인하고 다시 시도해 주세요.', '다시 시도', () => { gate('저장된 진행 상황을 불러오는 중…'); ok(); }));
    }
  }
}
const dropGuest = () => { if (FROM_GUEST) try { localStorage.removeItem(GUEST_KEY); } catch (e) {} };
async function first() {
  const r = await loadSave();
  // 이 브라우저의 예전 저장은 이 계정으로 옮겨졌거나(서버에 없을 때) 이 계정의 옛 사본이다(서버에 있을 때).
  // 어느 쪽이든 지워서, 옛 사본을 로그아웃 상태나 새 계정으로 다시 쓰지 못하게 한다
  if (!r) {
    // 서버에 아직 저장이 없는 계정: 이 기기의 진행을 처음 올린다
    const res = await putSave(0, data());
    if (!res.ok) return replaceState(res.data, res.rev);
    state.cloudRev = res.rev; state.cloudDirty = false; writeLocal(); dropGuest();
    return;
  }
  dropGuest();
  // 이 기기에서 마지막으로 맞춘 뒤 다른 기기가 저장하지 않았고, 아직 못 올린 진행이 있으면 올린다
  if (r.rev === state.cloudRev && state.cloudDirty) {
    const res = await putSave(r.rev, data());
    if (res.ok) { state.cloudRev = res.rev; state.cloudDirty = false; writeLocal(); return; }
    return replaceState(res.data, res.rev);
  }
  replaceState(r.data, r.rev);
}

/* ---------- 게임 중: 바뀔 때마다 올리기 ---------- */
let pushT = null, inflight = false, again = false, seq = 0, halted = false;
if (CLOUD) {
  // 저장할 때마다 바로 올리면 너무 잦으니 0.8초 모아서 한 번
  onSave(() => { seq++; clearTimeout(pushT); pushT = setTimeout(push, 800); });
  // 다른 창으로 가거나 닫을 때는 바로 올리고, 다시 돌아오면 다른 기기에서 저장했는지 확인
  addEventListener('pagehide', () => push(true));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' ? push(true) : check());
}
async function push(keepalive) {
  if (halted || !state.cloudDirty) return;
  if (inflight) { again = true; return; }  // 올리는 중에 또 바뀌면 끝난 뒤 한 번 더
  clearTimeout(pushT);
  inflight = true;
  const mySeq = seq;
  try {
    const res = await putSave(state.cloudRev, data(), keepalive);
    if (!res.ok) { halted = true; return overwritten(res); }
    state.cloudRev = res.rev;
    if (seq === mySeq) state.cloudDirty = false;
    writeLocal();
  } catch (e) {
    // 연결 실패: 기기에 남겨 두고 조금 뒤 다시 (로그인이 풀렸으면 syncSlot이 새로고침함)
    if (e.code !== 'auth') pushT = setTimeout(push, 5000);
  } finally {
    inflight = false;
    if (again && !halted) { again = false; push(); }
  }
}
async function check() {
  if (halted || inflight) return;
  try {
    const r = await loadSave();
    if (r && r.rev > state.cloudRev && !inflight && !halted) { halted = true; overwritten(r); }
  } catch (e) {}
}
