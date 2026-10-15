import { $ } from '../dom.js';
import { state } from '../state.js';
import { RAR } from '../config.js';
import { SFX } from '../sound.js';
import { WEAPONS } from '../three/weapons.js';
import { ARMS, KIND_NAME, MAX_EQUIP, armLevel, lvMult } from '../battle/data.js';
import { metas, findMeta, saveMeta, deleteMeta, isWorn, MAX_METAS, NAME_MAX } from '../meta.js';
import { thumb } from './dex.js';
import { equipped } from './battle.js';
import { toast, esc } from './common.js';

/* =========================================================
   메타 화면(tab-meta): 무기 3개를 골라 이름을 붙여 저장하고 고치거나 지운다. 장착은 전투 탭에서 (ui/battle.js)
   ========================================================= */
const byId = id => WEAPONS.find(w => w.id === id);
const power = id => Math.round(ARMS[id].dmg * lvMult(armLevel(id)));
// 만드는 중인 메타: editId가 있으면 그 메타를 고치는 중
let pick = [], name = '', editId = null, delArm = null;

export function renderMeta() {
  const list = metas(), eq = equipped(), full = list.length >= MAX_METAS && !editId;
  const owned = [...WEAPONS].reverse().filter(w => state.inv[w.id]);
  pick = pick.filter(id => state.inv[id]);
  const slot = id => {
    if (!id) return '<div class="slot empty"><span>무기를 골라 주세요</span></div>';
    const w = byId(id);
    return `<div class="slot" style="--rc:${RAR[w.r].color}"><div class="slot-main"><img src="${thumb(w, true)}" alt="">
      <div><b>${w.name}</b><small>전투 Lv.${armLevel(id)} · ${KIND_NAME[ARMS[id].kind]} · 공격력 ${power(id)}</small></div>
      <button class="out" data-unpick="${id}" aria-label="${w.name} 빼기">빼기</button></div></div>`;
  };
  const card = w => {
    const on = pick.includes(w.id), r = RAR[w.r];
    return `<button class="acard${on ? ' on' : ''}" style="--rc:${r.color}" data-pick="${w.id}">
      ${on ? `<em>${pick.indexOf(w.id) + 1}번</em>` : ''}<img src="${thumb(w, true)}" alt="">
      <span class="rl${w.r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name}</span>
      <b>${w.name}</b><small>Lv.${armLevel(w.id)} · ${KIND_NAME[ARMS[w.id].kind]}</small></button>`;
  };
  const metaCard = m => {
    const worn = isWorn(m, eq), sure = delArm === m.id;
    return `<div class="mt-card${worn ? ' worn' : ''}">
      <div class="mt-top"><b>${esc(m.name)}</b>${worn ? '<span class="mt-worn">장착 중</span>' : ''}
        <span class="mt-pow">공격력 합 ${m.arms.reduce((a, id) => a + (state.inv[id] ? power(id) : 0), 0)}</span></div>
      <div class="mt-arms">${m.arms.map(id => {
        const w = byId(id), have = !!state.inv[id];
        return `<div class="mt-arm${have ? '' : ' gone'}" style="--rc:${RAR[w.r].color}"><img src="${thumb(w, have)}" alt=""><span>${have ? w.name : '없는 무기'}</span><small>${have ? `Lv.${armLevel(id)}` : ''}</small></div>`;
      }).join('')}</div>
      <div class="mt-btns">
        <button class="btn" data-edit="${m.id}">고치기</button>
        <button class="btn${sure ? ' danger' : ''}" data-del="${m.id}">${sure ? '정말 지울까요?' : '지우기'}</button>
      </div></div>`;
  };
  $('metaBox').innerHTML = `
    <div class="mt-head"><div><h2>메타</h2><p>자주 쓰는 무기 3개 조합을 이름을 붙여 저장해 두세요. 저장한 메타는 <b>전투</b> 탭에서 골라 장착하고 출격해요. 로그인하면 계정에 저장돼서 다른 기기에서도 그대로 써요.</p></div>
      <div class="mt-count"><b>${list.length}</b>/${MAX_METAS}</div></div>
    <div class="mt-edit">
      <div class="bl-label">${editId ? '메타 고치기' : '새 메타 만들기'} <small>가진 무기 중 ${MAX_EQUIP}개를 골라요</small></div>
      ${full ? `<p class="mt-full">메타가 ${MAX_METAS}개로 가득 찼어요. 아래에서 하나를 지우면 새로 만들 수 있어요.</p>` : `
      <div class="mt-name"><input id="metaName" maxlength="${NAME_MAX}" placeholder="메타 이름 (예: 보스 잡기용)" value="${esc(name)}" autocomplete="off">
        <button class="btn" id="metaFromEq" ${eq.length ? '' : 'disabled'}>지금 장착한 무기로 채우기</button></div>
      <div class="slots">${Array.from({ length: MAX_EQUIP }, (_, i) => slot(pick[i])).join('')}</div>
      <div class="mt-save">${editId ? '<button class="btn" id="metaCancel">그만 고치기</button>' : (pick.length ? '<button class="btn" id="metaClear">비우기</button>' : '')}
        <button class="btn primary" id="metaSave" ${pick.length === MAX_EQUIP ? '' : 'disabled'}>${editId ? '고친 내용 저장' : '메타 저장'}${pick.length === MAX_EQUIP ? '' : ` (${pick.length}/${MAX_EQUIP})`}</button></div>
      <div class="armgrid">${owned.length ? owned.map(card).join('') : '<p class="bl-empty">아직 무기가 없어요. 뽑기에서 무기를 뽑아 오세요.</p>'}</div>`}
    </div>
    <div class="bl-label">저장한 메타 <small>${list.length ? '장착은 전투 탭에서 해요' : ''}</small></div>
    <div class="mt-list">${list.length ? list.map(metaCard).join('') : '<p class="bl-empty">아직 저장한 메타가 없어요. 위에서 무기 3개를 골라 저장해 보세요.</p>'}</div>`;
}

function resetEdit() { pick = []; name = ''; editId = null; }
$('metaBox').addEventListener('input', e => { if (e.target.id === 'metaName') name = e.target.value; });
$('metaBox').onclick = e => {
  const t = e.target;
  const p = t.closest('[data-pick]');
  if (p) {
    const id = p.dataset.pick;
    if (pick.includes(id)) pick = pick.filter(x => x !== id);
    else if (pick.length >= MAX_EQUIP) { SFX.wrong(); toast(`${MAX_EQUIP}개를 이미 골랐어요. 위에서 하나를 빼고 골라 주세요.`); return; }
    else pick.push(id);
    SFX.tick(); return renderMeta();
  }
  const u = t.closest('[data-unpick]');
  if (u) { pick = pick.filter(x => x !== u.dataset.unpick); SFX.tick(); return renderMeta(); }
  if (t.closest('#metaFromEq')) { pick = [...equipped()]; SFX.tick(); return renderMeta(); }
  if (t.closest('#metaClear') || t.closest('#metaCancel')) { resetEdit(); SFX.tick(); return renderMeta(); }
  if (t.closest('#metaSave')) {
    const res = saveMeta(name, pick, editId);
    if (res === 'dup') { SFX.wrong(); toast('같은 무기 조합의 메타가 이미 있어요.'); return; }
    if (res === 'full') { SFX.wrong(); toast(`메타는 ${MAX_METAS}개까지 저장할 수 있어요.`); return; }
    if (res !== 'ok') { SFX.wrong(); toast(`가진 무기 ${MAX_EQUIP}개를 골라 주세요.`); return; }
    SFX.up(2); toast(editId ? '메타를 고쳤어요' : '메타를 저장했어요');
    resetEdit(); return renderMeta();
  }
  const ed = t.closest('[data-edit]');
  if (ed) {
    const m = findMeta(ed.dataset.edit);
    editId = m.id; name = m.name; pick = m.arms.filter(id => state.inv[id]); delArm = null;
    SFX.tick(); renderMeta(); $('metaName')?.focus(); document.querySelector('#tab-meta').scrollTop = 0; return;
  }
  const del = t.closest('[data-del]');
  if (del) {
    // 한 번 누르면 확인, 한 번 더 누르면 지움
    if (delArm !== del.dataset.del) { delArm = del.dataset.del; SFX.tick(); return renderMeta(); }
    deleteMeta(delArm); if (editId === delArm) resetEdit(); delArm = null;
    SFX.thud(); toast('메타를 지웠어요'); return renderMeta();
  }
};
