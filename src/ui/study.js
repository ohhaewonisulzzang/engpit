import { $ } from '../dom.js';
import { state } from '../state.js';
import { allWords } from '../words.js';
import { switchTab, speak, shuffle, esc } from './common.js';

/* =========================================================
   단어 외우기: 카드 앞면은 뜻, 뒤집으면 영어 (테스트와 같은 방향)
   ========================================================= */
export let studyFilter = 'all', studyCat = '전체', studyList = [], studyIdx = 0;
const cats = () => ['전체', ...new Set(allWords().map(w => w.cat))];

export function buildStudyList() {
  let list = allWords();
  if (studyCat !== '전체') list = list.filter(w => w.cat === studyCat);
  if (studyFilter === 'miss') list = list.filter(w => state.missed[w.en]);
  studyList = list.slice();
  if (studyIdx >= studyList.length) studyIdx = 0;
}
export function renderCard() {
  $('fcard').classList.remove('flip');
  if (!studyList.length) {
    $('fcCat').textContent = ''; $('fcKo').textContent = '틀린 단어가 없어요';
    $('fcEn').textContent = ''; $('fcKo2').textContent = ''; $('cardPos').textContent = '0 / 0'; return;
  }
  const w = studyList[studyIdx];
  $('fcCat').textContent = w.cat;
  $('fcKo').textContent = w.ko;
  // 뒷면은 카드가 다 돌아간 뒤에 바꿔서 답이 미리 비치지 않게
  setTimeout(() => { $('fcEn').textContent = w.en; $('fcKo2').textContent = w.ko; }, 150);
  $('cardPos').textContent = `${studyIdx + 1} / ${studyList.length}`;
}
function renderChips() {
  $('catChips').innerHTML = cats().map(c => `<button class="chip${c === studyCat ? ' on' : ''}" data-c="${c}">${c}</button>`).join('');
}
export function renderStudy() {
  buildStudyList(); renderChips(); renderCard();
  const all = allWords();
  $('wordCount').textContent = `(${all.length}개)`;
  $('wordList').innerHTML = cats().slice(1).map(c => `<h4 class="wl-cat">${c}</h4><div class="wordlist">` +
    all.filter(w => w.cat === c).map(w => {
      const m = state.missed[w.en];
      return `<div class="wl"><div><b>${esc(w.en)}</b> <span>${esc(w.ko)}</span>${m ? ` <span class="miss">${m}번 틀림</span>` : ''}</div></div>`;
    }).join('') + '</div>').join('');
}
$('fcard').onclick = () => {
  if (!studyList.length) return;
  const fc = $('fcard'); fc.classList.toggle('flip');
  if (fc.classList.contains('flip')) speak(studyList[studyIdx].en);
};
$('fcPrev').onclick = () => { if (!studyList.length) return; studyIdx = (studyIdx - 1 + studyList.length) % studyList.length; renderCard(); };
$('fcNext').onclick = () => { if (!studyList.length) return; studyIdx = (studyIdx + 1) % studyList.length; renderCard(); };
$('fcShuffle').onclick = () => { shuffle(studyList); studyIdx = 0; renderCard(); };
$('fcSpeak').onclick = () => studyList.length && speak(studyList[studyIdx].en);
$('goTest').onclick = () => switchTab('test');
$('studySeg').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  studyFilter = b.dataset.f; studyIdx = 0;
  $('studySeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  buildStudyList(); renderCard();
};
$('catChips').onclick = e => {
  const b = e.target.closest('.chip'); if (!b) return;
  studyCat = b.dataset.c; studyIdx = 0;
  renderChips(); buildStudyList(); renderCard();
};
