// 진입점: 각 화면 모듈을 불러오고 게임을 시작한다
import './ui/study.js';
import './ui/test.js';
import './ui/dex.js';
import { state } from './state.js';
import { loop } from './gacha.js';
import { applyMachineTheme } from './three/machine.js';
import { updateHUD, renderOdds } from './ui/common.js';

applyMachineTheme(state.level);
renderOdds();
updateHUD();
loop();
