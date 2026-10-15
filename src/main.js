// 진입점: 각 화면 모듈을 불러오고 게임을 시작한다
import './ui/study.js';
import './ui/test.js';
import './ui/dex.js';
import './ui/battle.js';
import './ui/ranking.js';
import { state, SUPER, save } from './state.js';
import { MAX_LEVEL, LUCK_MAX, SHARD_VALUE } from './config.js';
import { WEAPONS } from './three/weapons.js';
import { MAX_ARM_LV, GALAXY } from './battle/data.js';
import { loop } from './gacha.js';
import { applyMachineTheme } from './three/machine.js';
import { updateHUD, renderOdds } from './ui/common.js';
import { syncControl } from './control.js';
import { applyTheme } from './shop.js';
import './ui/store.js';

// 예전 저장 데이터 옮기기: 같은 무기 여러 개로 오르던 전투 레벨을 조각 단계(armUp)로 바꾸고,
// 최대 레벨을 넘던 개수는 조각으로 돌려준다. 이제 무기는 하나씩만 가진다
if (!state.oneEach) {
  for (const w of WEAPONS) {
    const n = state.inv[w.id] || 0; if (!n) continue;
    const total = n - 1 + (state.armUp?.[w.id] || 0), keep = Math.min(total, MAX_ARM_LV - 1);
    state.armUp = { ...state.armUp, [w.id]: keep };
    state.shards += Math.min(n - 1, total - keep) * SHARD_VALUE[w.r];
    state.inv[w.id] = 1;
  }
  state.oneEach = true; save();
}

// 슈퍼계정: 모든 무기 최대 레벨, 모든 기계·행운·갤럭시 파워 해금 (새 무기가 생겨도 시작할 때 채움)
if (SUPER) {
  WEAPONS.forEach(w => { state.inv[w.id] = 1; });
  state.armUp = Object.fromEntries(WEAPONS.map(w => [w.id, MAX_ARM_LV - 1]));
  state.level = MAX_LEVEL; state.luck = LUCK_MAX;
  state.galaxy = Object.fromEntries(Object.keys(GALAXY).map(id => [id, true]));
  save();
}

applyMachineTheme(state.level);
applyTheme();
renderOdds();
updateHUD();
loop();
syncControl(); // 관리 계정이면 대시보드에서 바꾼 값을 받아 온다
