import * as THREE from 'three';
import { $ } from '../dom.js';
import { state } from '../state.js';
import { RAR, RARITIES, MAX_LEVEL, lvl, LEVELS, LUCK_MAX, SHARD_VALUE, chanceOf, pct } from '../config.js';
import { canDismantle, spare, spareShards, dismantle, dismantleAll, buyLuck, luckMaxed, nextLuckCost } from '../forge.js';
import { toast, renderOdds } from './common.js';
import { SFX } from '../sound.js';
import { basic, disposeObj, makeEnv } from '../three/helpers.js';
import { buildWeapon, WEAPONS } from '../three/weapons.js';

/* =========================================================
   무기 도감 + 3D 미리보기
   ========================================================= */
export let pv = null;
export function getPV() {
  if (pv) return pv;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; r.setClearColor(0x000000, 0);
  const sc = new THREE.Scene(); sc.environment = makeEnv(r);
  sc.add(new THREE.HemisphereLight(0xe6f4f0, 0x1d4a50, 1.1));
  const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(3, 5, 6); sc.add(d);
  const pl = new THREE.PointLight(0xff8ac0, 20, 10); pl.position.set(-3, 1, 3); sc.add(pl);
  const cam = new THREE.PerspectiveCamera(35, 1, .1, 50); cam.position.set(0, 0, 6.2);
  pv = { r, sc, cam, obj: null, open: false, rotY: 0 };
  return pv;
}
export const thumbCache = {};
export function thumb(w, owned) {
  const k = w.id + (owned ? 1 : 0); if (thumbCache[k]) return thumbCache[k];
  const p = getPV(); p.r.setPixelRatio(1); p.r.setSize(240, 240, false); p.cam.aspect = 1; p.cam.updateProjectionMatrix();
  const o = buildWeapon(w, 2.7); o.rotation.set(0, .5, -.65); o.userData.update?.(1.3);
  if (!owned) { p.sc.overrideMaterial = basic(0x072326); o.traverse(c => { if (c.isSprite || c.isPoints) c.visible = false; }); }
  p.sc.add(o); p.r.render(p.sc, p.cam);
  const url = p.r.domElement.toDataURL('image/png');
  p.sc.remove(o); disposeObj(o);
  if (p.sc.overrideMaterial) { p.sc.overrideMaterial.dispose(); p.sc.overrideMaterial = null; }
  return thumbCache[k] = url;
}
export function renderDex() {
  const owned = WEAPONS.filter(w => state.inv[w.id]).length;
  const acc = state.correct + state.wrong ? Math.round(state.correct / (state.correct + state.wrong) * 100) : 0;
  const got = state.got.length, last = state.level >= MAX_LEVEL;
  $('lvProg').innerHTML = `<div class="row"><b>Lv.${state.level} ${lvl().name}</b><span>${got}/${WEAPONS.length}</span></div>` +
    `<div class="bar"><i style="width:${got / WEAPONS.length * 100}%"></i></div>` +
    `<p>${last ? '마지막 기계예요. 여기서도 전부 모아 보세요.' : `이 기계에서 ${WEAPONS.length}종을 전부 뽑으면 ${LEVELS[state.level].name}로 업그레이드돼요. 다음 기계는 좋은 등급이 더 잘 안 나와요.`}</p>`;
  renderForge();
  $('dexStats').innerHTML = [
    [`${owned}/${WEAPONS.length}`, '모은 무기'], [state.pulls, '뽑은 횟수'], [state.correct, '맞힌 문제'], [acc + '%', '정답률'],
  ].map(([b, s]) => `<div><b>${b}</b>${s}</div>`).join('');
  $('dexGrid').innerHTML = [...WEAPONS].reverse().map(w => {
    const r = RAR[w.r], n = state.inv[w.id] || 0;
    return `<div class="dcard${n ? ' owned' : ''}" style="--rc:${r.color}" data-id="${w.id}">
      ${n ? `<span class="cnt">×${n}</span>` : ''}${state.got.includes(w.id) ? '<span class="here">이 기계에서 뽑음</span>' : ''}
      <img src="${thumb(w, !!n)}" alt="">
      <div class="rl${w.r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name}</div>
      <div class="nm">${n ? w.name : '아직 못 뽑음'}</div></div>`;
  }).join('');
}
$('dexGrid').onclick = e => {
  const c = e.target.closest('.dcard.owned'); if (!c) return;
  openModal(WEAPONS.find(w => w.id === c.dataset.id));
};
export function openModal(w) {
  const p = getPV(), r = RAR[w.r];
  $('modal').style.setProperty('--rc', r.color);
  renderModalInfo(w);
  $('modal').classList.add('show');
  $('pvWrap').appendChild(p.r.domElement);
  p.r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const W = $('pvWrap').clientWidth, H = $('pvWrap').clientHeight;
  p.r.setSize(W, H, false); p.cam.aspect = W / H; p.cam.updateProjectionMatrix();
  p.obj = buildWeapon(w, 2.9); p.sc.add(p.obj); p.open = true; p.rotY = 0;
}
export function closeModal() {
  if (!pv || !pv.open) return;
  pv.open = false; $('modal').classList.remove('show');
  pv.sc.remove(pv.obj); disposeObj(pv.obj); pv.obj = null;
}
export function renderPreview(dt, t) {
  if (!pvDrag) pv.rotY += dt * .8;
  pv.obj.rotation.y = pv.rotY; pv.obj.position.y = Math.sin(t * 1.5) * .06;
  pv.obj.userData.update?.(t);
  pv.r.render(pv.sc, pv.cam);
}
export let pvDrag = false, pvX = 0;
$('pvWrap').addEventListener('pointerdown', e => { pvDrag = true; pvX = e.clientX; });
addEventListener('pointermove', e => { if (pvDrag && pv) { pv.rotY += (e.clientX - pvX) * .012; pvX = e.clientX; } });
addEventListener('pointerup', () => pvDrag = false);
$('modalX').onclick = closeModal;
$('modal').onclick = e => { if (e.target === $('modal')) closeModal(); };

/* ========================================================= */

/* ---------- 분해와 행운 패널 ---------- */
function renderForge() {
  const sp = spareShards(), cost = nextLuckCost(), maxed = luckMaxed();
  // 행운을 한 단계 올리면 바뀌는 확률을 미리 보여 줌
  const now = Object.fromEntries(RARITIES.map(r => [r.key, chanceOf(r.key)]));
  state.luck++; const next = Object.fromEntries(RARITIES.map(r => [r.key, chanceOf(r.key)])); state.luck--;
  const preview = maxed ? '<p>행운이 최대예요.</p>' : '<div class="fg-odds">' + ['ultra', 'legend', 'hero'].map(k =>
    `<span style="--rc:${RAR[k].color}"><i class="cap-ic"></i>${RAR[k].name} ${pct(now[k])}% → <b>${pct(next[k])}%</b></span>`).join('') + '</div>';
  $('forge').innerHTML = `
    <div class="fg-head">
      <div><b>분해와 행운</b><p>남는 희귀·초희귀를 분해하면 조각이 나와요. 조각으로 행운을 올리면 모든 기계에서 좋은 등급이 조금씩 더 잘 나와요. 도감용으로 1개씩은 남겨 둬요.</p></div>
      <div class="fg-stats"><div><b>${state.shards}</b>조각</div><div><b>${state.luck}<small>/${LUCK_MAX}</small></b>행운</div></div>
    </div>
    ${preview}
    <div class="fg-btns">
      <button class="btn" id="dismAll" ${sp ? '' : 'disabled'}>남는 것 모두 분해${sp ? ` (+${sp} 조각)` : ''}</button>
      <button class="btn primary" id="buyLuck" ${maxed || state.shards < cost ? 'disabled' : ''}>${maxed ? '행운 최대' : `행운 올리기 (조각 ${cost}개)`}</button>
    </div>`;
  $('dismAll').onclick = () => {
    const got = dismantleAll(); if (!got) return;
    SFX.thud(); toast(`조각 ${got}개를 얻었어요`); renderDex();
  };
  $('buyLuck').onclick = () => {
    if (!buyLuck()) return;
    SFX.up(2); toast(`행운 ${state.luck}단계! 좋은 등급이 조금 더 잘 나와요`); renderDex(); renderOdds();
  };
}

function renderModalInfo(w) {
  const r = RAR[w.r], sp = spare(w), v = SHARD_VALUE[w.r];
  $('pvInfo').innerHTML = `<span class="rlabel${w.r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name}</span><h2>${w.name}</h2><p>${w.desc}<br>${state.inv[w.id]}개 보유</p>` +
    (canDismantle(w) ? `<div class="fg-btns">
      <button class="btn" id="dismOne" ${sp ? '' : 'disabled'}>1개 분해 (+${v} 조각)</button>
      <button class="btn" id="dismRest" ${sp > 1 ? '' : 'disabled'}>1개만 남기고 분해${sp > 1 ? ` (+${sp * v} 조각)` : ''}</button>
    </div>${sp ? '' : '<p class="fg-note">1개뿐이라 분해할 수 없어요.</p>'}` : '');
  if (!canDismantle(w)) return;
  const act = n => { const got = dismantle(w, n); if (!got) return; SFX.thud(); toast(`조각 ${got}개를 얻었어요 (총 ${state.shards}개)`); renderModalInfo(w); renderDex(); };
  $('dismOne').onclick = () => act(1);
  $('dismRest').onclick = () => act(spare(w));
}
