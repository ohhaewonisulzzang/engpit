import * as THREE from 'three';
import { $ } from './dom.js';
import { state, save } from './state.js';
import { RARITIES, RAR, TEST_MODE, MAX_LEVEL, lvl, chanceOf, SHARD_VALUE, EXCLUSIVE_CHANCE } from './config.js';
import { ac, SFX } from './sound.js';
import { V3, glow, disposeObj, U } from './three/helpers.js';
import { buildWeapon, WEAPONS } from './three/weapons.js';
import { stage, renderer, scene, camera, CAM_HOME, LOOK_HOME, CAM_FOCUS, LOOK_FOCUS, R, revealLight, makeCapsule } from './three/scene.js';
import { machine, topBulbM, domeCaps, bulbs, crank, btnM, flap, machineFx, applyMachineTheme, updateMachine } from './three/machine.js';
import { dimmer, makeRays, burst, updateBursts } from './three/effects.js';
import { currentTab, toast, updateHUD, renderOdds } from './ui/common.js';
import { spare, dismantle } from './forge.js';
import { pv, renderPreview } from './ui/dex.js';
import { armLevel, MAX_EQUIP } from './battle/data.js';

/* =========================================================
   뽑기 진행
   ========================================================= */
export let pull = null, camF = 0, shake = 0, upgrading = null;
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const elastic = t => t === 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1;

export function rollRarity() {
  let r = Math.random() * 100;
  for (let i = RARITIES.length - 1; i >= 0; i--) { r -= chanceOf(RARITIES[i].key); if (r < 0) return RAR[RARITIES[i].key]; }
  return RAR.rare;
}
export function startPull() {
  if (pull || upgrading) return false;
  if (!TEST_MODE && state.coins < 1) {
    toast('코인이 없어요. 단어 테스트에서 한 문제 맞힐 때마다 1개씩 받을 수 있어요.');
    $('coinBox').classList.remove('shake'); void $('coinBox').offsetWidth; $('coinBox').classList.add('shake');
    SFX.wrong(); return false;
  }
  ac();
  if (!TEST_MODE) state.coins--;
  state.pulls++;
  const rar = rollRarity();
  // 지금 기계 레벨 이하의 전용 칼이 그 등급에 있으면 EXCLUSIVE_CHANCE 확률로 전용 칼, 아니면 일반 무기
  const ex = WEAPONS.filter(w => w.m && w.m <= state.level && w.r === rar.key);
  const pool = ex.length && Math.random() < EXCLUSIVE_CHANCE ? ex : WEAPONS.filter(w => !w.m && w.r === rar.key);
  const w = pool[Math.floor(Math.random() * pool.length)];
  const isNew = !state.inv[w.id];
  state.inv[w.id] = (state.inv[w.id] || 0) + 1;
  // 처음 뽑은 무기는 전투 장착 칸이 비어 있으면 바로 장착
  if (isNew && Array.isArray(state.equip) && state.equip.length < MAX_EQUIP) state.equip.push(w.id);
  save(); updateHUD(); renderOdds();
  // 캡슐 색 연출 (높은 등급은 낮은 색에서 승급!)
  let seq = [rar.key];
  if (rar.key === 'legend') seq = ['hero', 'legend'];
  if (rar.key === 'ultra') seq = ['hero', 'legend', 'ultra'];
  if (rar.key === 'hero' && Math.random() < .35) seq = ['super', 'hero'];
  const cap = makeCapsule(RAR[seq[0]].hex);
  pull = { phase: 'crank', t: 0, rar, w, isNew, seq, stage: 0, cap, lastTick: -1 };
  $('pullBtn').disabled = true; $('pullbar').style.opacity = 0;
  return true;
}
export function setCapColor(key) { pull.capKey = key; pull.cap.userData.topM.color.setHex(RAR[key].hex); if (pull.capGlow) pull.capGlow.material.color.setHex(RAR[key].hex); }

export function updatePull(dt, t) {
  if (!pull) return;
  pull.t += dt; const T = pull.t, cap = pull.cap;
  if (pull.capKey === 'ultra') {
    cap.userData.topM.color.setHSL((t * .6) % 1, 1, .55);
    pull.capGlow.material.color.setHSL((t * .6) % 1, 1, .6);
  }
  switch (pull.phase) {
    case 'crank': {
      const u = Math.min(T / 1.3, 1);
      crank.rotation.z = -ease(u) * Math.PI * 2;
      const tk = Math.floor(u * 10); if (tk !== pull.lastTick) { pull.lastTick = tk; SFX.tick(); }
      machine.position.x = Math.sin(T * 55) * .012;
      domeCaps.forEach(c => c.position.set(c.userData.base.x + (Math.random() - .5) * .05, c.userData.base.y + Math.abs(Math.sin(T * 20 + c.userData.ph)) * .08, c.userData.base.z + (Math.random() - .5) * .05));
      if (u >= 1) {
        crank.rotation.z = 0; machine.position.x = 0;
        pull.phase = 'drop'; pull.t = 0; scene.add(cap); cap.position.set(0, .6, .9); setCapColor(pull.seq[0]);
      }
      break;
    }
    case 'drop': {
      const u = Math.min(T / 1.1, 1);
      if (u < .3) { const s = u / .3; cap.position.set(0, .6, THREE.MathUtils.lerp(.9, 1.6, s)); flap.rotation.x = -s * 1.1; }
      else {
        if (!pull.thud) { pull.thud = 1; SFX.thud(); }
        const s = (u - .3) / .7;
        cap.position.set(0, .6 - .38 * s + Math.abs(Math.sin(s * Math.PI * 2.5)) * .25 * (1 - s), THREE.MathUtils.lerp(1.6, 2.9, s));
        cap.rotation.x += dt * 9; flap.rotation.x = -1.1 * (1 - s);
      }
      if (u >= 1) {
        flap.rotation.x = 0; pull.phase = 'rise'; pull.t = 0; pull.from = cap.position.clone();
        pull.capGlow = glow(RAR[pull.capKey].hex, 1.2, 0); cap.add(pull.capGlow);
        SFX.charge(.9);
      }
      break;
    }
    case 'rise': {
      const u = Math.min(T / .9, 1), e = easeOut(u);
      cap.position.lerpVectors(pull.from, R, e); cap.position.y += Math.sin(e * Math.PI) * .6;
      cap.scale.setScalar(1 + e * 1.3);
      cap.rotation.x *= .9; cap.rotation.y += dt * 4;
      dimmer.material.opacity = e * .75; pull.capGlow.material.opacity = e * .8;
      if (u >= 1) { pull.phase = 'charge'; pull.t = 0; pull.dur = 1.0 + (pull.seq.length - 1) * .85; }
      break;
    }
    case 'charge': {
      const k = Math.min(pull.seq.length - 1, Math.floor(T / .85));
      if (k > pull.stage) {
        pull.stage = k; setCapColor(pull.seq[k]); SFX.up(k);
        burst(R, pull.seq[k] === 'ultra' ? 'rainbow' : RAR[pull.seq[k]].hex, 60, 3);
        flashScreen(); shake = .25;
      }
      const p = T / pull.dur, amp = .03 + p * .09;
      cap.position.set(R.x + (Math.random() - .5) * amp, R.y + (Math.random() - .5) * amp, R.z);
      cap.rotation.x = 0; cap.rotation.z = Math.sin(T * 32) * .25 * p; cap.rotation.y += dt * (2 + p * 10);
      cap.scale.setScalar(2.3 + Math.sin(T * 18) * .08 * p);
      pull.capGlow.scale.setScalar(1.2 + p * 1.5 + Math.sin(T * 14) * .2);
      if (T >= pull.dur) openCapsule();
      break;
    }
    case 'show': {
      const top = pull.halves;
      top.forEach(h => {
        h.m.position.addScaledVector(h.v, dt); h.v.y -= dt * 6;
        h.m.rotation.x += h.r.x * dt; h.m.rotation.z += h.r.z * dt;
        h.m.material.opacity = Math.max(0, 1 - T * 2); h.m.scale.multiplyScalar(1 - dt * 1.5);
      });
      const s = elastic(Math.min(T / 1.1, 1));
      pull.weapon.scale.setScalar(s);
      pull.weapon.position.y = R.y + Math.sin(t * 1.6) * .06;
      if (!dragging) pull.weapon.rotation.y += dt * (T < .8 ? 8 * (1 - T / .8) + .7 : .7);
      pull.weapon.userData.update?.(t);
      if (pull.rays) { pull.rays.rotation.z += dt * .25; pull.rays.scale.setScalar(Math.min(1, T * 2)); }
      revealLight.intensity = THREE.MathUtils.lerp(revealLight.intensity, 15 + pull.rar.rank * 10, dt * 3);
      if (pull.rar.key === 'ultra') revealLight.color.setHSL((t * .3) % 1, 1, .6);
      if (T > .7 && !pull.shown) { pull.shown = 1; showResult(); }
      break;
    }
    case 'close': {
      const u = Math.min(T / .4, 1);
      pull.weapon.scale.setScalar(1 - easeOut(u));
      pull.weapon.userData.update?.(t);
      if (pull.rays) pull.rays.scale.setScalar(1 - u);
      dimmer.material.opacity = .75 * (1 - u); revealLight.intensity *= .85;
      if (u >= 1) finishPull();
      break;
    }
  }
}
export function openCapsule() {
  const p = pull; p.phase = 'show'; p.t = 0;
  const { top, bot } = p.cap.userData;
  p.cap.remove(p.capGlow); disposeObj(p.capGlow);
  scene.attach(top); scene.attach(bot); scene.remove(p.cap);
  [top, bot].forEach(m => { m.material.transparent = true; });
  bot.children[0].material.transparent = true;
  p.halves = [
    { m: top, v: new V3(-1.6, 3.2, .6), r: new V3(-3, 0, 4) },
    { m: bot, v: new V3(1.6, 1.0, .6), r: new V3(3, 0, -4) },
  ];
  const rk = p.rar.rank, col = p.rar.key === 'ultra' ? 'rainbow' : p.rar.hex;
  p.weapon = buildWeapon(p.w, 1.75); p.weapon.position.copy(R); p.weapon.scale.setScalar(0); scene.add(p.weapon);
  if (rk >= 2) { p.rays = makeRays(p.rar.hex, p.rar.key === 'ultra'); p.rays.position.set(R.x, R.y, R.z - .9); scene.add(p.rays); }
  burst(R, col, [50, 90, 150, 240, 420][rk], [1.8, 2.6, 3.2, 4.2, 5.5][rk], rk >= 3 ? .12 : .09);
  if (rk >= 3) setTimeout(() => pull && burst(R, col, 200, 6, .1), 250);
  if (rk >= 1) flashScreen();
  shake = [0, .1, .25, .45, .8][rk];
  revealLight.color.setHex(p.rar.hex); revealLight.intensity = 60 + rk * 30;
  SFX.pop(); setTimeout(() => SFX.fanfare(rk), 80);
  const b = $('banner'); b.textContent = p.rar.banner; b.style.setProperty('--rc', p.rar.color);
  b.className = 'banner'; void b.offsetWidth; b.className = 'banner show' + (p.rar.key === 'ultra' ? ' ultra' : '') + (p.rar.key === 'rare' ? ' small' : '');
}
export function showResult() {
  const p = pull, el = $('result');
  el.style.setProperty('--rc', p.rar.color);
  $('resRar').innerHTML = '<i class="cap-ic"></i>' + p.rar.name;
  $('resRar').classList.toggle('ultra-c', p.rar.key === 'ultra');
  $('resName').innerHTML = p.w.name + (p.isNew ? '<span class="newb">NEW!</span>' : '');
  $('resDesc').innerHTML = p.w.desc + `<br><span class="own">${state.inv[p.w.id]}개 보유</span> · 전투 Lv.${armLevel(state.inv[p.w.id])}`;
  $('btnAgain').disabled = !TEST_MODE && state.coins < 1;
  updateDismBtn();
  el.classList.add('show'); $('pullbar').style.opacity = 0;
  if (auto.on) autoNext(p);
}
// 결과 카드: 이미 갖고 있던 희귀/초희귀면 바로 분해할 수 있게
function updateDismBtn() {
  const w = pull.w, b = $('btnDism'), n = spare(w);
  b.hidden = !n;
  if (n) b.textContent = `분해 +${SHARD_VALUE[w.r]} 조각`;
}
$('btnDism').onclick = () => {
  if (!pull || pull.phase !== 'show') return;
  const got = dismantle(pull.w, 1); if (!got) return;
  SFX.thud(); toast(`조각 ${got}개를 얻었어요 (총 ${state.shards}개)`);
  $('btnDism').hidden = true;
  $('resDesc').querySelector('.own').textContent = `${state.inv[pull.w.id]}개 보유`;
  $('resDesc').lastChild.textContent = ` · 전투 Lv.${armLevel(state.inv[pull.w.id])}`;
};
export function closeResult(again) {
  if (!pull || pull.phase !== 'show') return;
  if (!again && auto.on) setAuto(false); // 직접 닫으면 자동 뽑기도 멈춤
  $('result').classList.remove('show'); $('banner').className = 'banner';
  pull.phase = 'close'; pull.t = 0; pull.again = again;
}
export function finishPull() {
  const p = pull;
  [p.weapon, p.rays, ...p.halves.map(h => h.m)].forEach(o => { if (o) { scene.remove(o); disposeObj(o); } });
  revealLight.intensity = 0; dimmer.material.opacity = 0;
  pull = null;
  $('pullBtn').disabled = false; $('pullbar').style.opacity = 1;
  updateHUD();
  if (p.again && !startPull()) setAuto(false);
}

/* =========================================================
   자동 뽑기: 결과를 잠깐 보여 주고 바로 다음 뽑기 (연출은 빠르게)
   - 정한 등급 이상이 나오거나 코인이 떨어지면 멈춘다
   - 원하면 남는 희귀·초희귀를 그 자리에서 분해한다
   ========================================================= */
const AUTO_KEY = 'engpit_auto';
export const auto = (() => {
  const a = { on: false, stop: 'legend', dism: false, timer: 0 };
  try { Object.assign(a, JSON.parse(localStorage.getItem(AUTO_KEY)), { on: false }); } catch (e) {}
  return a;
})();
const saveAuto = () => { try { localStorage.setItem(AUTO_KEY, JSON.stringify({ stop: auto.stop, dism: auto.dism })); } catch (e) {} };
export function setAuto(on, why) {
  auto.on = on; clearTimeout(auto.timer);
  $('autoBtn').classList.toggle('on', on);
  $('autoBtn').querySelector('b').textContent = on ? '자동 뽑기 멈추기' : '자동 뽑기';
  if (why) toast(why);
  if (on && !pull && !upgrading && !startPull()) setAuto(false);
}
function autoNext(p) {
  if (auto.dism && spare(p.w)) { // 남는 것 바로 분해
    dismantle(p.w, spare(p.w)); $('btnDism').hidden = true;
    $('resDesc').querySelector('.own').textContent = `${state.inv[p.w.id]}개 보유 (분해함, 조각 ${state.shards}개)`;
  }
  if (auto.stop && p.rar.rank >= RAR[auto.stop].rank) return setAuto(false, `${p.rar.name}! 자동 뽑기를 멈췄어요`);
  if (!TEST_MODE && state.coins < 1) return setAuto(false, '코인이 다 떨어져서 자동 뽑기를 멈췄어요');
  auto.timer = setTimeout(() => { if (auto.on && pull?.phase === 'show') closeResult(true); }, 900);
}
$('autoBtn').onclick = () => setAuto(!auto.on);
// 좁은 화면에서는 자동 뽑기 설정이 접혀 있다
$('autoOpt').onclick = () => $('autoOpt').closest('.autobox').classList.toggle('open');
$('autoStop').value = auto.stop;
$('autoStop').onchange = e => { auto.stop = e.target.value; saveAuto(); };
$('autoDism').checked = auto.dism;
$('autoDism').onchange = e => { auto.dism = e.target.checked; saveAuto(); };

/* =========================================================
   기계 업그레이드 연출: 덜덜 떨림 → 번쩍 하면서 새 기계로 바뀜
   ========================================================= */
export function upgradeMachine(done) {
  if (pull || upgrading || state.level >= MAX_LEVEL) return;
  state.level++; save();
  $('pullBtn').disabled = true; $('pullbar').style.opacity = 0;
  upgrading = { t: 0, swapped: false, done };
  SFX.charge(1.3);
}
function updateUpgrade(dt) {
  if (!upgrading) return;
  const u = upgrading; u.t += dt;
  if (!u.swapped) {
    const k = Math.min(u.t / 1.3, 1);
    machine.position.x = (Math.random() - .5) * .08 * k;
    machine.position.z = (Math.random() - .5) * .05 * k;
    shake = Math.max(shake, .15 * k);
    if (u.t >= 1.3) {
      u.swapped = true; machine.position.set(0, 0, 0);
      applyMachineTheme(state.level); machineFx.bounce = 1;
      flashScreen(); shake = .7;
      const L = lvl(), rainbow = state.level >= MAX_LEVEL;
      burst(new V3(0, 3.6, 0), rainbow ? 'rainbow' : new THREE.Color(L.color).getHex(), 320, 6, .12);
      burst(new V3(0, 1.4, 1.2), rainbow ? 'rainbow' : 0xffffff, 160, 4);
      SFX.fanfare(4);
      const b = $('banner'); b.textContent = `${L.name}로 업그레이드!`; b.style.setProperty('--rc', L.color);
      b.className = 'banner'; void b.offsetWidth; b.className = 'banner show' + (rainbow ? ' ultra' : '');
      renderOdds(); updateHUD();
    }
  } else if (u.t >= 4) {
    $('banner').className = 'banner';
    upgrading = null; $('pullBtn').disabled = false; $('pullbar').style.opacity = 1;
    toast(`Lv.${state.level} ${lvl().name}: 이제부터 전용 칼 3종이 더 나와요!`);
    u.done?.();
  }
}
export function flashScreen() { const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

$('pullBtn').onclick = startPull;
$('btnOk').onclick = () => closeResult(false);
$('btnAgain').onclick = () => closeResult(true);

// 공개된 무기 드래그 회전
export let dragging = false, lastX = 0;
renderer.domElement.addEventListener('pointerdown', e => { if (pull?.phase === 'show') { dragging = true; lastX = e.clientX; } });
addEventListener('pointermove', e => { if (dragging && pull?.weapon) { pull.weapon.rotation.y += (e.clientX - lastX) * .012; lastX = e.clientX; } });
addEventListener('pointerup', () => dragging = false);

/* =========================================================
   메인 루프
   ========================================================= */
export const clock = new THREE.Clock();
export const camLook = LOOK_HOME.clone();
export function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  U.time.value = t;
  if (currentTab === 'gacha') {
    // 대기 애니메이션
    if (!pull || pull.phase !== 'crank') domeCaps.forEach(c => { c.position.y = c.userData.base.y + Math.sin(t * 1.3 + c.userData.ph) * .012; c.position.x = c.userData.base.x; c.position.z = c.userData.base.z; });
    bulbs.forEach((b, i) => { b.material.emissiveIntensity = ((Math.floor(t * (pull || upgrading ? 12 : machineFx.blink)) + i) % 2) ? 2.5 : .2; });
    topBulbM.emissive.setHSL((t * .15) % 1, 1, .5);
    btnM.emissiveIntensity = TEST_MODE || state.coins > 0 ? 1 + Math.sin(t * 5) * .8 : .1;
    updatePull(auto.on ? dt * 2.2 : dt, t);
    updateMachine(t, dt);
    updateUpgrade(dt);
    updateBursts(dt);
    // 카메라
    const focus = pull && ['rise', 'charge', 'show'].includes(pull.phase) ? 1 : 0;
    camF += (focus - camF) * Math.min(1, dt * 2.5);
    camera.position.lerpVectors(CAM_HOME, CAM_FOCUS, camF);
    camera.position.x += Math.sin(t * .3) * .35 * (1 - camF);
    camLook.lerpVectors(LOOK_HOME, LOOK_FOCUS, camF);
    if (shake > 0) { camera.position.x += (Math.random() - .5) * shake * .4; camera.position.y += (Math.random() - .5) * shake * .4; shake = Math.max(0, shake - dt); }
    camera.lookAt(camLook);
    renderer.render(scene, camera);
  }
  if (pv && pv.open) renderPreview(dt, t);
}
