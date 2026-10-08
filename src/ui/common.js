import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { SFX } from '../sound.js';
import { RARITIES, TEST_MODE, MAX_LEVEL, lvl, chanceOf, pct } from '../config.js';
import { WEAPONS } from '../three/weapons.js';
import { resize } from '../three/effects.js';
import { pull, upgrading, closeResult, clock, upgradeMachine } from '../gacha.js';
import { applyMachineTheme } from '../three/machine.js';
import { renderStudy } from './study.js';
import { curQ, nextQuestion } from './test.js';
import { renderDex } from './dex.js';

/* =========================================================
   UI 공통
   ========================================================= */
export let currentTab = 'gacha';
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
export function switchTab(tab) {
  if ((pull || upgrading) && tab !== 'gacha') {
    if (upgrading) { toast('기계 업그레이드가 끝나면 이동할 수 있어요.'); return; }
    if (pull.phase === 'show') closeResult(false);
    else { toast('뽑기가 끝나면 이동할 수 있어요.'); return; }
  }
  currentTab = tab;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
  if (tab === 'gacha') { resize(); clock.getDelta(); }
  if (tab === 'test') { if (!curQ) nextQuestion(); else if (!curQ.done) $('ans').focus(); }
  if (tab === 'study') renderStudy();
  if (tab === 'dex') renderDex();
}
let toastT;
export function toast(html) { const t = $('toast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
export function updateHUD() {
  const broke = !TEST_MODE && state.coins < 1;
  $('coinNum').textContent = TEST_MODE ? '∞' : state.coins;
  $('coinBox').title = TEST_MODE ? '테스트 모드: 코인 무한' : '보유 코인';
  $('pullBtn').classList.toggle('broke', broke);
  $('pullHint').innerHTML = broke
    ? '코인이 없어요. <b>단어 테스트</b>에서 한 문제 맞히면 1개를 받아요'
    : `스페이스바를 눌러도 뽑을 수 있어요`;
}
export function gainCoin(fromEl) {
  state.coins++; save(); updateHUD();
  const cb = $('coinBox'); cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump');
  const r = (fromEl || cb).getBoundingClientRect(), s = document.createElement('div');
  s.className = 'plus'; s.innerHTML = '+1 <i class="ci"></i>'; s.style.left = (r.left + r.width / 2 - 30) + 'px'; s.style.top = (r.top) + 'px';
  document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
  SFX.coin();
}
// 뽑기 화면 왼쪽 위: 지금 기계 레벨, 모은 개수, 확률표
export function renderOdds() {
  const next = state.level < MAX_LEVEL
    ? `이 기계에서 ${state.got.length}/${WEAPONS.length}종 모음`
    : '마지막 기계예요';
  $('odds').innerHTML = `<div class="lv">Lv.${state.level} ${lvl().name}<small>${next}</small>${state.luck ? `<small class="luck">행운 ${state.luck}단계 적용 중</small>` : ''}</div>` +
    [...RARITIES].reverse().map(r => `<div class="orow"><span><i style="background:${r.color}"></i>${r.name}</span><span>${pct(chanceOf(r.key))}%</span></div>`).join('') +
    (TEST_MODE ? '<div class="testbar"><button id="tUp">테스트: 기계 업그레이드</button><button id="tReset">1레벨로</button></div>' : '');
  if (!TEST_MODE) return;
  $('tUp').onclick = () => upgradeMachine();
  $('tReset').onclick = () => {
    if (pull || upgrading) return;
    state.level = 1; state.got = []; save();
    applyMachineTheme(1); renderOdds();
  };
}
export function speak(text) {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
