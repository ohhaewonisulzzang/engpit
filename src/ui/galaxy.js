import { state, save } from '../state.js';
import { SFX } from '../sound.js';
import { GALAXY, GALAXY_LV, galaxyCost, galaxyState, unlockGalaxy, toggleGalaxy } from '../battle/data.js';
import { WEAPONS } from '../three/weapons.js';
import { toast } from './common.js';

/* =========================================================
   갤럭시 파워 칸 (도감 상세창과 전투 탭에서 같이 씀)
   - 해금: 전투 레벨 GALAXY_LV 이상 + 조각
   - 착용/해제: 해금한 뒤 언제든
   ========================================================= */
export function galaxyHTML(w, compact) {
  const g = GALAXY[w.id], s = galaxyState(w); if (s === 'none') return '';
  const cost = galaxyCost(w.r);
  const act = {
    locked: `<span class="gp-lock">전투 Lv.${GALAXY_LV}부터</span>`,
    buy: `<button class="btn primary" data-gp-buy="${w.id}" ${state.shards >= cost ? '' : 'disabled'}>해금 · 조각 ${cost}</button>`,
    off: `<button class="btn" data-gp-toggle="${w.id}">착용하기</button>`,
    on: `<button class="btn on" data-gp-toggle="${w.id}">착용 중</button>`,
  }[s];
  return `<div class="galaxy ${s}${compact ? ' compact' : ''}"><div><b>✦ ${g.name}</b><small>${g.desc}</small></div>${act}</div>`;
}
// root 안의 갤럭시 버튼을 처리하고, 바뀌면 after()로 화면을 다시 그린다
export function bindGalaxy(root, after) {
  root.addEventListener('click', e => {
    const buy = e.target.closest('[data-gp-buy]'), tog = e.target.closest('[data-gp-toggle]');
    if (!buy && !tog) return;
    e.stopPropagation();
    const w = WEAPONS.find(x => x.id === (buy || tog).dataset[buy ? 'gpBuy' : 'gpToggle']);
    if (buy) {
      if (!unlockGalaxy(w)) { SFX.wrong(); toast('조각이 모자라요'); return; }
      SFX.fanfare(3); toast(`갤럭시 파워 「${GALAXY[w.id].name}」 해금! 바로 착용했어요`);
    } else {
      toggleGalaxy(w); SFX.tick();
      toast(state.gpOff[w.id] ? `「${GALAXY[w.id].name}」을(를) 벗었어요` : `「${GALAXY[w.id].name}」 착용!`);
    }
    save(); after();
  });
}
