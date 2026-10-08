import * as THREE from 'three';
import { V3, std, basic, addBasic, M, roundedBox, glow, sparkles, disposeObj, cosmicMat } from './helpers.js';
import { scene, floorRing, makeCapsule, textTex } from './scene.js';
import { makeRays } from './effects.js';
import { LEVELS } from '../config.js';

// ---- 머신 ----
export const machine = new THREE.Group(); scene.add(machine);
export const redM = new THREE.MeshPhysicalMaterial({ color: 0xe8364f, roughness: .35, clearcoat: 1, clearcoatRoughness: .15 });
export const whiteM = std(0xf5f2ff, { roughness: .4 });
export const chrome = std(0xdde3ee, { metalness: 1, roughness: .18 });
export const darkM = std(0x0b0a14, { roughness: .9 });
export const goldM = std(0xffc54a, { metalness: 1, roughness: .3 });
[[-1.05, -.95], [1.05, -.95], [-1.05, .95], [1.05, .95]].forEach(([x, z]) => machine.add(M(new THREE.CylinderGeometry(.14, .17, .15, 16), darkM, [x, .075, z])));
export const body = M(roundedBox(2.6, 2.4, 2.4, .28), redM, [0, 1.35, 0]); body.receiveShadow = true; machine.add(body);
machine.add(M(roundedBox(2.66, .16, 2.46, .2), whiteM, [0, .5, 0]));
export const plate = M(new THREE.CylinderGeometry(1.25, 1.35, .22, 48), chrome, [0, 2.66, 0]); machine.add(plate);
export const dome = new THREE.Mesh(new THREE.SphereGeometry(1.22, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .16, roughness: .03, clearcoat: 1, depthWrite: false }));
dome.position.y = 3.72; machine.add(dome);
export const domeHi = glow(0xffffff, .9, .35); domeHi.position.set(-.55, 4.25, 1.0); machine.add(domeHi);
export const capTop = M(new THREE.CylinderGeometry(.3, .38, .2, 32), redM, [0, 4.95, 0]); machine.add(capTop);
machine.add(M(new THREE.SphereGeometry(.16, 24, 16), goldM, [0, 5.12, 0]));
export const topBulbM = std(0xffffff, { emissive: 0xff3d8b, emissiveIntensity: 2 });
machine.add(M(new THREE.SphereGeometry(.1, 16, 12), topBulbM, [0, 5.3, 0]));

// 돔 안의 캡슐들
export const PAL = [0x9aa38f, 0x4aa3ff, 0xb45cff, 0xffb020, 0xff3d8b, 0x3ddc84, 0xffe14a, 0x5ce1ff];
export const domeCaps = [];
for (let i = 0, tries = 0; i < 30 && tries < 2000; tries++) {
  const p = new V3((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2);
  if (p.length() > .95 || p.y > .35) continue;
  if (domeCaps.some(c => c.userData.base.distanceTo(p.clone().add(new V3(0, 3.72, 0))) < .36)) continue;
  const c = makeCapsule(PAL[i % PAL.length], .2 + Math.random() * .04);
  c.position.copy(p).add(new V3(0, 3.72, 0)); c.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  c.userData.base = c.position.clone(); c.userData.ph = Math.random() * 6;
  machine.add(c); domeCaps.push(c); i++;
}

// 앞면: 간판, 전구, 손잡이, 코인 투입구, 배출구
export const signTex = textTex((x, w, h) => {
  // 간판: 로고 워드마크 (i의 점 = 캡슐)
  x.fillStyle = '#ffc83d'; x.fillRect(0, 0, w, h);
  x.font = '600 92px Fredoka, sans-serif'; x.textBaseline = 'alphabetic';
  const parts = ['engp', 'i', 't'], ws = parts.map(p => x.measureText(p).width);
  const x0 = (w - ws.reduce((a, b) => a + b)) / 2, by = h * .74, ix = x0 + ws[0];
  let px = x0;
  x.fillStyle = '#e8364f'; parts.forEach((p, i) => { x.fillText(p, px, by); px += ws[i]; });
  x.fillStyle = '#ffc83d'; x.fillRect(ix, by - 96, ws[1], 44); // 원래 i의 점 지우기
  const cx = ix + ws[1] / 2, cy = by - 64, r = 13;
  x.save(); x.translate(cx, cy); x.rotate(-.42);
  x.fillStyle = '#e8364f'; x.beginPath(); x.arc(0, 0, r, Math.PI, 0); x.fill();
  x.fillStyle = '#f3efe6'; x.beginPath(); x.arc(0, 0, r, 0, Math.PI); x.fill();
  x.fillStyle = '#b8203a'; x.fillRect(-r, -1.5, r * 2, 3); x.restore();
});
machine.add(M(new THREE.PlaneGeometry(2.0, .5), new THREE.MeshStandardMaterial({ map: signTex, roughness: .4, emissive: 0x332200, emissiveMap: signTex, emissiveIntensity: .35 }), [0, 2.08, 1.235]));
export const bulbs = [];
for (let i = 0; i < 11; i++) {
  const m = std(0xffffff, { emissive: i % 2 ? 0xffd040 : 0xff3d8b, emissiveIntensity: 2 });
  const b = M(new THREE.SphereGeometry(.045, 12, 8), m, [-1.0 + i * .2, 2.43, 1.23]); machine.add(b); bulbs.push(b);
}
export const crank = new THREE.Group(); crank.position.set(0, 1.35, 1.23); machine.add(crank);
crank.add(M(new THREE.CylinderGeometry(.45, .45, .08, 40), std(0xd8dce8, { metalness: .5, roughness: .25 }), [0, 0, .04], [Math.PI / 2, 0, 0]));
crank.add(M(new THREE.TorusGeometry(.45, .03, 8, 40), goldM, [0, 0, .08]));
crank.add(M(roundedBox(.82, .17, .14, .07), whiteM, [0, 0, .15]));
crank.add(M(new THREE.CylinderGeometry(.11, .11, .1, 24), goldM, [0, 0, .25], [Math.PI / 2, 0, 0]));
export const coinPlate = M(roundedBox(.34, .55, .08, .06), chrome, [-.92, 1.35, 1.24]); machine.add(coinPlate);
machine.add(M(new THREE.BoxGeometry(.05, .3, .06), darkM, [-.92, 1.38, 1.29]));
machine.add(M(new THREE.PlaneGeometry(.5, .2), basic(0xffffff, { map: textTex((x, w, h) => { x.fillStyle = '#1a1733'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffcc33'; x.font = 'bold 70px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('1 COIN', w / 2, h / 2 + 4); }, 256, 100) }), [-.92, .95, 1.23]));
machine.add(M(new THREE.CylinderGeometry(.13, .13, .06, 24), chrome, [.92, 1.35, 1.24], [Math.PI / 2, 0, 0]));
export const btnM = std(0x3ddc84, { emissive: 0x1a8a4a, emissiveIntensity: 1 });
machine.add(M(new THREE.CylinderGeometry(.09, .09, .08, 24), btnM, [.92, 1.35, 1.28], [Math.PI / 2, 0, 0]));
machine.add(M(roundedBox(1.0, .7, .12, .12), chrome, [0, .6, 1.26]));
machine.add(M(new THREE.PlaneGeometry(.78, .5), basic(0x050308), [0, .6, 1.325]));
export const flap = new THREE.Group(); flap.position.set(0, .85, 1.335); machine.add(flap);
flap.add(M(new THREE.PlaneGeometry(.78, .5), new THREE.MeshPhysicalMaterial({ color: 0xff9a3d, transparent: true, opacity: .55, roughness: .1, side: THREE.DoubleSide }), [0, -.25, 0]));

/* =========================================================
   기계 레벨별 외형. 레벨이 오를수록 장식이 하나씩 더해진다
   ========================================================= */
const THEMES = [
  { body: 0xe8364f },               // 1 기본: 빨강 + 크롬
  { body: 0x2f6fe0 },               // 2 블루: 금색 테두리, LED 바, 돔 둘레 전구
  { body: 0x7b3fe0 },               // 3 로열: + 왕관, 서치라이트
  { body: 0xffc23a, metal: .55 },   // 4 골드: + 공전하는 캡슐, 반짝이
  { cosmic: true },                 // 5 코스믹: + 무지개 몸체, 후광, 빛줄기
];
const cosmicBody = cosmicMat();
export const machineFx = { bounce: 0, blink: 3 };
let extras = null;

export function applyMachineTheme(level) {
  const th = THEMES[level - 1], col = new THREE.Color(LEVELS[level - 1].color);
  if (th.cosmic) body.material = capTop.material = cosmicBody;
  else {
    body.material = capTop.material = redM;
    redM.color.setHex(th.body); redM.metalness = th.metal || 0; redM.roughness = th.metal ? .25 : .35;
  }
  chrome.color.setHex(level >= 2 ? 0xffc54a : 0xdde3ee);
  floorRing.material.color.copy(col); floorRing.material.opacity = .25 + level * .1;
  machineFx.blink = 2 + level * 1.5;
  if (extras) { machine.remove(extras); disposeObj(extras); }
  extras = buildExtras(level, col); machine.add(extras);
}

function buildExtras(level, col) {
  const g = new THREE.Group(), ups = [];
  const rainbow = level >= 5;
  const tint = (m, h, l) => rainbow ? m.color.setHSL(h % 1, .9, l) : m.color.copy(col).offsetHSL(0, 0, l - .55);

  if (level >= 2) { // 앞면 LED 바 + 돔 둘레 전구
    const leds = [-1.12, 1.12].map(x => { const m = M(new THREE.BoxGeometry(.06, 1.7, .03), basic(0xffffff), [x, 1.4, 1.235]); g.add(m); return m; });
    const ring = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, b = M(new THREE.SphereGeometry(.05, 10, 8), basic(0xffffff), [Math.cos(a) * 1.33, 2.66, Math.sin(a) * 1.33]);
      g.add(b); ring.push(b);
    }
    ups.push(t => {
      leds.forEach((m, i) => tint(m.material, t * .3 + i * .5, .5 + Math.sin(t * 4 + i * 3) * .15));
      ring.forEach((b, i) => tint(b.material, i / 24 + t * .4, (Math.floor(t * 10) + i) % 4 ? .35 : .85));
    });
  }
  if (level >= 3) { // 꼭대기 왕관 + 서치라이트
    const crown = new THREE.Group(); crown.position.y = 5.42; g.add(crown);
    const gold = std(0xffc54a, { metalness: 1, roughness: .25 });
    crown.add(M(new THREE.TorusGeometry(.3, .045, 10, 40), gold, [0, 0, 0], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; crown.add(M(new THREE.ConeGeometry(.06, .22, 10), gold, [Math.cos(a) * .3, .13, Math.sin(a) * .3])); }
    const gem = M(new THREE.OctahedronGeometry(.13), basic(col.getHex()), [0, .32, 0]); crown.add(gem);
    const gemGlow = glow(col.getHex(), 1.2, .8); gemGlow.position.y = .32; crown.add(gemGlow);
    const beams = [-1, 1].map(s => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 32, 1, true), addBasic(col.getHex(), .07));
      m.material.side = THREE.DoubleSide; m.position.set(s * 2.6, 4.2, -1); g.add(m); return m;
    });
    ups.push(t => {
      crown.rotation.y = t * .8; gem.rotation.y = -t * 2;
      gemGlow.material.opacity = .6 + Math.sin(t * 4) * .3;
      if (rainbow) { gem.material.color.setHSL(t * .2 % 1, 1, .6); gemGlow.material.color.copy(gem.material.color); }
      beams.forEach((m, i) => { const s = i ? 1 : -1; m.rotation.z = s * (.35 + Math.sin(t * .7 + i * 2) * .18); if (rainbow) m.material.color.setHSL((t * .1 + i * .5) % 1, 1, .6); });
    });
  }
  if (level >= 4) { // 돔 주위를 도는 캡슐 + 반짝이
    const orbit = new THREE.Group(); orbit.position.y = 3.7; g.add(orbit);
    const COLS = [0xff3d8b, 0xffb020, 0xb45cff, 0x4aa3ff, 0x4fd18b, 0xffe14a, 0x5ce1ff, 0xff7a3d];
    COLS.forEach((c, i) => {
      const cap = makeCapsule(c, .17), a = i / COLS.length * Math.PI * 2;
      cap.position.set(Math.cos(a) * 1.8, Math.sin(i * 1.7) * .35, Math.sin(a) * 1.8); cap.userData.ph = i;
      orbit.add(cap);
    });
    const sp = sparkles(160, 1.6, 3.4, 0xffe08a, .07); sp.position.y = 3; g.add(sp);
    ups.push(t => {
      orbit.rotation.y = t * .5;
      orbit.children.forEach(c => { c.rotation.x = t * 2 + c.userData.ph; c.rotation.z = t * 1.3; });
      sp.rotation.y = -t * .15;
      if (rainbow) sp.material.color.setHSL(t * .1 % 1, .8, .75);
    });
  }
  if (level >= 5) { // 무지개 빛줄기 + 돔 후광
    const rays = makeRays(0xffffff, true); rays.position.set(0, 3.4, -2.6); rays.scale.setScalar(1.6); g.add(rays);
    const halos = [1.6, 1.85].map((r, i) => { const m = M(new THREE.TorusGeometry(r, .02, 8, 120), addBasic(0xffffff, .8), [0, 3.72, 0]); g.add(m); return m; });
    ups.push(t => {
      rays.rotation.z = t * .15;
      halos.forEach((m, i) => { m.rotation.set(Math.PI / 2 + Math.sin(t * .8 + i) * .5, t * (i ? -.6 : .6), 0); m.material.color.setHSL((t * .25 + i * .5) % 1, 1, .65); });
    });
  }
  g.userData.update = t => ups.forEach(f => f(t));
  return g;
}

export function updateMachine(t, dt) {
  extras?.userData.update(t);
  if (machineFx.bounce > 0) {
    machineFx.bounce = Math.max(0, machineFx.bounce - dt * .9);
    const b = machineFx.bounce;
    machine.scale.set(1 + Math.sin(b * Math.PI * 4) * .07 * b, 1 - Math.sin(b * Math.PI * 4) * .05 * b, 1 + Math.sin(b * Math.PI * 4) * .07 * b);
  } else machine.scale.setScalar(1);
}
