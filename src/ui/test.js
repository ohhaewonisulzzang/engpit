import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { WORDS, TIERS, TIER_COINS, curTier } from '../words.js';
import { SFX } from '../sound.js';
import { pull, multi, startPull, closeResult, skipPull, closeMulti } from '../gacha.js';
import { currentTab, gainCoin, speak, esc } from './common.js';
import { closeModal } from './dex.js';
import { quizSound } from '../shop.js';

/* =========================================================
   단어 테스트: 뜻을 보고 영어 단어를 직접 쓴다 (맞히면 코인, 어려운 단계일수록 많이)
   - 뽑기 기계 레벨의 단계 단어가 주로 나오고, REVIEW 확률로 아래 단계 단어가 복습으로 섞인다
   ========================================================= */
export let curQ = null, streak = 0;
let recent = [];
const BONUS_EVERY = 5; // 연속 정답 보너스 간격
const best = () => state.bestStreak || 0;
const REVIEW = .25;

export function nextQuestion() {
  const t = curTier(), review = t > 0 && Math.random() < REVIEW;
  const words = WORDS.filter(w => review ? w.tier < t : w.tier === t);
  let pool = words.filter(w => !recent.includes(w.en));
  if (!pool.length) pool = words;
  // 틀렸던 단어가 더 자주 나오게
  const weighted = pool.flatMap(w => state.missed[w.en] ? [w, w, w] : [w]);
  const w = weighted[Math.floor(Math.random() * weighted.length)];
  recent.push(w.en); if (recent.length > 20) recent.shift();
  const len = w.en.length;
  curQ = { w, done: false, hints: new Set(), maxHints: Math.max(1, Math.floor(len / 2)) };

  $('qCat').textContent = w.cat;
  const c = TIER_COINS[w.tier];
  $('testNote').innerHTML = `지금은 <b>${TIERS[t]}</b> 단계 단어가 나와요 (뽑기 기계를 업그레이드하면 더 어려워져요). ${TIERS[w.tier]} 단어는 맞히면 코인 <i class="ci"></i> ${c}개, 5문제 연속으로 맞히면 보너스 1개를 더 받아요.`;
  $('qWord').textContent = w.ko;
  $('tiles').style.setProperty('--n', len);
  $('tiles').className = 'tiles';
  $('tiles').innerHTML = [...w.en].map((_, i) => `<span class="tile" style="--i:${i}"></span>`).join('');
  $('ans').value = ''; $('ans').maxLength = len; $('ans').disabled = false;
  $('ansBtn').disabled = $('hintBtn').disabled = $('skipBtn').disabled = false;
  $('feedback').textContent = ''; $('feedback').className = 'feedback';
  $('ime').classList.remove('show');
  updateHintBtn(); drawTiles();
  if (currentTab === 'test') $('ans').focus();
}

// 입력한 글자와 힌트를 칸에 그린다
function drawTiles() {
  if (!curQ) return;
  const typed = $('ans').value.toLowerCase(), ans = curQ.w.en;
  [...$('tiles').children].forEach((t, i) => {
    const ch = typed[i];
    t.textContent = ch || (curQ.hints.has(i) ? ans[i] : '');
    t.classList.toggle('filled', !!ch);
    t.classList.toggle('hint', !ch && curQ.hints.has(i));
  });
}
function updateHintBtn() {
  const left = curQ.maxHints - curQ.hints.size;
  $('hintLeft').textContent = left;
  $('hintBtn').disabled = left <= 0 || curQ.done;
}
function useHint() {
  if (!curQ || curQ.done || curQ.hints.size >= curQ.maxHints) return;
  // 앞에서부터 아직 맞게 안 쓴 칸 하나를 보여 줌
  const typed = $('ans').value.toLowerCase(), ans = curQ.w.en;
  const i = [...ans].findIndex((c, k) => !curQ.hints.has(k) && typed[k] !== c);
  if (i < 0) return;
  curQ.hints.add(i); SFX.tick();
  updateHintBtn(); drawTiles(); $('ans').focus();
}

function submit() {
  if (!curQ) return;
  if (curQ.done) { nextQuestion(); return; } // 결과가 보일 때 Enter = 다음 문제
  const typed = $('ans').value.trim().toLowerCase();
  if (!typed) { $('ans').focus(); return; }
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(typed)) { $('ime').classList.add('show'); return; }
  finish(typed === curQ.w.en.toLowerCase());
}

function finish(ok, skipped = false) {
  const q = curQ; q.done = true;
  $('ans').disabled = true; $('ansBtn').disabled = $('hintBtn').disabled = $('skipBtn').disabled = true;
  const tiles = $('tiles'), fb = $('feedback');
  // 칸에 정답을 채우고 색으로 결과 표시
  [...tiles.children].forEach((t, i) => { t.textContent = q.w.en[i]; t.classList.remove('hint'); t.classList.add(ok ? 'ok' : 'no'); });
  speak(q.w.en);
  if (ok) {
    streak++; state.correct++;
    if (streak > best()) state.bestStreak = streak;
    if (state.missed[q.w.en]) { state.missed[q.w.en]--; if (!state.missed[q.w.en]) delete state.missed[q.w.en]; }
    gainCoin($('tiles'), TIER_COINS[q.w.tier], true); quizSound(true); // 정답 소리는 상점에서 고른 것
    const bonus = streak % BONUS_EVERY === 0;
    if (bonus) setTimeout(() => gainCoin($('streak')), 350);
    fb.innerHTML = bonus ? `${streak}연속 정답! 보너스 코인까지 +${TIER_COINS[q.w.tier] + 1}` : streak >= 2 ? `정답! ${streak}연속` : '정답!';
    fb.className = 'feedback ok' + (bonus ? ' bonus' : '');
    tiles.classList.add('win');
    setTimeout(() => { if (curQ === q) nextQuestion(); }, bonus ? 1800 : 1200);
  } else {
    streak = 0; state.wrong++;
    state.missed[q.w.en] = (state.missed[q.w.en] || 0) + 1;
    quizSound(false); tiles.classList.add('shake');
    fb.innerHTML = `${skipped ? '정답은' : '아쉬워요. 정답은'} <b>${esc(q.w.en)}</b>`;
    fb.className = 'feedback no';
    setTimeout(() => { if (curQ === q) nextQuestion(); }, 2400);
  }
  save();
  $('streak').textContent = streak; $('best').textContent = best();
}

$('ansForm').onsubmit = e => { e.preventDefault(); submit(); };
$('ans').oninput = () => {
  $('ime').classList.toggle('show', /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test($('ans').value));
  drawTiles(); if ($('ans').value) SFX.tick();
};
$('hintBtn').onclick = useHint;
$('skipBtn').onclick = () => { if (curQ && !curQ.done) finish(false, true); };
$('best').textContent = best();

addEventListener('keydown', e => {
  if (currentTab === 'test' && e.key === 'Enter' && curQ?.done) { e.preventDefault(); nextQuestion(); return; }
  if (e.target.tagName === 'INPUT') return;
  if (currentTab === 'gacha' && e.code === 'Space') { e.preventDefault(); if (multi) closeMulti(false); else if (pull?.phase === 'show') closeResult(false); else if (pull) skipPull(); else startPull(); }
  if (currentTab === 'gacha' && e.key === 'Enter' && pull?.phase === 'show') closeResult(false);
  if (currentTab === 'study') { if (e.key === 'ArrowRight') $('fcNext').click(); if (e.key === 'ArrowLeft') $('fcPrev').click(); }
  if (e.key === 'Escape') closeModal();
});
