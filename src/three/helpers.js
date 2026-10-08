import * as THREE from 'three';

export const V3 = THREE.Vector3;
/* =========================================================
   공용 three.js 헬퍼
   ========================================================= */
export let _seed = 1;
export const srand = s => { _seed = s; };
export const rnd = () => (_seed = (_seed * 16807) % 2147483647) / 2147483647;

// 꼭짓점을 울퉁불퉁하게 흔들어서 "못생긴" 형태를 만든다 (같은 위치의 정점은 같이 움직여서 틈이 안 생김)
export function lumpy(geo, amt) {
  const p = geo.attributes.position, map = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    let o = map.get(k);
    if (!o) { o = [(rnd() - .5) * amt, (rnd() - .5) * amt, (rnd() - .5) * amt]; map.set(k, o); }
    p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
  }
  geo.computeVertexNormals();
  return geo;
}
export const uglyMat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
export const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .5, metalness: 0 }, o));
export const basic = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));
export const addBasic = (c, op = 1) => basic(c, { transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
export function M(geo, mat, p = [0, 0, 0], r = [0, 0, 0], s) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r);
  if (s) m.scale.set(...s); m.castShadow = true; return m;
}
// 두 점 사이를 잇는 원기둥
export function stick(a, b, r1, r2, mat, seg = 6, lump = 0) {
  const A = new V3(...a), B = new V3(...b);
  const geo = new THREE.CylinderGeometry(r2, r1, A.distanceTo(B), seg, 3);
  if (lump) lumpy(geo, lump);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = true; return m;
}
export function extr(shape, depth, bevel = .015) {
  const g = new THREE.ExtrudeGeometry(shape, bevel > 0
    ? { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 }
    : { depth, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -depth / 2); return g;
}
export function poly(pts) { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]); s.closePath(); return s; }
export function roundedBox(w, h, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const b = Math.min(r * .4, .06);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * .5, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(d - 2 * b) / 2); return g;
}
export const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
export function glow(color, size, op = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op }));
  s.scale.set(size, size, 1); return s;
}
export function sparkles(n, rMin, rMax, color, size = .05) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = rMin + Math.random() * (rMax - rMin), a = Math.random() * Math.PI * 2, y = (Math.random() - .5) * 2.4;
    pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
}
export function disposeObj(o) {
  o.traverse(c => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
  });
}
export function makeEnv(r) {
  const pm = new THREE.PMREMGenerator(r), es = new THREE.Scene();
  es.background = new THREE.Color(0x1d4a50);
  const add = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(c, { side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  add(0xffffff, 0, 8, 0, 10, 10); add(0xff6aa8, -8, 2, 0, 6, 8); add(0x6ad8ff, 8, 2, 0, 6, 8);
  add(0xfff2d8, 0, 3, 8, 9, 4); add(0x2a6a70, 0, -6, 0, 20, 20);
  const t = pm.fromScene(es, .04).texture; pm.dispose(); return t;
}

// 울트라 전용 셰이더
export const U = { time: { value: 0 } };
export const VS = `varying vec3 vP;varying vec3 vN;varying vec3 vV;
void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
export const cosmicMat = () => new THREE.ShaderMaterial({
  uniforms: { time: U.time }, vertexShader: VS,
  fragmentShader: `uniform float time;varying vec3 vP;varying vec3 vN;varying vec3 vV;
  vec3 hsv(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){float f=pow(1.-abs(dot(vN,vV)),2.);vec3 c=hsv(vec3(fract(vP.y*.35-time*.25),.75,1.));
  vec2 g=floor(vP.xy*38.+vec2(0.,time*3.));float st=step(.97,h(g))*(.6+.4*sin(time*7.+h(g)*30.));
  vec3 base=mix(vec3(.04,.02,.14),c,.45+.35*sin(vP.y*7.-time*3.));
  gl_FragColor=vec4(base+c*f*1.6+vec3(st),1.);}`,
});
export const voidMat = () => new THREE.ShaderMaterial({
  uniforms: { time: U.time }, vertexShader: VS,
  fragmentShader: `uniform float time;varying vec3 vP;varying vec3 vN;varying vec3 vV;
  void main(){float f=pow(1.-abs(dot(vN,vV)),1.4);float s=.5+.5*sin(vP.x*11.+vP.y*15.-time*4.);
  float s2=.5+.5*sin(length(vP.xy-vec2(-.6,0.))*22.-time*5.);
  vec3 base=vec3(.03,0.,.07)+vec3(.3,0.,.45)*pow(s,3.)+vec3(.5,.05,.3)*pow(s2,8.);
  gl_FragColor=vec4(base+vec3(1.,.2,.7)*f*2.2,1.);}`,
});
