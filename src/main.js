// 진입점: 각 화면 모듈을 불러오고 게임을 시작한다
import './ui/study.js';
import './ui/test.js';
import './ui/dex.js';
import './ui/battle.js';
import './ui/ranking.js';
import { state, SUPER, save } from './state.js';
import { MAX_LEVEL, LUCK_MAX } from './config.js';
import { WEAPONS } from './three/weapons.js';
import { MAX_ARM_LV, GALAXY } from './battle/data.js';
import { loop } from './gacha.js';
import { applyMachineTheme } from './three/machine.js';
import { updateHUD, renderOdds } from './ui/common.js';

// 슈퍼계정: 모든 무기 최대 레벨, 모든 기계·행운·갤럭시 파워 해금 (새 무기가 생겨도 시작할 때 채움)
if (SUPER) {
  WEAPONS.forEach(w => { state.inv[w.id] = Math.max(MAX_ARM_LV, state.inv[w.id] || 0); });
  state.level = MAX_LEVEL; state.luck = LUCK_MAX;
  state.galaxy = Object.fromEntries(Object.keys(GALAXY).map(id => [id, true]));
  save();
}

applyMachineTheme(state.level);
renderOdds();
updateHUD();
loop();
