import * as THREE from 'three';
import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { TIERS, TIER_COINS } from '../words.js';
import { RAR, RARITIES, MAX_LEVEL, LEVELS, LUCK_MAX, SHOP, chanceOf, pct, machineCost } from '../config.js';
import { buyLuck, luckMaxed, nextLuckCost, machineMaxed, payMachine, buyWeapon, poolOf, freshOf } from '../forge.js';
import { toast, renderOdds, switchTab, updateHUD } from './common.js';
import { upgradeMachine } from '../gacha.js';
import { armLevel, armUpCost, buyArmUp, ARMS, KIND_NAME, lvMult, MAX_ARM_LV, galaxyState } from '../battle/data.js';
import { galaxyHTML, bindGalaxy } from './galaxy.js';
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
// 전투용 무기 그림: 칼끝이 위로 가게 세운 모습
export const spriteCache = {};
export function sprite(w) {
  if (spriteCache[w.id]) return spriteCache[w.id];
  const p = getPV(); p.r.setPixelRatio(1); p.r.setSize(160, 160, false); p.cam.aspect = 1; p.cam.updateProjectionMatrix();
  const o = buildWeapon(w, 3.6); o.rotation.set(0, .4, 0); o.userData.update?.(1.3);
  p.sc.add(o); p.r.render(p.sc, p.cam);
  const img = new Image(); img.src = p.r.domElement.toDataURL('image/png');
  p.sc.remove(o); disposeObj(o);
  return spriteCache[w.id] = img;
}
export function renderDex() {
  const owned = WEAPONS.filter(w => state.inv[w.id]).length;
  const acc = state.correct + state.wrong ? Math.round(state.correct / (state.correct + state.wrong) * 100) : 0;
  renderMachine();
  renderForge();
  renderShop();
  updateHUD();
  $('dexStats').innerHTML = [
    [`${owned}/${WEAPONS.length}`, '모은 무기'], [state.pulls, '뽑은 횟수'], [state.correct, '맞힌 문제'], [acc + '%', '정답률'],
  ].map(([b, s]) => `<div><b>${b}</b>${s}</div>`).join('');
  $('dexGrid').innerHTML = [...WEAPONS].reverse().map(w => {
    const r = RAR[w.r], n = state.inv[w.id] || 0;
    return `<div class="dcard${n ? ' owned' : ''}" style="--rc:${r.color}" data-id="${w.id}">
      ${n ? `<span class="here">전투 Lv.${armLevel(w.id)}${galaxyState(w) === 'on' ? ' ✦' : ''}</span>` : ''}
      <img src="${thumb(w, !!n)}" alt="">
      <div class="rl${w.r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name}</div>
      <div class="nm">${n ? w.name : '아직 못 뽑음'}</div>${w.m ? `<div class="mtag" style="--mc:${LEVELS[w.m - 1].color}">${LEVELS[w.m - 1].name} 이상</div>` : ''}</div>`;
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

/* ---------- 뽑기 기계 업그레이드 패널 ---------- */
// state를 잠깐 바꿔서 확률을 계산해 보고 되돌린다 (다음 단계 미리보기용)
function oddsWith(change) {
  const undo = change(), o = Object.fromEntries(RARITIES.map(r => [r.key, chanceOf(r.key)])); undo();
  return o;
}
const oddsRow = (now, next) => '<div class="fg-odds">' + ['ultra', 'legend', 'hero'].map(k =>
  `<span style="--rc:${RAR[k].color}"><i class="cap-ic"></i>${RAR[k].name} ${pct(now[k])}% → <b>${pct(next[k])}%</b></span>`).join('') + '</div>';
function renderMachine() {
  const maxed = machineMaxed(), cost = maxed ? 0 : machineCost();
  // 가장 높은 기계와 다음 기계의 확률 비교 (state를 잠깐 바꿔서 계산)
  const at = lv => () => { const a = state.level; state.level = lv; return () => { state.level = a; }; };
  const now = oddsWith(at(state.level)), next = maxed ? now : oddsWith(at(state.level + 1));
  const nextEx = maxed ? [] : WEAPONS.filter(w => w.m === state.level + 1);
  $('lvProg').innerHTML = `<div class="fg-head">
      <div><b>뽑기 기계 Lv.${state.level} ${LEVELS[state.level - 1].name}</b><p>${maxed ? '모든 기계를 열었어요. 전용 칼 12종이 모두 나와요.' : `조각으로 ${LEVELS[state.level].name}를 열면 높은 등급 확률은 조금 낮아지지만, 전용 칼 ${nextEx.length}종(${nextEx.map(w => RAR[w.r].name).join('·')})이 새로 나오기 시작해요. 전용 칼은 그 기계 이상이면 계속 나와요. 단어 테스트도 ${TIERS[state.level]} 단계로 어려워지고, 맞히면 받는 코인이 ${TIER_COINS[state.level]}개가 돼요.`}</p></div>
      <div class="fg-stats"><div><b>${state.level}<small>/${MAX_LEVEL}</small></b>기계</div></div>
    </div>
    ${maxed ? '' : `<div class="bar"><i style="width:${Math.min(1, state.shards / cost) * 100}%"></i></div>${oddsRow(now, next)}`}
    <div class="fg-btns"><button class="btn primary" id="buyMachine" ${maxed || state.shards < cost ? 'disabled' : ''}>${maxed ? '최고 단계' : `기계 업그레이드 (조각 ${state.shards}/${cost})`}</button></div>`;
  $('buyMachine').onclick = () => {
    if (!payMachine()) return;
    switchTab('gacha'); upgradeMachine();
  };
}

/* ---------- 행운 패널 ---------- */
function renderForge() {
  const cost = nextLuckCost(), maxed = luckMaxed();
  // 행운을 한 단계 올리면 바뀌는 확률을 미리 보여 줌
  const now = oddsWith(() => () => {}), next = oddsWith(() => (state.luck++, () => state.luck--));
  const preview = maxed ? '<p>행운이 최대예요.</p>' : oddsRow(now, next);
  $('forge').innerHTML = `
    <div class="fg-head">
      <div><b>행운</b><p>조각은 전투에서 적을 잡거나, 뽑기에서 이미 다 모은 등급이 나왔을 때 받아요. 조각으로 행운을 올리면 모든 기계에서 좋은 등급이 조금씩 더 잘 나와요.</p></div>
      <div class="fg-stats"><div><b>${state.shards}</b>조각</div><div><b>${state.luck}<small>/${LUCK_MAX}</small></b>행운</div></div>
    </div>
    ${preview}
    <div class="fg-btns">
      <button class="btn primary" id="buyLuck" ${maxed || state.shards < cost ? 'disabled' : ''}>${maxed ? '행운 최대' : `행운 올리기 (조각 ${cost}개)`}</button>
    </div>`;
  $('buyLuck').onclick = () => {
    if (!buyLuck()) return;
    SFX.up(2); toast(`행운 ${state.luck}단계! 좋은 등급이 조금 더 잘 나와요`); renderDex(); renderOdds();
  };
}

/* ---------- 조각 교환소: 영웅 이상 무기를 확정으로 ---------- */
function renderShop() {
  const rows = ['hero', 'legend', 'ultra'].map(k => {
    const r = RAR[k], pool = poolOf(k), left = freshOf(k).length;
    return `<button class="btn shop-b" data-shop="${k}" style="--rc:${r.color}" ${!left || state.shards < SHOP[k] ? 'disabled' : ''}>
      <span class="${k === 'ultra' ? 'ultra-c' : ''}"><i class="cap-ic"></i>${r.name} 확정</span><b>${left ? `조각 ${SHOP[k]}` : '다 모았어요'}</b><small>${pool.length - left}/${pool.length}종 보유</small></button>`;
  }).join('');
  $('shop').innerHTML = `<div class="fg-head">
      <div><b>조각 교환소</b><p>조각으로 그 등급에서 아직 없는 무기 하나를 확정으로 받아요. 기계 전용 칼은 지금 기계에서 나오는 것만 받을 수 있어요.</p></div>
      <div class="fg-stats"><div><b>${state.shards}</b>조각</div></div>
    </div><div class="shop-row">${rows}</div>`;
}
$('shop').onclick = e => {
  const b = e.target.closest('[data-shop]'); if (!b) return;
  const w = buyWeapon(b.dataset.shop);
  if (!w) { SFX.wrong(); toast('조각이 모자라요'); return; }
  SFX.fanfare(RAR[w.r].rank);
  toast(`${RAR[w.r].name} 「${w.name}」 NEW!`);
  renderDex(); renderOdds();
};

// 상세창이 열려 있는 무기 (갤럭시 파워를 바꾸면 다시 그림)
let modalW = null;
bindGalaxy($('pvInfo'), () => { if (modalW) renderModalInfo(modalW); renderDex(); });
function renderModalInfo(w) {
  modalW = w;
  const r = RAR[w.r];
  const lv = armLevel(w.id), d = ARMS[w.id], upCost = armUpCost(w), lvMax = lv >= MAX_ARM_LV;
  $('pvInfo').innerHTML = `<span class="rlabel${w.r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name}</span><h2>${w.name}</h2><p>${w.desc}<br>${w.m ? `<b style="color:${LEVELS[w.m - 1].color}">${LEVELS[w.m - 1].name} 이상에서 뽑을 수 있어요</b><br>` : ''}전투 Lv.${lv}/${MAX_ARM_LV} · ${KIND_NAME[d.kind]} · 공격력 ${Math.round(d.dmg * lvMult(lv))}</p>
    <div class="fg-btns"><button class="btn primary" id="armUp" ${lvMax || state.shards < upCost ? 'disabled' : ''}>${lvMax ? '전투 레벨 최대' : `전투 레벨 올리기 (조각 ${state.shards}/${upCost})`}</button></div>` + galaxyHTML(w);
  $('armUp').onclick = () => {
    if (!buyArmUp(w)) return;
    save(); SFX.up(2); toast(`${w.name} 전투 Lv.${armLevel(w.id)}!`); renderModalInfo(w); renderDex();
  };
}
