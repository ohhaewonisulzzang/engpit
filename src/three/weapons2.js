import * as THREE from 'three';
import { V3, M, std, basic, addBasic, extr, poly, glow, sparkles, cosmicMat, voidMat } from './helpers.js';

/* =========================================================
   추가 레전더리·울트라 무기 30종
   - 모양 틀(검, 장창, 지팡이, 활 …)에 색과 장식만 바꿔 끼워서 만든다
   - 울트라는 우주 셰이더 재질과 무지개 고리가 붙는다
   ========================================================= */
// 'cosmic' | 'void' | 색 코드
const mat = (c, o = {}) => c === 'cosmic' ? cosmicMat() : c === 'void' ? voidMat() : std(c, o);
const metal = (c, e) => mat(c, { metalness: .9, roughness: .25, ...(e ? { emissive: e, emissiveIntensity: .45 } : {}) });
const shine = c => typeof c === 'number' ? basic(c) : mat(c);

// 공통 장식: 빛무리, 반짝이, (울트라) 무지개 고리
function aura(g, p, y = 1) {
  const glows = [];
  if (p.glow) { const s = glow(p.glow, p.glowSize || 2.2, .5); s.position.y = y; g.add(s); glows.push(s); }
  let sp = null, ring = null;
  if (p.spark) { sp = sparkles(p.ultra ? 130 : 50, .3, p.ultra ? 1.25 : .8, p.spark, .05); sp.position.y = y; g.add(sp); }
  if (p.ultra) { ring = M(new THREE.TorusGeometry(.66, .012, 8, 96), addBasic(0xffffff, .85), [0, y, 0]); g.add(ring); }
  const prev = g.userData.update;
  g.userData.update = t => {
    prev?.(t);
    if (sp) sp.rotation.y = t * .5;
    if (ring) { ring.rotation.set(Math.PI / 2 + Math.sin(t) * .5, t * .8, 0); ring.material.color.setHSL((t * .2) % 1, 1, .65); }
    glows.forEach(s => s.material.opacity = .4 + Math.sin(t * 3) * .12);
  };
  return g;
}

// 손잡이 + 가드
function hilt(g, p) {
  g.add(M(new THREE.BoxGeometry(p.guardW || .7, .09, .14), metal(p.guard), [0, 0, 0]));
  [-1, 1].forEach(s => g.add(M(new THREE.OctahedronGeometry(.07), shine(p.gem || p.guard), [s * (p.guardW || .7) / 2, 0, 0])));
  g.add(M(new THREE.CylinderGeometry(.05, .05, .5, 14), std(p.grip || 0x2a1a14, { roughness: .8 }), [0, -.3, 0]));
  g.add(M(new THREE.SphereGeometry(.085, 16, 12), metal(p.guard), [0, -.6, 0]));
  if (p.gem) g.add(M(new THREE.OctahedronGeometry(.08), shine(p.gem), [0, 0, .08]));
}

/* ---------- 모양 틀 ---------- */
function sword(p) {
  const g = new THREE.Group(), L = p.len || 1.8, w = p.w || .15;
  let shape;
  if (p.curve) { // 휘어진 칼날 (카타나)
    shape = new THREE.Shape(); shape.moveTo(-w * .6, 0); shape.quadraticCurveTo(-w * .3 + p.curve, L * .6, p.curve * 1.6, L);
    shape.quadraticCurveTo(w * .9 + p.curve, L * .55, w * .6, 0); shape.closePath();
  } else shape = poly(p.jag
    ? [[-w, 0], [-w * 1.3, L * .25], [-w * .8, L * .4], [-w * 1.35, L * .6], [-w * .7, L * .8], [0, L * 1.1], [w * .7, L * .8], [w * 1.35, L * .6], [w * .8, L * .4], [w * 1.3, L * .25], [w, 0]]
    : [[-w, 0], [-w * 1.1, L * .7], [0, L], [w * 1.1, L * .7], [w, 0]]);
  g.add(M(extr(shape, .045, .02), metal(p.blade, p.bladeE), [0, .06, 0]));
  if (p.edge) g.add(M(new THREE.BoxGeometry(.03, L * .8, .07), basic(p.edge), [p.curve ? p.curve * .5 : 0, L * .45, 0], [0, 0, p.curve ? -p.curve * .35 : 0]));
  hilt(g, p);
  return aura(g, p, L * .55);
}
function polearm(p) {
  const g = new THREE.Group(), top = 1.1;
  g.add(M(new THREE.CylinderGeometry(.045, .05, 2.5, 14), std(p.shaft, { roughness: .5, metalness: .4 }), [0, -.1, 0]));
  [-.7, -.2, .5].forEach(y => g.add(M(new THREE.TorusGeometry(.06, .012, 8, 20), metal(p.accent || p.head), [0, y, 0], [Math.PI / 2, 0, 0])));
  const hm = metal(p.head, p.headE);
  if (p.kind === 'trident') {
    g.add(M(new THREE.BoxGeometry(.55, .08, .08), hm, [0, top, 0]));
    [-.25, 0, .25].forEach(x => {
      g.add(M(new THREE.CylinderGeometry(.03, .035, .5, 10), hm, [x, top + .28, 0]));
      g.add(M(new THREE.ConeGeometry(.07, .22, 4), hm, [x, top + .62, 0], [0, Math.PI / 4, 0]));
    });
  } else if (p.kind === 'scythe' || p.kind === 'sickle') {
    const s = new THREE.Shape(), k = p.kind === 'sickle' ? .7 : 1;
    s.moveTo(.05, .14); s.quadraticCurveTo(-.7 * k, .55 * k, -1.35 * k, -.3 * k); s.quadraticCurveTo(-.7 * k, .05, .05, -.1); s.closePath();
    g.add(M(extr(s, .04, .02), hm, [0, top, 0]));
    if (p.kind === 'sickle') { const m = M(extr(s, .04, .02), hm, [0, top - .25, 0], [0, Math.PI, 0]); m.scale.setScalar(.7); g.add(m); }
    g.add(M(new THREE.BoxGeometry(.14, .3, .12), metal(p.accent || 0x222233), [0, top, 0]));
  } else { // 창 / 투창
    g.add(M(extr(poly([[-.12, 0], [-.16, .25], [0, .85], [.16, .25], [.12, 0]]), .05, .02), hm, [0, top - .05, 0]));
    if (p.wings) [-1, 1].forEach(s => g.add(M(new THREE.ConeGeometry(.05, .35, 4), hm, [s * .2, top + .05, 0], [0, 0, s * 1.1])));
  }
  if (p.orb) { g.add(M(new THREE.SphereGeometry(.08, 16, 12), basic(p.orb), [0, top, .09])); }
  return aura(g, p, top + .2);
}
function staff(p) {
  const g = new THREE.Group(), top = 1.3;
  g.add(M(new THREE.CylinderGeometry(.05, .065, 2.3, 14), std(p.shaft, { roughness: .6 }), [0, -.1, 0]));
  g.add(M(new THREE.CylinderGeometry(.1, .06, .2, 14), metal(p.accent), [0, 1.0, 0]));
  let spin = null;
  if (p.top === 'lantern') {
    g.add(M(new THREE.TorusGeometry(.08, .015, 8, 16), metal(p.accent), [0, 1.13, 0]));
    g.add(M(new THREE.CylinderGeometry(.18, .2, .36, 6, 1, true), std(p.accent, { metalness: .8, roughness: .3, side: THREE.DoubleSide, wireframe: true }), [0, top, 0]));
    g.add(M(new THREE.ConeGeometry(.22, .14, 6), metal(p.accent), [0, top + .25, 0]));
    g.add(M(new THREE.SphereGeometry(.11, 16, 12), basic(p.light), [0, top, 0]));
  } else if (p.top === 'crystal') {
    spin = M(new THREE.OctahedronGeometry(.24), shine(p.light), [0, top + .1, 0], [0, 0, 0], [.75, 1.4, .75]); g.add(spin);
    [0, 1, 2].forEach(i => { const a = i * 2.09; g.add(M(new THREE.ConeGeometry(.03, .3, 6), metal(p.accent), [Math.cos(a) * .16, 1.2, Math.sin(a) * .16], [Math.sin(a) * .4, 0, -Math.cos(a) * .4])); });
  } else if (p.top === 'star') {
    const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? .12 : .3, a = i / 10 * Math.PI * 2 + Math.PI / 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    spin = M(extr(poly(pts), .06, .02), shine(p.light), [0, top + .05, 0]); g.add(spin);
  } else if (p.top === 'tree') {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(M(new THREE.CylinderGeometry(.015, .03, .5, 6), std(p.shaft), [Math.cos(a) * .12, top, Math.sin(a) * .12], [Math.sin(a) * .5, 0, -Math.cos(a) * .5])); }
    spin = M(new THREE.IcosahedronGeometry(.2, 1), shine(p.light), [0, top + .22, 0]); g.add(spin);
  } else { // 구슬
    spin = M(new THREE.SphereGeometry(.2, 24, 16), shine(p.light), [0, top, 0]); g.add(spin);
    g.add(M(new THREE.TorusGeometry(.27, .015, 8, 40), metal(p.accent), [0, top, 0], [Math.PI / 2.3, 0, 0]));
  }
  const lg = glow(typeof p.light === 'number' ? p.light : 0xffffff, 1.1, .7); lg.position.y = top; g.add(lg);
  g.userData.update = t => { if (spin) spin.rotation.y = t * 1.5; lg.material.opacity = .55 + Math.sin(t * 5) * .2; };
  return aura(g, p, top);
}
function bow(p) {
  const g = new THREE.Group(), lm = metal(p.limb, p.limbE);
  const curve = new THREE.CatmullRomCurve3([new V3(.05, -1.1, 0), new V3(-.3, -.55, 0), new V3(-.12, 0, 0), new V3(-.3, .55, 0), new V3(.05, 1.1, 0)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .045, 8), lm));
  g.add(M(new THREE.CylinderGeometry(.06, .06, .3, 12), std(0x2a1a14), [-.12, 0, 0]));
  g.add(M(new THREE.CylinderGeometry(.006, .006, 2.2, 4), basic(p.string || 0xffffff), [.05, 0, 0]));
  [-1, 1].forEach(s => g.add(M(new THREE.ConeGeometry(.06, .25, 6), lm, [.05, s * 1.15, 0], [s < 0 ? Math.PI : 0, 0, 0])));
  g.add(M(new THREE.CylinderGeometry(.015, .015, 1.5, 6), basic(p.arrow), [.05, .1, 0], [0, 0, 0]));
  g.add(M(new THREE.ConeGeometry(.05, .16, 6), basic(p.arrow), [.05, .9, 0]));
  return aura(g, p, 0);
}
function hammer(p) {
  const g = new THREE.Group(), top = .95;
  g.add(M(new THREE.CylinderGeometry(.06, .07, 2.1, 14), std(p.handle || 0x2a2233, { metalness: .5, roughness: .4 }), [0, -.1, 0]));
  const hm = metal(p.head, p.headE);
  if (p.shape === 'axe') {
    const s = new THREE.Shape();
    s.moveTo(.08, .2); s.lineTo(.3, .16); s.quadraticCurveTo(.55, .45, .82, .62); s.quadraticCurveTo(.62, 0, .82, -.62); s.quadraticCurveTo(.55, -.45, .3, -.16); s.lineTo(.08, -.2); s.closePath();
    const bg = extr(s, .05, .02);
    g.add(M(bg, hm, [0, top, 0])); g.add(M(bg, hm, [0, top, 0], [0, Math.PI, 0]));
    g.add(M(new THREE.BoxGeometry(.22, .46, .2), metal(p.accent || 0x222233), [0, top, 0]));
  } else {
    g.add(M(new THREE.BoxGeometry(.95, .46, .46), hm, [0, top, 0]));
    [-1, 1].forEach(s => g.add(M(new THREE.BoxGeometry(.08, .54, .54), metal(p.accent || p.head), [s * .5, top, 0])));
  }
  if (p.core) g.add(M(new THREE.SphereGeometry(.12, 16, 12), basic(p.core), [0, top, .24]));
  return aura(g, p, top);
}
function disc(p) {
  const g = new THREE.Group(), n = p.points || 4;
  const pts = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? (p.inner || .32) : .85, a = i / (n * 2) * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const body = M(extr(poly(pts), .06, .02), metal(p.col, p.colE)); g.add(body);
  g.add(M(new THREE.TorusGeometry(.2, .05, 10, 32), metal(p.accent || p.col)));
  g.add(M(new THREE.SphereGeometry(.1, 16, 12), shine(p.core || 0xffffff)));
  g.userData.update = t => { body.rotation.z = t * 2; };
  return aura(g, p, 0);
}
function fan(p) {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = -1 + i / 8 * 2;
    g.add(M(new THREE.BoxGeometry(.04, 1.5, .02), metal(p.rib || 0x3a2a1a), [Math.sin(a) * .7, Math.cos(a) * .7 - .3, 0], [0, 0, -a]));
  }
  const s = new THREE.Shape(); s.absarc(0, 0, 1.4, Math.PI / 2 - 1.05, Math.PI / 2 + 1.05, false); s.lineTo(0, 0); s.closePath();
  g.add(M(new THREE.ShapeGeometry(s), std(p.cloth, { side: THREE.DoubleSide, emissive: p.cloth, emissiveIntensity: .2 }), [0, -.4, -.02]));
  g.add(M(new THREE.SphereGeometry(.08, 12, 10), basic(p.core || 0xffffff), [0, -.4, .03]));
  return aura(g, p, .3);
}
function orbs(p) {
  const g = new THREE.Group(), ring = new THREE.Group(); g.add(ring);
  g.add(M(new THREE.SphereGeometry(.26, 24, 16), shine(p.core)));
  for (let i = 0; i < (p.n || 4); i++) {
    const a = i / (p.n || 4) * Math.PI * 2;
    ring.add(M(p.feather ? new THREE.ConeGeometry(.08, .5, 6) : new THREE.IcosahedronGeometry(.13), metal(p.col, p.colE), [Math.cos(a) * .7, Math.sin(a) * .7, 0], [0, 0, a - Math.PI / 2]));
  }
  g.add(M(new THREE.TorusGeometry(.7, .012, 8, 64), addBasic(typeof p.core === 'number' ? p.core : 0xffffff, .6)));
  g.userData.update = t => { ring.rotation.z = t * 1.2; };
  return aura(g, p, 0);
}
function gauntlet(p) {
  const g = new THREE.Group(), m = metal(p.col, p.colE);
  g.add(M(new THREE.CylinderGeometry(.3, .26, .9, 12), m, [0, -.5, 0]));
  g.add(M(new THREE.BoxGeometry(.7, .55, .5), m, [0, .2, 0]));
  for (let i = 0; i < 4; i++) g.add(M(new THREE.BoxGeometry(.14, .3, .2), m, [-.25 + i * .165, .58, .1]));
  g.add(M(new THREE.SphereGeometry(.13, 16, 12), shine(p.gem), [0, .2, .26]));
  [-.7, -.35].forEach(y => g.add(M(new THREE.TorusGeometry(.29, .03, 8, 24), metal(p.accent), [0, y, 0], [Math.PI / 2, 0, 0])));
  return aura(g, p, .1);
}
function shield(p) {
  const g = new THREE.Group();
  g.add(M(new THREE.CylinderGeometry(.85, .85, .12, 6), metal(p.col, p.colE), [0, 0, 0], [Math.PI / 2, 0, 0]));
  g.add(M(new THREE.CylinderGeometry(.5, .5, .16, 6), metal(p.accent), [0, 0, 0], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(M(new THREE.ConeGeometry(.08, .35, 6), metal(p.accent), [Math.cos(a) * .78, Math.sin(a) * .78, .1], [Math.PI / 2, 0, 0])); }
  g.add(M(new THREE.ConeGeometry(.12, .4, 8), metal(p.accent), [0, 0, .2], [Math.PI / 2, 0, 0]));
  return aura(g, p, 0);
}
function gun(p) {
  const g = new THREE.Group(), m = metal(p.col, p.colE);
  g.add(M(new THREE.BoxGeometry(.4, 1.1, .3), m, [0, .2, 0]));
  g.add(M(new THREE.BoxGeometry(.25, .55, .22), std(0x1a1a24), [0, -.55, 0], [.3, 0, 0]));
  for (let i = 0; i < (p.barrels || 3); i++) { const a = i / (p.barrels || 3) * Math.PI * 2; g.add(M(new THREE.CylinderGeometry(.05, .05, .9, 10), metal(p.accent), [Math.cos(a) * .1, 1.1, Math.sin(a) * .1])); }
  const prism = M(new THREE.OctahedronGeometry(.18), shine(p.core), [0, .25, .2]); g.add(prism);
  g.userData.update = t => { prism.rotation.y = t * 2; };
  return aura(g, p, .6);
}
function whip(p) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push(new V3(Math.sin(u * 9) * .25 * u, -.4 + u * 2.2, Math.cos(u * 7) * .1 * u)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .035, 6), metal(p.col, p.colE)));
  g.add(M(new THREE.ConeGeometry(.07, .22, 6), metal(p.accent), [Math.sin(9) * .25, 1.85, Math.cos(7) * .1]));
  g.add(M(new THREE.CylinderGeometry(.06, .06, .55, 12), std(0x2a1a14), [0, -.7, 0]));
  g.add(M(new THREE.SphereGeometry(.09, 12, 10), basic(p.gem), [0, -1, 0]));
  return aura(g, p, .7);
}

// 기계 전용 칼: 기계 레벨이 m 이상이면 뽑힌다. 기계를 업그레이드할 때마다 3종씩 늘어난다
export const MACHINE_SWORDS = [
  // 블루 머신
  { m: 2, r: 'hero', id: 'bluewave', name: '푸른 물결검', desc: '칼날 위로 작은 물결이 끝없이 흐른다.',
    build: () => sword({ blade: 0xbfe8ff, bladeE: 0x1a6ad0, edge: 0x5cc8ff, guard: 0x2a5aa0, gem: 0x5cc8ff, glow: 0x5cc8ff }) },
  { m: 2, r: 'legend', id: 'seadragon', name: '심해의 청룡검', desc: '깊은 바다에 잠들어 있던 청룡이 칼에 깃들었다.',
    build: () => sword({ jag: true, blade: 0x7ad8ff, bladeE: 0x0a4ab0, edge: 0xe8fbff, guard: 0x123a7a, gem: 0x8af3ff, w: .18, glow: 0x3ab8ff, spark: 0xaef0ff }) },
  { m: 2, r: 'ultra', id: 'aquacalibur', name: '아쿠아 엑스칼리버', desc: '호수의 요정이 바다의 왕에게 건넨 성검.',
    build: () => sword(U({ blade: 'cosmic', edge: 0x8adfff, guard: 0x5cc8ff, gem: 0xffffff, len: 2.1, glow: 0x5cc8ff, glowSize: 3 })) },
  // 로열 머신
  { m: 3, r: 'hero', id: 'royalguard', name: '왕실 근위검', desc: '왕궁을 지키는 근위대만 차는 검.',
    build: () => sword({ blade: 0xf0eaff, bladeE: 0x6a3ab0, edge: 0xd0b8ff, guard: 0xffc030, gem: 0xc77dff, w: .12, len: 1.9, glow: 0xc77dff }) },
  { m: 3, r: 'legend', id: 'crownrapier', name: '왕관의 레이피어', desc: '왕관의 보석을 녹여 만든 가느다란 찌르기 검.',
    build: () => sword({ blade: 0xfff4ff, bladeE: 0xb45cff, edge: 0xffffff, guard: 0xffd060, gem: 0xff5ab0, w: .07, len: 2.2, guardW: .5, glow: 0xc77dff, spark: 0xffe0ff }) },
  { m: 3, r: 'ultra', id: 'emperorblade', name: '황제의 성검', desc: '대륙을 하나로 만든 황제가 들었던 검.',
    build: () => sword(U({ blade: 'void', edge: 0xffd060, guard: 0xffc030, gem: 0xc77dff, w: .2, len: 2.2, guardW: .9, glow: 0xc77dff, glowSize: 3.2 })) },
  // 골드 머신
  { m: 4, r: 'hero', id: 'goldscimitar', name: '황금 시미터', desc: '사막의 상인들이 목숨처럼 아끼는 굽은 칼.',
    build: () => sword({ curve: .2, w: .13, blade: 0xffe8a0, bladeE: 0xb07a00, edge: 0xfff4c0, guard: 0xffb020, grip: 0x6a2a10, guardW: .45, glow: 0xffc83d }) },
  { m: 4, r: 'legend', id: 'midas', name: '미다스의 검', desc: '베는 것마다 황금으로 바뀐다는 소문이 있다.',
    build: () => sword({ blade: 0xffd860, bladeE: 0xff9a00, edge: 0xfff6d0, guard: 0xffd860, gem: 0xffffff, w: .17, glow: 0xffc030, spark: 0xfff0a0 }) },
  { m: 4, r: 'ultra', id: 'eldorado', name: '엘도라도', desc: '황금 도시의 문을 여는 열쇠이자 검. 스스로 날아다닌다.',
    build: () => sword(U({ jag: true, blade: 'cosmic', edge: 0xffd860, guard: 0xffb020, gem: 0xffffff, w: .19, glow: 0xffc83d, glowSize: 3.2 })) },
  // 코스믹 머신
  { m: 5, r: 'hero', id: 'meteorsword', name: '운석검', desc: '하늘에서 떨어진 운석을 두드려 만들었다. 아직 뜨겁다.',
    build: () => sword({ jag: true, blade: 0x5a4a4a, bladeE: 0xff4a10, edge: 0xff8a3d, guard: 0x2a2a2a, gem: 0xff6a20, w: .17, glow: 0xff6a20 }) },
  { m: 5, r: 'legend', id: 'aurorablade', name: '오로라 블레이드', desc: '북쪽 하늘의 오로라를 칼날에 가뒀다.',
    build: () => sword({ blade: 0xd0fff0, bladeE: 0x3affb0, edge: 0xb45cff, guard: 0x1a3a5a, gem: 0x5affc0, len: 2, glow: 0x5affc0, spark: 0xd0b8ff }) },
  { m: 5, r: 'ultra', id: 'infinity', name: '무한검 인피니티', desc: '끝이 없는 칼날. 네 자루가 주인을 지키며 돈다.',
    build: () => sword(U({ blade: 'cosmic', edge: 0xffffff, guard: 'void', gem: 0xff3d8b, len: 2.3, w: .18, glow: 0xff7ad9, glowSize: 3.4 })) },
];

const L = { r: 'legend' }, X = { r: 'ultra' };
const U = o => ({ ultra: true, spark: 0xffffff, ...o });
export const NEW_WEAPONS = [
  // ---- 레전더리 15종 ----
  { ...L, id: 'tidetrident', name: '해일의 삼지창', desc: '바다의 신이 잃어버린 삼지창. 찌를 때마다 파도 소리가 난다.',
    build: () => polearm({ kind: 'trident', shaft: 0x1d5a7a, head: 0x7ad8ff, headE: 0x2a8ad0, accent: 0xffd060, glow: 0x3ab8ff, spark: 0xaef0ff }) },
  { ...L, id: 'phoenixbow', name: '불사조의 활', desc: '시위를 당기면 깃털에 불이 붙는다.',
    build: () => bow({ limb: 0xff6a20, limbE: 0xff3a00, arrow: 0xffd060, string: 0xffe0a0, glow: 0xff7a20, spark: 0xffc060 }) },
  { ...L, id: 'stormblade', name: '폭풍검 템페스트', desc: '칼을 휘두르면 작은 회오리가 따라온다.',
    build: () => sword({ blade: 0xcfe8ff, bladeE: 0x3a8aff, edge: 0x8adfff, guard: 0x4a6aa0, gem: 0x8adfff, glow: 0x6ab8ff, spark: 0xcff4ff }) },
  { ...L, id: 'moonsickle', name: '월광의 쌍낫', desc: '보름달이 뜨는 밤에만 벼린 쌍낫.',
    build: () => polearm({ kind: 'sickle', shaft: 0x2a2a44, head: 0xe8e8ff, headE: 0x8a8aff, accent: 0xc0c0ff, glow: 0xb0b0ff, spark: 0xffffff }) },
  { ...L, id: 'glacierhammer', name: '빙하 망치', desc: '내려찍은 자리에 서리가 핀다.',
    build: () => hammer({ head: 0xbfefff, headE: 0x4ab0e0, accent: 0x7ad0ff, core: 0xe8fbff, glow: 0x8adfff, spark: 0xe8fbff }) },
  { ...L, id: 'serpentwhip', name: '독사 채찍', desc: '끝에 달린 송곳니에서 독이 떨어진다.',
    build: () => whip({ col: 0x3aa03a, colE: 0x0a5a0a, accent: 0xd0ff60, gem: 0x9aff3a, glow: 0x6ad03a, spark: 0xc0ff80 }) },
  { ...L, id: 'starshuriken', name: '별빛 수리검', desc: '던지면 별똥별처럼 꼬리가 생긴다.',
    build: () => disc({ col: 0xfff0a0, colE: 0xffb020, points: 4, inner: .22, accent: 0xffd060, core: 0xffffff, glow: 0xffd060, spark: 0xfff0b0 }) },
  { ...L, id: 'runeorb', name: '고대 룬 구슬', desc: '네 개의 룬이 주인을 지키며 맴돈다.',
    build: () => orbs({ core: 0x9a6bff, col: 0x5a3ab0, colE: 0x7a4aff, n: 4, glow: 0x9a6bff, spark: 0xd0b8ff }) },
  { ...L, id: 'thornshield', name: '가시 방패', desc: '막는 것도 공격이다. 방패로 후려친다.',
    build: () => shield({ col: 0x5a3a20, colE: 0x2a1000, accent: 0xffc030, glow: 0xffb020, spark: 0xffe0a0 }) },
  { ...L, id: 'meteorstaff', name: '유성 지팡이', desc: '하늘에서 작은 유성을 불러 떨어뜨린다.',
    build: () => staff({ top: 'star', shaft: 0x3a2416, accent: 0xffb020, light: 0xff8a3d, glow: 0xff6a20, spark: 0xffc070 }) },
  { ...L, id: 'windfan', name: '바람 부채', desc: '한 번 부치면 사방으로 칼바람이 분다.',
    build: () => fan({ cloth: 0x4fd18b, rib: 0x2a4a3a, core: 0xe8fff0, glow: 0x4fd18b, spark: 0xd0ffe8 }) },
  { ...L, id: 'crimsonkatana', name: '진홍 카타나', desc: '베인 적보다 칼이 먼저 붉어진다.',
    build: () => sword({ curve: .14, w: .1, len: 2, blade: 0xffd0d0, bladeE: 0xc01030, edge: 0xff5a72, guard: 0x2a1a1a, grip: 0x8a1020, guardW: .32, glow: 0xff3a5a, spark: 0xffa0b0 }) },
  { ...L, id: 'earthgauntlet', name: '대지의 건틀릿', desc: '주먹을 쥐면 땅이 울린다.',
    build: () => gauntlet({ col: 0x8a6a3a, colE: 0x3a2000, accent: 0xffc030, gem: 0x6aff8a, glow: 0xffb040, spark: 0xffe0a0 }) },
  { ...L, id: 'spiritlantern', name: '혼령의 등불', desc: '길 잃은 혼령들이 등불 안에서 춤춘다.',
    build: () => staff({ top: 'lantern', shaft: 0x1a2a2a, accent: 0x7ad8c0, light: 0x9affe0, glow: 0x5affc0, spark: 0xc0ffe8 }) },
  { ...L, id: 'sunspear', name: '태양의 투창', desc: '던지면 한낮처럼 눈부신 빛줄기가 된다.',
    build: () => polearm({ kind: 'spear', wings: true, shaft: 0xf3e0b0, head: 0xffe08a, headE: 0xff9a00, accent: 0xffb020, orb: 0xffffff, glow: 0xffb020, spark: 0xfff0b0 }) },
  // ---- 울트라 15종 ----
  { ...X, id: 'galaxybow', name: '갤럭시 보우', desc: '화살 하나하나가 작은 은하다.',
    build: () => bow(U({ limb: 'cosmic', arrow: 0xffffff, string: 0xd0b8ff, glow: 0x9a6bff, glowSize: 3 })) },
  { ...X, id: 'chronoblade', name: '시간검 크로노스', desc: '베인 적은 1초 전의 자신을 그리워한다.',
    build: () => sword(U({ blade: 'cosmic', edge: 0xffffff, guard: 0xffd060, gem: 0x8af3ff, len: 2.1, w: .17, glow: 0x8af3ff, glowSize: 3 })) },
  { ...X, id: 'nebulastaff', name: '성운의 지팡이', desc: '끝에 걸린 성운에서 별이 태어난다.',
    build: () => staff(U({ top: 'orb', shaft: 0x1b1830, accent: 0xb48aff, light: 'cosmic', glow: 0xb45cff, glowSize: 3 })) },
  { ...X, id: 'supernova', name: '초신성 코어', desc: '터지기 직전의 별을 손에 쥐었다.',
    build: () => orbs(U({ core: 'cosmic', col: 0xffb020, colE: 0xff4a00, n: 8, glow: 0xff9a40, glowSize: 3.4 })) },
  { ...X, id: 'abysstrident', name: '심연의 삼지창', desc: '바다 가장 깊은 곳의 어둠을 끌어올린다.',
    build: () => polearm(U({ kind: 'trident', shaft: 0x10101c, head: 'void', accent: 0xff3d8b, glow: 0xb03dff, glowSize: 3 })) },
  { ...X, id: 'zeusspear', name: '천벌의 창 아스트라', desc: '하늘이 화났을 때 쓰는 창.',
    build: () => polearm(U({ kind: 'spear', wings: true, shaft: 0xe8f4ff, head: 'cosmic', accent: 0x8adfff, orb: 0xcff4ff, glow: 0x8adfff, glowSize: 3 })) },
  { ...X, id: 'dragonfang', name: '용아검 드라군', desc: '고룡의 송곳니를 통째로 갈아 만들었다.',
    build: () => sword(U({ jag: true, blade: 'void', edge: 0xff6a3d, guard: 0x5a1010, gem: 0xff3a1a, w: .2, glow: 0xff4a20, glowSize: 3 })) },
  { ...X, id: 'angelwing', name: '대천사의 깃털', desc: '깃털 다섯 장이 주인을 감싸고 돈다.',
    build: () => orbs(U({ feather: true, core: 0xffffff, col: 0xfff6e0, colE: 0xffd060, n: 5, glow: 0xfff0b0, glowSize: 3 })) },
  { ...X, id: 'demonaxe', name: '마왕의 도끼', desc: '던지면 비명을 지르며 날아갔다가 돌아온다.',
    build: () => hammer(U({ shape: 'axe', head: 'void', accent: 0x2a0a14, handle: 0x1a0a10, core: 0xff3d8b, glow: 0xff3d8b, glowSize: 3 })) },
  { ...X, id: 'prismcannon', name: '프리즘 캐논', desc: '빛을 일곱 갈래로 쪼개서 쏜다.',
    build: () => gun(U({ col: 0xe8e8f8, colE: 0x6a6aff, accent: 0x8af3ff, core: 'cosmic', barrels: 3, glow: 0xffffff, glowSize: 2.6 })) },
  { ...X, id: 'worldtree', name: '세계수의 지팡이', desc: '세계수의 가지 끝에서 생명이 흐른다.',
    build: () => staff(U({ top: 'tree', shaft: 0x5a3a20, accent: 0x4fd18b, light: 0x9affb0, glow: 0x4fd18b, glowSize: 3 })) },
  { ...X, id: 'eclipse', name: '일식 원반', desc: '태양과 달이 겹치는 순간을 잘라 냈다.',
    build: () => disc(U({ col: 'void', points: 8, inner: .55, accent: 0xffd060, core: 0x000000, glow: 0xffb020, glowSize: 3 })) },
  { ...X, id: 'quasarhammer', name: '퀘이사 망치', desc: '휘두를 때마다 우주 끝까지 빛이 뻗는다.',
    build: () => hammer(U({ head: 'cosmic', accent: 0xffffff, core: 0xffffff, glow: 0x8af3ff, glowSize: 3.2 })) },
  { ...X, id: 'phantomdagger', name: '환영 단검', desc: '하나를 던지면 넷이 날아간다. 진짜는 어느 것?',
    build: () => sword(U({ blade: 'void', edge: 0xd0b8ff, guard: 0x2a1a44, gem: 0xb45cff, len: 1.1, w: .14, glow: 0xb45cff })) },
  { ...X, id: 'genesis', name: '창세의 홀 제네시스', desc: '세상이 처음 생길 때 쓰였다는 홀.',
    build: () => staff(U({ top: 'crystal', shaft: 0xfff6e0, accent: 0xffd060, light: 'cosmic', glow: 0xffffff, glowSize: 3.4 })) },
];
