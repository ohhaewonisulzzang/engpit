import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { SFX } from '../sound.js';
import { RARITIES, TEST_MODE, FREE, MAX_LEVEL, lvl, chanceOf, pct, machineCost, PITY } from '../config.js';
import { titleOf, checkTitles, rewardText } from '../titles.js';
import { WEAPONS } from '../three/weapons.js';
import { resize } from '../three/effects.js';
import { pull, upgrading, closeResult, clock, upgradeMachine, auto, setAuto } from '../gacha.js';
import { applyMachineTheme } from '../three/machine.js';
import { renderStudy } from './study.js';
import { curQ, nextQuestion } from './test.js';
import { renderDex } from './dex.js';
import { renderBattle, leaveBattle } from './battle.js';
import { renderRanking, renderLogin } from './ranking.js';
import { renderStore } from './store.js';

/* =========================================================
   UI 공통
   - 화면(tab): gacha, battle, study, test, dex, store, rank, login
   - 위쪽 메뉴의 "단어"는 study/test 중 마지막에 본 화면으로 간다 (단어 탭 안에서 둘을 오감)
   ========================================================= */
export let currentTab = 'gacha';
let wordTab = 'study', backTab = 'gacha';
const NAV_OF = { study: 'word', test: 'word', login: null };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  const t = b.dataset.tab;
  // 위쪽 메뉴의 단어는 외우기/테스트 중 마지막에 본 화면으로
  switchTab(t === 'word' ? wordTab : t);
});
$('acctBtn').onclick = () => switchTab('login');
$('titleChip').onclick = () => switchTab('login');
// 로그인 화면을 닫으면 원래 보던 화면으로
export const leaveLogin = () => switchTab(backTab === 'login' ? 'rank' : backTab);
export function switchTab(tab) {
  if (auto.on && tab !== 'gacha') setAuto(false, '자동 뽑기를 멈췄어요');
  if ((pull || upgrading) && tab !== 'gacha') {
    if (upgrading) { toast('기계 업그레이드가 끝나면 이동할 수 있어요.'); return; }
    if (pull.phase === 'show') closeResult(false);
    else { toast('뽑기가 끝나면 이동할 수 있어요.'); return; }
  }
  if (currentTab === 'battle' && tab !== 'battle') leaveBattle();
  if (tab === 'login' && currentTab !== 'login') backTab = currentTab;
  if (tab === 'study' || tab === 'test') wordTab = tab;
  currentTab = tab;
  const nav = tab in NAV_OF ? NAV_OF[tab] : tab;
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === nav));
  document.querySelectorAll('.wordnav [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('acctBtn').classList.toggle('active', tab === 'login');
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + tab));
  document.querySelector('main').scrollTop = 0;
  if (tab === 'gacha') { resize(); clock.getDelta(); renderOdds(); }
  updateHUD();
  if (tab === 'test') { if (!curQ) nextQuestion(); else if (!curQ.done) $('ans').focus(); }
  if (tab === 'study') renderStudy();
  if (tab === 'dex') renderDex();
  if (tab === 'battle') renderBattle();
  if (tab === 'rank') renderRanking();
  if (tab === 'store') renderStore();
  if (tab === 'login') renderLogin();
}
let toastT;
export function toast(html) { const t = $('toast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
export function updateHUD() {
  const broke = !FREE && state.coins < 1;
  $('coinNum').textContent = FREE ? '∞' : state.coins;
  $('coinBox').title = TEST_MODE ? '테스트 모드: 코인 무한' : FREE ? '슈퍼계정: 코인 무한' : '보유 코인';
  $('pullBtn').classList.toggle('broke', broke);
  $('pull10').classList.toggle('broke', !FREE && state.coins < 10);
  $('pull100').classList.toggle('broke', !FREE && state.coins < 100);
  // 새로 달성한 칭호는 저절로 얻고, 대표 칭호를 위에 보여 준다
  const got = checkTitles();
  if (got.length) {
    toast(got.length > 1 ? `칭호 「${got[0].name}」 외 ${got.length - 1}개 획득!` : `칭호 「${got[0].name}」 획득! ${rewardText(got[0])}`);
    $('coinNum').textContent = FREE ? '∞' : state.coins;
  }
  const t = titleOf(state.title);
  $('titleChip').hidden = !t; if (t) $('titleChip').textContent = t.name;
  $('titleChip').classList.toggle('gold', !!t?.gold);
  $('titleChip').classList.toggle('pro', !!t?.pro); // 프로랭킹 1등: 흐르는 그라데이션 글자
  $('pullHint').innerHTML = broke
    ? '코인이 없어요. <b>단어 테스트</b>에서 한 문제 맞히면 1개를 받아요'
    : matchMedia('(hover: hover)').matches ? '스페이스바를 눌러도 뽑을 수 있어요' : '';
}
export function gainCoin(fromEl, n = 1, quiet = false) {
  state.coins += n; save(); updateHUD();
  const cb = $('coinBox'); cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump');
  const r = (fromEl || cb).getBoundingClientRect(), s = document.createElement('div');
  s.className = 'plus'; s.innerHTML = `+${n} <i class="ci"></i>`; s.style.left = (r.left + r.width / 2 - 30) + 'px'; s.style.top = (r.top) + 'px';
  document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
  if (!quiet) SFX.coin();
}
// 뽑기 화면 왼쪽 위: 기계, 다음 업그레이드 가격, 확률표, 지금 뽑을 수 있는 기계 전용 칼
// (좁은 화면에서는 제목만 보이고 눌러야 펼쳐진다)
let oddsOpen = false;
export function renderOdds() {
  const next = state.level < MAX_LEVEL
    ? `조각 ${state.shards}/${machineCost()}개로 다음 기계 열기 (도감 탭)`
    : '모든 기계를 열었어요';
  const ex = WEAPONS.filter(w => w.m && w.m <= state.level);
  $('odds').classList.toggle('open', oddsOpen);
  $('odds').innerHTML = `<button class="odds-sum" id="oddsSum"><b>Lv.${state.level} ${lvl().name}</b><span class="odds-more">확률 보기</span></button>
    <div class="odds-body"><small class="odds-next">${next}</small>${state.luck ? `<small class="luck">행운 ${state.luck}단계 적용 중</small>` : ''}<small class="pity">가진 무기는 다시 안 나와요. 다 모은 등급은 코인·조각으로 받아요</small><small class="pity">레전더리 이상 확정까지 <b>${PITY.legend - state.pity.legend}</b>회 · 울트라 확정까지 <b>${PITY.ultra - state.pity.ultra}</b>회</small>` +
    [...RARITIES].reverse().map(r => `<div class="orow"><span><i style="background:${r.color}"></i>${r.name}</span><span>${pct(chanceOf(r.key))}%</span></div>`).join('') +
    (ex.length ? `<div class="mex"><b>기계 전용 칼 ${ex.length}종이 나와요</b><span>${ex.filter(w => state.inv[w.id]).length}종 획득 · 도감에서 확인</span></div>` : '') +
    (TEST_MODE ? '<div class="testbar"><button id="tUp">테스트: 기계 업그레이드</button><button id="tReset">1레벨로</button><button id="tShard">조각 +100</button><button id="tAll">무기 전부 열기</button></div>' : '') + '</div>';
  $('oddsSum').onclick = () => { oddsOpen = !oddsOpen; $('odds').classList.toggle('open', oddsOpen); };
  if (!TEST_MODE) return;
  $('tUp').onclick = () => upgradeMachine();
  $('tReset').onclick = () => {
    if (pull || upgrading) return;
    state.level = 1; save();
    applyMachineTheme(1); renderOdds();
  };
  $('tShard').onclick = () => { state.shards += 100; save(); renderOdds(); };
  $('tAll').onclick = () => {
    WEAPONS.forEach(w => { state.inv[w.id] = Math.max(1, state.inv[w.id] || 0); });
    save(); toast(`무기 ${WEAPONS.length}종을 전부 열었어요`);
  };
}
export function speak(text) {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
