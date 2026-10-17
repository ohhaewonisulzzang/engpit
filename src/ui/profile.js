import { $ } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { TITLES, SHOP_TITLES, titleOf, proTitles, hasTitle, rewardText, wearTitle } from '../titles.js';
import { updateHUD } from './common.js';
import { settings, setSetting } from '../settings.js';

/* =========================================================
   프로필(로그인 탭 아래): 그래픽 설정, 대표 칭호 고르기
   - 얻은 칭호는 눌러서 달고, 아직 못 얻은 칭호는 얻는 방법만 보여 준다
   ========================================================= */
// 그래픽 설정 (settings.js). 값은 이 기기에만 저장된다
const OPTS = [
  { k: 'res', name: '렌더링 해상도', desc: '낮추면 화면이 조금 흐려지지만 더 부드럽게 돌아가요', v: [['low', '낮음'], ['mid', '보통'], ['high', '높음']] },
  { k: 'quality', name: '그래픽 품질', desc: '낮음은 그림자·바닥 장식·파티클을 줄여요', v: [['low', '낮음'], ['mid', '보통'], ['high', '높음']] },
  { k: 'vfx', name: '이펙트 (VFX)', desc: '파티클·폭발·화면 흔들림. 꺼도 무기 공격 모양은 보여요', v: [[true, '켜기'], [false, '끄기']] },
  { k: 'hitbox', name: '히트박스 표시', desc: '전투에서 나·적·탄의 판정 범위를 원으로 보여 줘요', v: [[true, '켜기'], [false, '끄기']] },
];
const settingsCard = () => `<div class="auth-card prof">
    <h3>설정</h3>
    <p class="auth-sub">이 기기에만 저장돼요.</p>
    <div class="tlist">${OPTS.map(o => `<div class="trow"><div><b>${o.name}</b><small>${o.desc}</small></div>
      <div class="seg">${o.v.map(([v, l]) => `<button class="${settings[o.k] === v ? 'on' : ''}" data-set="${o.k}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}</div></div>`;

export function renderProfile() {
  // 랭킹 1등 보상(secret, 프로랭킹 1등)은 얻은 사람에게만 보인다
  const shown = TITLES.filter(t => !t.secret || hasTitle(t));
  const have = shown.filter(hasTitle), bought = SHOP_TITLES.filter(hasTitle), pros = proTitles().reverse(), cur = titleOf(state.title);
  const pc = t => t?.pro ? ' class="pro-t"' : '';
  const row = t => hasTitle(t)
    ? `<div class="trow done"><div><b${pc(t)}>${t.name}</b><small>${t.price ? '상점에서 산 칭호' : t.desc}</small></div>
        <button class="btn${state.title === t.id ? ' on' : ''}" data-wear="${t.id}">${state.title === t.id ? '대표 칭호' : '달기'}</button></div>`
    : `<div class="trow todo"><div><b>${t.name}</b><small>얻는 방법: ${t.desc} · 보상 ${rewardText(t)}</small></div></div>`;
  $('profile').innerHTML = settingsCard() + `<div class="auth-card prof">
    <h3>칭호</h3>
    <p class="auth-sub">대표 칭호: <b class="prof-cur${cur?.pro ? ' pro-t' : ''}">${cur ? cur.name : '없음'}</b> · ${have.length}/${shown.length}개 얻음<br>조건을 달성하면 칭호와 보상을 저절로 받아요. 얻은 칭호를 눌러 대표 칭호로 달 수 있어요. 코인 상점에서 칭호를 살 수도 있어요.</p>
    <div class="tlist">${[...pros, ...have, ...bought, ...shown.filter(t => !hasTitle(t))].map(row).join('')}</div></div>`;
}
$('profile').onclick = e => {
  const b = e.target.closest('[data-set]');
  if (b) { const v = b.dataset.v; setSetting(b.dataset.set, v === 'true' ? true : v === 'false' ? false : v); SFX.tick(); renderProfile(); return; }
  const w = e.target.closest('[data-wear]'); if (!w) return;
  wearTitle(w.dataset.wear); SFX.tick(); renderProfile(); updateHUD();
};
