import * as THREE from 'three';
import { NEW_WEAPONS, MACHINE_SWORDS } from './weapons2.js';
import { V3, srand, rnd, lumpy, uglyMat, std, basic, addBasic, M, stick, extr, poly, roundedBox, glow, sparkles, cosmicMat, voidMat } from './helpers.js';

/* =========================================================
   무기 모델 (모두 three.js 기본 도형으로 직접 제작)
   ========================================================= */
// ---- 희귀 : 못생김 ----
export function bStick() {
  srand(11); const g = new THREE.Group();
  const w = uglyMat(0x6b5a3a), w2 = uglyMat(0x564527), moss = uglyMat(0x6e7a34);
  g.add(stick([0, -1.1, 0], [.09, -.2, .02], .12, .09, w, 6, .07));
  g.add(stick([.09, -.2, .02], [-.07, .5, -.03], .09, .07, w2, 6, .06));
  g.add(stick([-.07, .5, -.03], [.06, 1.05, 0], .07, .03, w, 5, .05));
  g.add(stick([0, .2, 0], [.36, .55, .05], .04, .02, w2, 4, .03));
  g.add(stick([-.02, -.5, 0], [-.3, -.33, .04], .035, .015, w, 4, .03));
  g.add(M(lumpy(new THREE.SphereGeometry(.13, 5, 4), .09), moss, [.05, -.45, .07]));
  g.add(M(lumpy(new THREE.SphereGeometry(.09, 5, 4), .06), moss, [-.05, .3, -.06]));
  g.add(M(lumpy(new THREE.SphereGeometry(.12, 4, 3), .05), uglyMat(0x9a9a30), [.43, .62, .05], [0, 0, .6], [1, .25, .6]));
  g.add(M(lumpy(new THREE.CylinderGeometry(.02, .025, .1, 4), .01), uglyMat(0xcfc8a8), [.14, -.62, .06], [0, 0, -1.1]));
  g.add(M(lumpy(new THREE.SphereGeometry(.06, 5, 3, 0, Math.PI * 2, 0, Math.PI / 2), .03), uglyMat(0x8a5a5a), [.2, -.6, .06], [0, 0, -1.1]));
  return g;
}
export function bLadle() {
  srand(22); const g = new THREE.Group();
  const grey = uglyMat(0x8c8c84), stain = uglyMat(0x7a6438);
  g.add(stick([0, -.55, 0], [.07, 1.0, 0], .04, .035, grey, 5, .04));
  g.add(stick([.07, 1.0, 0], [-.06, 1.18, 0], .035, .03, grey, 5, .03));
  const bowl = M(lumpy(new THREE.SphereGeometry(.34, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), .11),
    new THREE.MeshLambertMaterial({ color: 0x8c8c84, flatShading: true, side: THREE.DoubleSide }), [0, -.55, .22], [-.25, 0, 0]);
  g.add(bowl);
  g.add(M(lumpy(new THREE.SphereGeometry(.08, 4, 3), .05), stain, [.12, -.75, .4], [0, 0, 0], [1, .4, 1]));
  g.add(M(lumpy(new THREE.SphereGeometry(.06, 4, 3), .05), stain, [.03, .3, .03], [0, 0, 0], [1, 1.6, .5]));
  g.add(M(lumpy(new THREE.SphereGeometry(.05, 4, 3), .04), uglyMat(0xa0b040), [-.1, -.72, .45], [0, 0, 0], [1, .5, 1]));
  return g;
}
export function bDagger() {
  srand(33); const g = new THREE.Group();
  const rust = uglyMat(0x8a4b2a), rust2 = uglyMat(0x6e3a20), grey = uglyMat(0x5c5c55), grip = uglyMat(0x3b2f22), tape = uglyMat(0xcfc9a0);
  g.add(M(lumpy(new THREE.BoxGeometry(.24, .95, .05, 2, 5, 1), .08), rust, [0, .42, 0], [0, 0, .04]));
  g.add(M(lumpy(new THREE.ConeGeometry(.12, .28, 4, 1), .06), rust2, [.03, 1.0, 0], [0, Math.PI / 4, .1], [1, 1, .35]));
  for (let i = 0; i < 5; i++) g.add(M(lumpy(new THREE.SphereGeometry(.035 + rnd() * .03, 4, 3), .03), rust2, [(rnd() - .5) * .18, .1 + rnd() * .7, .03], [0, 0, 0], [1, 1, .4]));
  g.add(M(lumpy(new THREE.BoxGeometry(.55, .08, .1, 3, 1, 1), .06), grey, [.02, -.1, 0], [0, 0, .16]));
  g.add(stick([0, -.15, 0], [-.04, -.65, 0], .06, .06, grip, 5, .03));
  g.add(M(lumpy(new THREE.CylinderGeometry(.075, .07, .1, 6), .03), tape, [-.01, -.32, 0], [0, 0, .25]));
  g.add(M(lumpy(new THREE.CylinderGeometry(.07, .075, .07, 6), .03), tape, [-.02, -.5, 0], [0, 0, -.2]));
  g.add(M(lumpy(new THREE.SphereGeometry(.085, 5, 4), .05), grey, [-.05, -.7, 0]));
  return g;
}
// ---- 초희귀 : 아직 좀 못생김 ----
export function bClub() {
  srand(44); const g = new THREE.Group();
  const wood = uglyMat(0x8b6a40), dark = uglyMat(0x4a3a2a);
  const nail = new THREE.MeshStandardMaterial({ color: 0xa8a8a8, metalness: .7, roughness: .5, flatShading: true });
  g.add(M(lumpy(new THREE.CylinderGeometry(.24, .07, 1.6, 8, 5), .05), wood, [0, .1, 0]));
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2, ly = rnd() * .75, r = .07 + .17 * (ly + .8) / 1.6;
    const d = new V3(Math.cos(a), (rnd() - .3) * .9, Math.sin(a)).normalize();
    const p = new V3(Math.cos(a) * r, ly + .1, Math.sin(a) * r);
    g.add(stick(p.clone().addScaledVector(d, -.05).toArray(), p.clone().addScaledVector(d, .22).toArray(), .015, .006, nail, 4));
  }
  g.add(M(new THREE.CylinderGeometry(.085, .085, .3, 8), dark, [0, -.55, 0]));
  g.add(M(lumpy(new THREE.CylinderGeometry(.24, .23, .12, 8), .03), uglyMat(0xd8d0b8), [0, .55, 0], [0, 0, .1]));
  return g;
}
export function bSling() {
  srand(55); const g = new THREE.Group();
  const wood = uglyMat(0x7a5530), rub = uglyMat(0xd07a7a), leather = uglyMat(0x5a3a22), stone = uglyMat(0x8a8a90);
  const L = [-.42, .62, 0], R = [.45, .5, 0];
  g.add(stick([0, -1, 0], [0, -.15, 0], .08, .07, wood, 6, .03));
  g.add(stick([0, -.15, 0], L, .07, .05, wood, 6, .04));
  g.add(stick([0, -.15, 0], R, .07, .045, wood, 6, .04));
  const curve = new THREE.CatmullRomCurve3([new V3(...L), new V3(-.1, .25, .12), new V3(.05, .22, .15), new V3(...R)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, .02, 5), rub));
  g.add(M(lumpy(new THREE.BoxGeometry(.18, .1, .06), .03), leather, [-.02, .23, .15]));
  g.add(M(lumpy(new THREE.SphereGeometry(.07, 5, 4), .04), stone, [-.02, .24, .21]));
  g.add(M(lumpy(new THREE.CylinderGeometry(.095, .09, .18, 6), .03), uglyMat(0x3c6ad0), [0, -.5, 0]));
  return g;
}
export function bPipe() {
  srand(66); const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x7b8288, metalness: .8, roughness: .45, flatShading: true });
  const duct = uglyMat(0xb8b8b0), redt = uglyMat(0xc03030), rust = uglyMat(0x8a5a30);
  g.add(stick([0, -1, 0], [0, .2, 0], .085, .085, metal, 10, .015));
  g.add(stick([0, .2, 0], [.2, 1.0, 0], .085, .085, metal, 10, .015));
  g.add(M(lumpy(new THREE.CylinderGeometry(.11, .11, .32, 10), .04), duct, [.02, .2, 0], [0, 0, -.1]));
  g.add(M(lumpy(new THREE.CylinderGeometry(.095, .095, .2, 10), .02), duct, [0, -.55, 0], [0, 0, .06]));
  g.add(M(new THREE.CylinderGeometry(.093, .093, .08, 10), redt, [0, -.85, 0]));
  for (let i = 0; i < 4; i++) g.add(M(lumpy(new THREE.SphereGeometry(.04, 4, 3), .03), rust, [.07, -.3 + i * .35, .04], [0, 0, 0], [1, 1.4, .5]));
  return g;
}
// ---- 영웅 : 깔끔하고 멋짐 ----
export function bLongsword() {
  const g = new THREE.Group();
  const steel = std(0xe6ecf5, { metalness: 1, roughness: .2 }), goldm = std(0xc9973f, { metalness: 1, roughness: .3 });
  const leather = std(0x4b2a1a, { roughness: .8 });
  const gem = std(0xb45cff, { emissive: 0x7a2bd0, emissiveIntensity: 1.3, roughness: .1 });
  g.add(M(extr(poly([[-.12, 0], [-.1, 1.65], [0, 1.95], [.1, 1.65], [.12, 0]]), .035, .02), steel, [0, .05, 0]));
  g.add(M(new THREE.BoxGeometry(.035, 1.4, .08), std(0x9aa6b8, { metalness: 1, roughness: .35 }), [0, .8, 0]));
  g.add(M(new THREE.BoxGeometry(.78, .09, .13), goldm));
  [-.42, .42].forEach(x => g.add(M(new THREE.SphereGeometry(.07, 16, 12), goldm, [x, 0, 0])));
  g.add(M(new THREE.OctahedronGeometry(.07), gem, [0, 0, .07])); g.add(M(new THREE.OctahedronGeometry(.07), gem, [0, 0, -.07]));
  g.add(M(new THREE.CylinderGeometry(.05, .05, .5, 16), leather, [0, -.3, 0]));
  [-.12, -.3, -.48].forEach(y => g.add(M(new THREE.TorusGeometry(.055, .012, 8, 20), goldm, [0, y, 0], [Math.PI / 2, 0, 0])));
  g.add(M(new THREE.SphereGeometry(.09, 16, 12), goldm, [0, -.6, 0]));
  g.add(M(new THREE.OctahedronGeometry(.045), gem, [0, -.6, .08]));
  return g;
}
export function bAxe() {
  const g = new THREE.Group();
  const wood = std(0x6b3e1f, { roughness: .7 }), steel = std(0xcfd6e0, { metalness: 1, roughness: .22 }), dark = std(0x2a2a33, { metalness: .8, roughness: .4 });
  const rune = basic(0xd08bff);
  g.add(M(new THREE.CylinderGeometry(.055, .065, 2.2, 16), wood, [0, -.1, 0]));
  [-.9, -1.1].forEach(y => g.add(M(new THREE.CylinderGeometry(.075, .075, .07, 16), dark, [0, y, 0])));
  g.add(M(new THREE.ConeGeometry(.06, .2, 12), dark, [0, -1.3, 0], [Math.PI, 0, 0]));
  g.add(M(new THREE.BoxGeometry(.22, .42, .2), dark, [0, .75, 0]));
  const s = new THREE.Shape();
  s.moveTo(.08, .17); s.lineTo(.3, .14); s.quadraticCurveTo(.5, .38, .74, .55); s.quadraticCurveTo(.58, 0, .74, -.55);
  s.quadraticCurveTo(.5, -.38, .3, -.14); s.lineTo(.08, -.17); s.closePath();
  const bg = extr(s, .05, .02);
  g.add(M(bg, steel, [0, .75, 0])); g.add(M(bg, steel, [0, .75, 0], [0, Math.PI, 0]));
  [1, -1].forEach(side => [.05, -.05].forEach(z => {
    g.add(M(new THREE.BoxGeometry(.03, .3, .01), rune, [side * .45, .75, z]));
    g.add(M(new THREE.BoxGeometry(.14, .03, .01), rune, [side * .45, .82, z], [0, 0, side * .5]));
    g.add(M(new THREE.BoxGeometry(.1, .03, .01), rune, [side * .45, .68, z], [0, 0, -side * .5]));
  }));
  g.add(M(new THREE.ConeGeometry(.06, .35, 12), steel, [0, 1.13, 0]));
  return g;
}
// ---- 레전더리 : 빛나는 전설 ----
export function bSolaris() {
  const g = new THREE.Group();
  const goldm = std(0xffb020, { metalness: .75, roughness: .3, emissive: 0x7a4000, emissiveIntensity: .5 });
  const blade = std(0xfff4d6, { metalness: .9, roughness: .15, emissive: 0xff8a00, emissiveIntensity: .3 });
  g.add(M(extr(poly([[-.15, 0], [-.21, .45], [-.13, 1.55], [0, 2.1], [.13, 1.55], [.21, .45], [.15, 0]]), .05, .025), blade, [0, .08, 0]));
  g.add(M(extr(poly([[-.04, .1], [-.06, .5], [-.03, 1.5], [0, 1.8], [.03, 1.5], [.06, .5], [.04, .1]]), .11, 0), basic(0xffd56a), [0, .08, 0]));
  const w = new THREE.Shape();
  w.moveTo(0, 0); w.quadraticCurveTo(.3, .3, .72, .44); w.lineTo(.55, .25); w.lineTo(.74, .2); w.lineTo(.52, .09); w.lineTo(.63, -.02); w.quadraticCurveTo(.3, -.12, 0, -.1); w.closePath();
  const wg = extr(w, .06, .02);
  g.add(M(wg, goldm, [.06, .02, 0])); g.add(M(wg, goldm, [-.06, .02, 0], [0, Math.PI, 0]));
  g.add(M(new THREE.SphereGeometry(.13, 24, 16), goldm, [0, .02, 0]));
  g.add(M(new THREE.SphereGeometry(.08, 16, 12), basic(0xfff0a0), [0, .02, .1]));
  g.add(M(new THREE.CylinderGeometry(.055, .05, .55, 16), std(0xf3ead8, { roughness: .6 }), [0, -.3, 0]));
  [-.12, -.3, -.48].forEach(y => g.add(M(new THREE.TorusGeometry(.06, .014, 8, 20), goldm, [0, y, 0], [Math.PI / 2, 0, 0])));
  g.add(M(new THREE.OctahedronGeometry(.12), goldm, [0, -.66, 0]));
  const sun = glow(0xffaa30, 1.0); sun.position.set(0, .02, .12); g.add(sun);
  const bladeGlow = glow(0xff9a20, 1, .45); bladeGlow.scale.set(.9, 2.8, 1); bladeGlow.position.y = 1.1; g.add(bladeGlow);
  const halo = M(new THREE.TorusGeometry(.5, .018, 8, 64), addBasic(0xffd060, .9), [0, 1.1, 0], [Math.PI / 2, 0, 0]);
  const halo2 = M(new THREE.TorusGeometry(.36, .012, 8, 64), addBasic(0xffeeaa, .7), [0, 1.1, 0], [Math.PI / 2.4, 0, 0]);
  g.add(halo, halo2);
  const sp = sparkles(50, .3, .8, 0xffd27a, .06); sp.position.y = .7; g.add(sp);
  g.userData.update = t => {
    halo.rotation.z = t; halo.position.y = 1.1 + Math.sin(t * 2) * .12;
    halo2.rotation.z = -t * 1.4; halo2.position.y = 1.2 + Math.sin(t * 2 + 1) * .12;
    sun.material.opacity = .75 + Math.sin(t * 4) * .25; bladeGlow.material.opacity = .35 + Math.sin(t * 3) * .12;
    sp.rotation.y = t * .5;
  };
  return g;
}
export function bStaff() {
  const g = new THREE.Group();
  const wood = std(0x3a2416, { roughness: .6 }), goldm = std(0xffc030, { metalness: 1, roughness: .25 });
  g.add(M(new THREE.CylinderGeometry(.05, .065, 2.2, 14), wood, [0, -.1, 0]));
  const hp = []; for (let i = 0; i <= 90; i++) { const a = i * .38, y = -1.1 + i / 90 * 2.0; hp.push(new V3(Math.cos(a) * .065, y, Math.sin(a) * .065)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 200, .014, 6), goldm));
  g.add(M(new THREE.CylinderGeometry(.1, .07, .18, 16), goldm, [0, 1.0, 0]));
  g.add(M(new THREE.ConeGeometry(.07, .15, 12), goldm, [0, -1.28, 0], [Math.PI, 0, 0]));
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * Math.PI * 2 + .4, c = Math.cos(a), s = Math.sin(a);
    const cv = new THREE.CatmullRomCurve3([new V3(c * .08, 1.05, s * .08), new V3(c * .3, 1.3, s * .3), new V3(c * .26, 1.55, s * .26), new V3(c * .08, 1.72, s * .08)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 24, .025, 8), goldm));
    g.add(M(new THREE.ConeGeometry(.03, .1, 8), goldm, [c * .08, 1.76, s * .08]));
  }
  const orb = M(new THREE.SphereGeometry(.16, 24, 16), basic(0xff6a20), [0, 1.38, 0]);
  const shell = M(new THREE.SphereGeometry(.21, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xff9a50, transparent: true, opacity: .35, roughness: 0, emissive: 0xff4400, emissiveIntensity: .6 }), [0, 1.38, 0]);
  g.add(orb, shell);
  const og = glow(0xff5a10, 1.4); og.position.y = 1.38; g.add(og);
  const runes = new THREE.Group(); runes.position.y = 1.38; g.add(runes);
  for (let i = 0; i < 3; i++) { const r = M(new THREE.OctahedronGeometry(.05), basic(0xffb060)); r.position.set(Math.cos(i * 2.09) * .45, 0, Math.sin(i * 2.09) * .45); runes.add(r); }
  const flames = [];
  for (let i = 0; i < 8; i++) { const f = glow(i % 2 ? 0xff7a20 : 0xffc040, .25, .8); f.userData.o = i / 8; g.add(f); flames.push(f); }
  g.userData.update = t => {
    runes.rotation.y = t * 1.8; runes.rotation.z = Math.sin(t) * .3;
    og.material.opacity = .7 + Math.sin(t * 6) * .3; orb.scale.setScalar(1 + Math.sin(t * 5) * .06);
    flames.forEach(f => {
      const p = (t * .7 + f.userData.o) % 1;
      f.position.set(Math.sin(f.userData.o * 20 + t) * .12 * (1 - p), 1.45 + p * .7, Math.cos(f.userData.o * 13) * .1);
      f.material.opacity = (1 - p) * .9; f.scale.setScalar(.3 * (1 - p * .6));
    });
  };
  return g;
}
// ---- 울트라 : 우주급 ----
export function bCosmic() {
  const g = new THREE.Group(), cm = cosmicMat();
  const dark = std(0x1b1830, { metalness: 1, roughness: .3 });
  g.add(M(extr(poly([[-.13, 0], [-.2, .3], [-.14, .55], [-.25, .9], [-.15, 1.2], [-.23, 1.55], [-.1, 1.85], [0, 2.4], [.1, 1.85], [.23, 1.55], [.15, 1.2], [.25, .9], [.14, .55], [.2, .3], [.13, 0]]), .06, .025), cm, [0, .1, 0]));
  g.add(M(new THREE.OctahedronGeometry(.17), cm, [0, .03, 0], [0, 0, 0], [1, .7, .7]));
  [-1, 1].forEach(sd => g.add(M(new THREE.OctahedronGeometry(.12), cm, [sd * .34, .1, 0], [0, 0, sd * -.35], [2.6, .55, .55])));
  g.add(M(new THREE.CylinderGeometry(.055, .05, .55, 16), dark, [0, -.32, 0]));
  [-.15, -.32, -.49].forEach(y => g.add(M(new THREE.TorusGeometry(.06, .012, 8, 24), basic(0x8af3ff), [0, y, 0], [Math.PI / 2, 0, 0])));
  g.add(M(new THREE.IcosahedronGeometry(.11), cm, [0, -.68, 0]));
  const orbit = new THREE.Group(); orbit.position.y = 1.0; g.add(orbit);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, s = M(new THREE.OctahedronGeometry(.06), cm, [Math.cos(a) * .6, (Math.sin(i * 2.3)) * .7, Math.sin(a) * .6], [0, 0, 0], [1, 2.2, 1]);
    orbit.add(s);
  }
  const r1 = M(new THREE.TorusGeometry(.7, .013, 8, 96), addBasic(0xffffff, .9), [0, 1.0, 0]);
  const r2 = M(new THREE.TorusGeometry(.55, .01, 8, 96), addBasic(0xffffff, .8), [0, 1.0, 0]);
  g.add(r1, r2);
  const big = glow(0x9a6bff, 3.2, .5); big.position.y = 1.0; g.add(big);
  const core = glow(0xffffff, 1, .35); core.scale.set(.7, 2.8, 1); core.position.y = 1.15; g.add(core);
  const st = sparkles(140, .3, 1.3, 0xffffff, .045); st.position.y = 1.0; g.add(st);
  g.userData.update = t => {
    orbit.rotation.y = t * 1.4;
    r1.rotation.set(Math.PI / 2 + Math.sin(t) * .4, t * .8, 0); r2.rotation.set(Math.PI / 2 - Math.sin(t * 1.3) * .5, -t, 0);
    r1.material.color.setHSL((t * .2) % 1, 1, .65); r2.material.color.setHSL((t * .2 + .5) % 1, 1, .65);
    big.material.color.setHSL((t * .1) % 1, .8, .6);
    st.rotation.y = -t * .3;
  };
  return g;
}
export function bReaper() {
  const g = new THREE.Group(), vm = voidMat();
  const dark = std(0x14121c, { metalness: 1, roughness: .3 });
  g.add(M(new THREE.CylinderGeometry(.045, .05, 2.6, 16), dark, [0, -.1, 0]));
  const rings = [-.9, -.3, .4].map(y => { const r = M(new THREE.TorusGeometry(.065, .013, 8, 24), basic(0xff3d8b), [0, y, 0], [Math.PI / 2, 0, 0]); g.add(r); return r; });
  g.add(M(new THREE.ConeGeometry(.06, .3, 12), vm, [0, -1.55, 0], [Math.PI, 0, 0]));
  const s = new THREE.Shape();
  s.moveTo(.05, .16); s.quadraticCurveTo(-.75, .55, -1.45, -.35); s.quadraticCurveTo(-.75, .05, .05, -.12); s.closePath();
  g.add(M(extr(s, .04, .02), vm, [0, 1.15, 0]));
  g.add(M(new THREE.ConeGeometry(.05, .3, 8), vm, [.2, 1.17, 0], [0, 0, -Math.PI / 2]));
  g.add(M(new THREE.BoxGeometry(.14, .32, .12), dark, [0, 1.15, 0]));
  g.add(M(new THREE.SphereGeometry(.045, 16, 12), basic(0xff3d8b), [0, 1.15, .07]));
  const eye = glow(0xff3d8b, .5); eye.position.set(0, 1.15, .1); g.add(eye);
  const big = glow(0xb03dff, 3.2, .45); big.position.set(-.4, .9, 0); g.add(big);
  const orbs = new THREE.Group(); orbs.position.set(-.45, 1.0, 0); g.add(orbs);
  for (let i = 0; i < 4; i++) {
    const o = new THREE.Group(), a = i / 4 * Math.PI * 2;
    o.position.set(Math.cos(a) * .75, Math.sin(a) * .5, Math.sin(a) * .4);
    o.add(M(new THREE.SphereGeometry(.06, 16, 12), basic(0x0a0010))); o.add(glow(0xff3d8b, .35, .9));
    orbs.add(o);
  }
  const st = sparkles(110, .3, 1.2, 0xff5ab0, .05); st.position.set(-.3, .6, 0); g.add(st);
  g.userData.update = t => {
    orbs.rotation.z = t * .9; orbs.rotation.y = Math.sin(t * .5) * .5;
    eye.material.opacity = .6 + Math.sin(t * 7) * .4;
    rings.forEach((r, i) => r.material.color.setHSL(.9 + Math.sin(t * 3 + i) * .05, 1, .6));
    st.rotation.y = t * .4; big.material.opacity = .4 + Math.sin(t * 2) * .1;
  };
  return g;
}

/* ---------- 추가 무기 ---------- */
// 희귀
export function bUmbrella() {
  srand(77); const g = new THREE.Group();
  const shaft = uglyMat(0x55555c), cloth = new THREE.MeshLambertMaterial({ color: 0x2a3f7a, flatShading: true, side: THREE.DoubleSide });
  g.add(stick([0, -.85, 0], [.03, 1.15, 0], .03, .025, shaft, 5, .02));
  const hook = new THREE.CatmullRomCurve3([new V3(0, -.85, 0), new V3(0, -1.05, 0), new V3(.14, -1.18, 0), new V3(.26, -1.05, 0), new V3(.26, -.95, 0)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(hook, 16, .04, 5), uglyMat(0x6b4a2a)));
  g.add(M(lumpy(new THREE.ConeGeometry(.3, 1.05, 8, 3, true), .1), cloth, [.02, .55, 0]));
  g.add(M(lumpy(new THREE.SphereGeometry(.06, 5, 4), .03), uglyMat(0x1d2d58), [.03, .02, 0]));
  g.add(stick([.05, .7, .1], [.45, .95, .22], .015, .01, shaft, 4, .02)); // 부러진 살
  g.add(M(lumpy(new THREE.BoxGeometry(.16, .2, .02), .05), cloth, [.4, .9, .2], [0, .4, .5]));
  return g;
}
export function bBrick() {
  srand(88); const g = new THREE.Group();
  const red = uglyMat(0xa4502f), red2 = uglyMat(0x8a3f24), mortar = uglyMat(0xc9c1aa);
  g.add(M(lumpy(new THREE.BoxGeometry(.5, .85, .32, 3, 4, 2), .07), red, [0, 0, 0], [0, 0, .08]));
  g.add(M(lumpy(new THREE.BoxGeometry(.52, .1, .34, 3, 1, 2), .05), mortar, [.02, .43, 0], [0, 0, .1]));
  for (let i = 0; i < 4; i++) g.add(M(lumpy(new THREE.SphereGeometry(.05 + rnd() * .04, 4, 3), .03), red2, [(rnd() - .5) * .35, (rnd() - .5) * .6, .16], [0, 0, 0], [1, 1, .4]));
  g.add(M(lumpy(new THREE.BoxGeometry(.2, .14, .1), .04), mortar, [-.2, -.42, .1], [0, 0, -.3]));
  return g;
}
// 초희귀
export function bFrypan() {
  srand(99); const g = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2d33, metalness: .6, roughness: .55, flatShading: true });
  g.add(stick([0, -1.15, 0], [0, .05, 0], .055, .045, uglyMat(0x1a1a1e), 6, .02));
  g.add(M(new THREE.TorusGeometry(.06, .02, 6, 12), iron, [0, -1.12, 0]));
  g.add(M(lumpy(new THREE.CylinderGeometry(.5, .44, .1, 16, 1), .03), iron, [0, .55, 0], [Math.PI / 2, 0, 0]));
  g.add(M(new THREE.CylinderGeometry(.42, .42, .02, 16), std(0x3c3d44, { roughness: .4, metalness: .4 }), [0, .55, .05], [Math.PI / 2, 0, 0]));
  g.add(M(lumpy(new THREE.SphereGeometry(.2, 8, 5), .05), uglyMat(0xf5f2e6), [.06, .6, .08], [0, 0, 0], [1.2, 1, .2]));
  g.add(M(new THREE.SphereGeometry(.08, 12, 8), std(0xffb020, { roughness: .3 }), [.08, .62, .11], [0, 0, 0], [1, 1, .6]));
  return g;
}
export function bKunai() {
  srand(111); const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, metalness: .9, roughness: .35, flatShading: true });
  g.add(M(extr(poly([[-.16, 0], [0, 1.1], [.16, 0], [0, -.12]]), .05, .015), steel, [0, .15, 0]));
  g.add(M(new THREE.BoxGeometry(.02, .9, .07), std(0x5d646e, { metalness: 1, roughness: .4 }), [0, .55, 0]));
  g.add(stick([0, .05, 0], [0, -.6, 0], .045, .045, uglyMat(0x22222a), 6));
  for (let i = 0; i < 5; i++) g.add(M(new THREE.TorusGeometry(.05, .012, 4, 10), uglyMat(0xc03030), [0, -.05 - i * .12, 0], [Math.PI / 2, 0, i * .3]));
  g.add(M(new THREE.TorusGeometry(.11, .025, 6, 16), steel, [0, -.74, 0]));
  return g;
}
// 영웅
export function bSpear() {
  const g = new THREE.Group();
  const wood = std(0x5a3520, { roughness: .7 }), steel = std(0xe6ecf5, { metalness: 1, roughness: .2 }), goldm = std(0xc9973f, { metalness: 1, roughness: .3 });
  g.add(M(new THREE.CylinderGeometry(.045, .05, 2.6, 16), wood, [0, -.2, 0]));
  g.add(M(extr(poly([[-.13, 0], [-.16, .2], [0, .75], [.16, .2], [.13, 0]]), .03, .02), steel, [0, 1.12, 0]));
  g.add(M(new THREE.BoxGeometry(.025, .6, .05), std(0x9aa6b8, { metalness: 1, roughness: .35 }), [0, 1.4, 0]));
  g.add(M(new THREE.CylinderGeometry(.075, .06, .16, 16), goldm, [0, 1.06, 0]));
  [-.25, .15].forEach(x => g.add(M(new THREE.ConeGeometry(.05, .38, 8), std(0xd83a3a, { roughness: .8 }), [x * .4, .82, 0], [0, 0, x])));
  g.add(M(new THREE.ConeGeometry(.06, .2, 12), goldm, [0, -1.6, 0], [Math.PI, 0, 0]));
  return g;
}
export function bChakram() {
  const g = new THREE.Group();
  const ice = std(0xbfefff, { metalness: .6, roughness: .15, emissive: 0x2a8ad0, emissiveIntensity: .35 });
  const dark = std(0x1d3550, { metalness: 1, roughness: .3 });
  g.add(M(new THREE.TorusGeometry(.6, .05, 10, 48), ice));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.add(M(extr(poly([[-.07, 0], [0, .28], [.07, 0]]), .03, .01), ice, [Math.cos(a) * .62, Math.sin(a) * .62, 0], [0, 0, a - Math.PI / 2]));
  }
  g.add(M(new THREE.BoxGeometry(1.15, .09, .07), dark));
  g.add(M(new THREE.CylinderGeometry(.06, .06, .4, 12), std(0x334a66, { roughness: .7 }), [0, 0, 0], [0, 0, Math.PI / 2]));
  const gl = glow(0x7fdcff, 1.8, .35); g.add(gl);
  g.userData.update = t => { gl.material.opacity = .3 + Math.sin(t * 3) * .1; };
  return g;
}
// 레전더리
export function bThunder() {
  const g = new THREE.Group();
  const goldm = std(0xffc54a, { metalness: 1, roughness: .25 }), stone = std(0x5a6a8a, { metalness: .5, roughness: .35 });
  g.add(M(new THREE.CylinderGeometry(.06, .07, 1.7, 16), std(0x3a2a20, { roughness: .6 }), [0, -.35, 0]));
  [-.9, -1.05, -1.2].forEach(y => g.add(M(new THREE.TorusGeometry(.075, .015, 8, 20), goldm, [0, y, 0], [Math.PI / 2, 0, 0])));
  g.add(M(new THREE.OctahedronGeometry(.1), goldm, [0, -1.32, 0]));
  g.add(M(roundedBox(1.05, .55, .5, .1), stone, [0, .72, 0]));
  [-.5, .5].forEach(x => g.add(M(new THREE.CylinderGeometry(.3, .3, .1, 20), goldm, [x, .72, 0], [0, 0, Math.PI / 2])));
  const bolt = M(extr(poly([[-.05, .22], [.1, .22], [.02, .04], [.12, .04], [-.08, -.24], [-.01, -.04], [-.1, -.04]]), .04, 0), basic(0xfff27a), [0, .72, .27]);
  g.add(bolt);
  const gl = glow(0x9adcff, 2.2, .5); gl.position.y = .72; g.add(gl);
  const arcs = [];
  for (let i = 0; i < 3; i++) {
    const pts = []; for (let k = 0; k <= 6; k++) pts.push(new V3(0, 0, 0));
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xcff4ff, transparent: true, blending: THREE.AdditiveBlending }));
    g.add(ln); arcs.push(ln);
  }
  g.userData.update = t => {
    gl.material.opacity = .4 + Math.random() * .3;
    arcs.forEach((ln, i) => {
      const p = ln.geometry.attributes.position, a0 = t * 3 + i * 2.1;
      for (let k = 0; k <= 6; k++) {
        const u = k / 6, a = a0 + u * 1.6;
        p.setXYZ(k, Math.cos(a) * (.6 + u * .2) + (Math.random() - .5) * .12, .72 + Math.sin(a) * (.45 + u * .1) + (Math.random() - .5) * .12, (Math.random() - .5) * .2);
      }
      p.needsUpdate = true; ln.material.opacity = Math.random() < .3 ? 0 : .9;
    });
  };
  return g;
}
export function bFrostbow() {
  const g = new THREE.Group();
  const ice = new THREE.MeshPhysicalMaterial({ color: 0xaee8ff, roughness: .05, metalness: .1, transmission: .3, emissive: 0x2a7ad0, emissiveIntensity: .45, clearcoat: 1 });
  const silver = std(0xdfe8f5, { metalness: 1, roughness: .2 });
  const bow = new THREE.CatmullRomCurve3([new V3(.05, -1.2, 0), new V3(.35, -.7, 0), new V3(.45, 0, 0), new V3(.35, .7, 0), new V3(.05, 1.2, 0)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(bow, 40, .05, 8), ice));
  g.add(M(new THREE.CylinderGeometry(.07, .07, .4, 12), silver, [.45, 0, 0]));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(.05, -1.2, 0), new V3(-.15, 0, 0), new V3(.05, 1.2, 0)]), new THREE.LineBasicMaterial({ color: 0xe8fbff })));
  [-1.2, 1.2].forEach(y => g.add(M(new THREE.OctahedronGeometry(.12), ice, [.05, y, 0], [0, 0, 0], [.7, 1.6, .7])));
  for (let i = 0; i < 5; i++) g.add(M(new THREE.OctahedronGeometry(.06), ice, [.4 + Math.cos(i) * .08, -.6 + i * .3, .06], [0, 0, i], [.6, 1.8, .6]));
  g.add(M(new THREE.CylinderGeometry(.015, .015, 1.5, 6), silver, [-.15, 0, 0], [0, 0, Math.PI / 2]));
  g.add(M(new THREE.ConeGeometry(.06, .2, 8), ice, [.65, 0, 0], [0, 0, -Math.PI / 2]));
  const gl = glow(0x8adfff, 2.4, .4); g.add(gl);
  const sp = sparkles(60, .2, .7, 0xe0f8ff, .05); g.add(sp);
  g.userData.update = t => { sp.rotation.y = t * .6; gl.material.opacity = .35 + Math.sin(t * 2.5) * .1; };
  return g;
}
// 울트라
export function bBlackhole() {
  const g = new THREE.Group(), vm = voidMat(), cm = cosmicMat();
  const dark = std(0x0f0d18, { metalness: 1, roughness: .3 });
  g.add(M(new THREE.CylinderGeometry(.05, .06, 2.1, 16), dark, [0, -.45, 0]));
  [-1.0, -.6, -.2].forEach(y => g.add(M(new THREE.TorusGeometry(.07, .014, 8, 24), cm, [0, y, 0], [Math.PI / 2, 0, 0])));
  g.add(M(new THREE.ConeGeometry(.07, .25, 12), vm, [0, -1.6, 0], [Math.PI, 0, 0]));
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const cv = new THREE.CatmullRomCurve3([new V3(c * .06, .55, s * .06), new V3(c * .35, .8, s * .35), new V3(c * .3, 1.2, s * .3)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 20, .03, 8), dark));
  }
  const hole = M(new THREE.SphereGeometry(.3, 32, 24), basic(0x000000), [0, 1.05, 0]);
  const rim = M(new THREE.SphereGeometry(.34, 32, 24), vm, [0, 1.05, 0]); rim.material.transparent = true;
  rim.material.side = THREE.BackSide; g.add(rim, hole);
  const disk = M(new THREE.TorusGeometry(.6, .1, 8, 80), cm, [0, 1.05, 0], [Math.PI / 2.4, 0, 0], [1, 1, .15]);
  const disk2 = M(new THREE.TorusGeometry(.82, .02, 8, 96), addBasic(0xffffff, .8), [0, 1.05, 0]);
  g.add(disk, disk2);
  const big = glow(0x7a2bff, 3.4, .55); big.position.y = 1.05; g.add(big);
  const st = sparkles(160, .4, 1.4, 0xffffff, .045); st.position.y = 1.05; g.add(st);
  g.userData.update = t => {
    disk.rotation.z = t * 2; disk2.rotation.set(Math.PI / 2 + Math.sin(t) * .5, t * .7, 0);
    disk2.material.color.setHSL((t * .2) % 1, 1, .65);
    hole.scale.setScalar(1 + Math.sin(t * 4) * .04); st.rotation.y = -t * .8;
    big.material.opacity = .45 + Math.sin(t * 2) * .12;
  };
  return g;
}

// 크기 맞추고 가운데로 정렬
export function buildWeapon(w, target = 2.2) {
  const inner = w.build(); inner.updateMatrixWorld(true);
  const box = new THREE.Box3(); inner.traverse(o => { if (o.isMesh) box.expandByObject(o); });
  const size = box.getSize(new V3()), c = box.getCenter(new V3());
  inner.position.sub(c);
  const sc = new THREE.Group(); sc.scale.setScalar(target / Math.max(size.y, size.x * 1.15)); sc.add(inner);
  const outer = new THREE.Group(); outer.add(sc);
  outer.userData.update = inner.userData.update; outer.userData.def = w;
  return outer;
}

const BASE_WEAPONS = [
  { id: 'stick',  r: 'rare',  name: '썩은 나뭇가지',     desc: '길바닥에 떨어져 있던 것. 이끼 냄새가 난다.', build: bStick },
  { id: 'ladle',  r: 'rare',  name: '찌그러진 국자',     desc: '급식실에서 퇴역한 국자. 국물은 잘 뜬다.', build: bLadle },
  { id: 'dagger', r: 'rare',  name: '녹슨 이빠진 단검',  desc: '파상풍 주사부터 맞고 쓰자.', build: bDagger },
  { id: 'umbrella', r: 'rare', name: '부러진 우산',      desc: '비는 못 막지만 슬라임은 막는다.', build: bUmbrella },
  { id: 'brick',  r: 'rare',  name: '반쪽 벽돌',         desc: '공사장에서 주웠다. 던지면 꽤 아프다.', build: bBrick },
  { id: 'club',   r: 'super', name: '못 박힌 몽둥이',     desc: '못을 아무렇게나 박았다. 쓰는 사람도 찔린다.', build: bClub },
  { id: 'sling',  r: 'super', name: '삐뚤어진 새총',     desc: '조준하면 항상 왼쪽으로 날아간다.', build: bSling },
  { id: 'pipe',   r: 'super', name: '테이프 감은 쇠파이프', desc: '청테이프의 힘으로 겨우 버티는 중.', build: bPipe },
  { id: 'frypan', r: 'super', name: '계란 붙은 프라이팬', desc: '계란은 떨어지지 않는다. 절대로.', build: bFrypan },
  { id: 'kunai',  r: 'super', name: '수상한 표창',       desc: '닌자 학원 기념품 가게에서 샀다.', build: bKunai },
  { id: 'longsword', r: 'hero', name: '기사의 장검',     desc: '왕국 기사단에게 지급되는 잘 벼려진 장검.', build: bLongsword },
  { id: 'axe',    r: 'hero',  name: '룬 전투 도끼',      desc: '보랏빛 룬이 새겨진 양날 도끼.', build: bAxe },
  { id: 'spear',  r: 'hero',  name: '근위대의 창',       desc: '한 줄로 늘어선 적을 한 번에 꿰뚫는다.', build: bSpear },
  { id: 'chakram', r: 'hero', name: '서리 차크람',       desc: '스치기만 해도 몸이 얼어붙는 원반.', build: bChakram },
  { id: 'solaris', r: 'legend', name: '태양검 솔라리스',  desc: '태양의 조각을 담금질해 만든 전설의 검.', build: bSolaris },
  { id: 'dragonstaff', r: 'legend', name: '화염룡의 지팡이', desc: '봉인된 용의 불꽃이 끝없이 타오른다.', build: bStaff },
  { id: 'thunder', r: 'legend', name: '뇌신의 망치',     desc: '휘두르지 않아도 하늘에서 번개가 떨어진다.', build: bThunder },
  { id: 'frostbow', r: 'legend', name: '빙결궁 프로스트', desc: '얼음 화살이 적을 꿰뚫고 얼려 버린다.', build: bFrostbow },
  { id: 'cosmic', r: 'ultra', name: '코스믹 엔드블레이드', desc: '은하 하나를 통째로 벼려 만든 검. 우주의 끝을 가른다.', build: bCosmic },
  { id: 'voidreaper', r: 'ultra', name: '차원낫 보이드리퍼', desc: '차원의 틈을 베어 여는 금단의 낫.', build: bReaper },
  { id: 'blackhole', r: 'ultra', name: '사건의 지평선',   desc: '작은 블랙홀을 불러내 모든 것을 빨아들인다.', build: bBlackhole },
];
// 추가 무기를 등급 순서(희귀 → 울트라)에 맞춰 끼워 넣는다
const ORDER = ['rare', 'super', 'hero', 'legend', 'ultra'];
export const WEAPONS = [...BASE_WEAPONS, ...NEW_WEAPONS, ...MACHINE_SWORDS].sort((a, b) => ORDER.indexOf(a.r) - ORDER.indexOf(b.r));
