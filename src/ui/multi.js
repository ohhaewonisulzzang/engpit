import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { FREE, RAR, RARITIES, MULTI } from '../config.js';
import { ac, SFX } from '../sound.js';
import { rollOne, pull, upgrading, multiOpen, setMultiOpen, flashScreen } from '../gacha.js';
import { spareShards, dismantleAll } from '../forge.js';
import { toast, updateHUD, renderOdds } from './common.js';
import { thumb } from './dex.js';

/* =========================================================
   한 번에 뽑기 (10회·100회): 연출 없이 바로 굴리고 결과를 한 화면에 모아 보여 준다
   - 천장·전용 칼·장착은 한 번 뽑기와 똑같이 적용 (gacha.js의 rollOne)
   ========================================================= */
export function pullMany(n) {
  if (pull || upgrading || multiOpen) return;
  if (!FREE && state.coins < n) {
    SFX.wrong(); toast(`${n}회 뽑기는 코인 ${n}개가 필요해요. 지금 ${state.coins}개 있어요.`);
    $('coinBox').classList.remove('shake'); void $('coinBox').offsetWidth; $('coinBox').classList.add('shake');
    return;
  }
  ac();
  const got = Array.from({ length: n }, rollOne);
  save(); updateHUD(); renderOdds();
  show(n, got);
}

function show(n, got) {
  // 같은 무기끼리 묶고, 높은 등급 → 새 무기 먼저
  const by = new Map();
  for (const g of got) {
    const e = by.get(g.w.id) || { w: g.w, rar: g.rar, n: 0, isNew: false };
    e.n++; e.isNew ||= g.isNew; by.set(g.w.id, e);
  }
  const items = [...by.values()].sort((a, b) => b.rar.rank - a.rar.rank || b.isNew - a.isNew);
  const cnt = Object.fromEntries(RARITIES.map(r => [r.key, 0])); got.forEach(g => cnt[g.rar.key]++);
  const top = items[0].rar, fresh = items.filter(i => i.isNew).length, sp = spareShards();
  $('multiRes').innerHTML = `<div class="mp-box" style="--rc:${top.color}">
      <div class="mp-head"><b>${n}회 뽑기 결과</b><span>${fresh ? `새 무기 ${fresh}종!` : '새 무기는 없었어요'}</span></div>
      <div class="mp-sum">${[...RARITIES].reverse().map(r => `<span style="--rc:${r.color}" class="${cnt[r.key] ? '' : 'zero'}${r.key === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name} <b>${cnt[r.key]}</b></span>`).join('')}</div>
      <div class="mp-grid">${items.map(i => `<div class="mp-it" style="--rc:${i.rar.color}">
          <img src="${thumb(i.w, true)}" alt=""><span>${i.w.name}</span>
          ${i.n > 1 ? `<em>×${i.n}</em>` : ''}${i.isNew ? '<u>NEW</u>' : ''}</div>`).join('')}</div>
      <div class="mp-btns">
        <button class="btn" id="mpDism" ${sp ? '' : 'hidden'}>남는 희귀·초희귀 분해 (+${sp} 조각)</button>
        <button class="btn" id="mpOk">확인</button>
        <button class="btn primary" id="mpAgain" ${!FREE && state.coins < n ? 'disabled' : ''}>한 번 더 <i class="ci"></i>${n}</button>
      </div></div>`;
  $('multiRes').classList.add('show'); $('pullbar').style.opacity = 0;
  setMultiOpen(true);
  if (top.rank >= RAR.legend.rank) flashScreen();
  SFX.fanfare(top.rank);
  $('mpOk').onclick = () => closeMulti();
  $('mpAgain').onclick = () => { closeMulti(); pullMany(n); };
  $('mpDism').onclick = () => {
    const s = dismantleAll(); if (!s) return;
    SFX.thud(); toast(`조각 ${s}개를 얻었어요 (총 ${state.shards}개)`);
    $('mpDism').hidden = true;
  };
}
export function closeMulti() {
  if (!multiOpen) return;
  $('multiRes').classList.remove('show'); $('pullbar').style.opacity = 1;
  setMultiOpen(false);
}
MULTI.forEach(n => { $('pull' + n).onclick = () => pullMany(n); });
addEventListener('keydown', e => {
  if (!multiOpen) return;
  if (e.key === 'Escape') closeMulti();
  if (e.key === 'Enter') { e.preventDefault(); closeMulti(); }
});
