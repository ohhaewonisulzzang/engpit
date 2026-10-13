import { state, save, SLOT } from './state.js';
import { WEAPONS } from './three/weapons.js';
import { GALAXY, MAX_ARM_LV } from './battle/data.js';
import { session, ctlSync, setCtl } from './ranking.js';
import { pull, upgrading, multi, auto } from './gacha.js';
import { G } from './battle/game.js';
import { currentTab, switchTab, updateHUD } from './ui/common.js';

/* =========================================================
   관리 계정: 로컬 대시보드(admin/control.html)에서 바꾼 값을 받아 적용한다
   - 서버 규칙은 supabase/control.sql. 관리 계정이 아니면 서버가 null을 돌려줘서 아무것도 안 함
   - 관리 계정이면 지금 상태를 주기적으로 올려서 대시보드가 볼 수 있게 한다
   ========================================================= */
const IDS = new Set(WEAPONS.map(w => w.id));
const int = (v, max = 1e9) => Math.max(0, Math.min(max, Math.floor(+v) || 0));
const mine = () => !!session && SLOT === 'ctl_' + session.uid;
const snapshot = () => ({
  coins: state.coins, shards: state.shards, level: state.level, luck: state.luck,
  inv: state.inv, armUp: state.armUp, galaxy: state.galaxy, gpOff: state.gpOff, best: state.best,
});
// 뽑기·업그레이드·전투 중에는 바꾸지 않고 다음 확인 때 적용
const busy = () => pull || upgrading || multi || auto.on || G;

function apply(p) {
  if (p.coins != null) state.coins = int(p.coins);
  if (p.inv) state.inv = Object.fromEntries(Object.entries(p.inv).filter(([id, n]) => IDS.has(id) && int(n) > 0).map(([id, n]) => [id, int(n, 99999)]));
  if (p.armUp) state.armUp = Object.fromEntries(Object.entries(p.armUp).filter(([id, n]) => IDS.has(id) && int(n) > 0).map(([id, n]) => [id, int(n, MAX_ARM_LV)]));
  if (p.galaxy) {
    const was = state.galaxy || {};
    state.galaxy = Object.fromEntries(Object.keys(p.galaxy).filter(id => GALAXY[id] && p.galaxy[id]).map(id => [id, true]));
    // 새로 켠 갤럭시 파워는 착용한 채로
    state.gpOff = Object.fromEntries(Object.entries(state.gpOff || {}).filter(([id, off]) => off && was[id] && state.galaxy[id]));
  }
  if ('best' in p) state.best = p.best && int(p.best.wave) > 0 ? { wave: int(p.best.wave), kills: int(p.best.kills) } : null;
}

let timer = null;
export async function syncControl() {
  if (!session) return;
  const res = await ctlSync(mine() ? snapshot() : null, mine() ? state.ctlRev || 0 : null);
  if (res === undefined) return;           // 연결 실패: 다음에 다시
  setCtl(!!res);                           // 관리 계정이 되거나 풀리면 저장 칸을 바꾸고 새로고침
  if (!res || !mine()) return;
  if (!timer) timer = setInterval(() => { if (document.visibilityState === 'visible') syncControl(); }, 30e3);
  if (!res.patch || res.rev <= (state.ctlRev || 0) || busy()) return;
  apply(res.patch);
  state.ctlRev = res.rev; save();
  updateHUD();
  if (currentTab === 'dex' || currentTab === 'battle') switchTab(currentTab);
  ctlSync(snapshot(), state.ctlRev);       // 적용했다고 바로 알림
}
