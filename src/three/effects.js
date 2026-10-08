import * as THREE from 'three';
import { V3, basic, addBasic, glowTex, disposeObj } from './helpers.js';
import { stage, renderer, scene, camera } from './scene.js';

// 연출용 오브젝트
export const dimmer = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), basic(0x041a1d, { transparent: true, opacity: 0, depthWrite: false }));
dimmer.position.set(0, 3, 5.0); scene.add(dimmer);

export function makeRays(color, rainbow) {
  const g = new THREE.Group(), n = 16;
  for (let i = 0; i < n; i++) {
    const s = new THREE.Shape(); s.moveTo(-.04, 0); s.lineTo(.04, 0); s.lineTo(.5, 7); s.lineTo(-.5, 7); s.closePath();
    const c = new THREE.Color(color); if (rainbow) c.setHSL(i / n, 1, .6);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), addBasic(c, .16)); m.material.side = THREE.DoubleSide;
    m.rotation.z = i / n * Math.PI * 2; g.add(m);
  }
  return g;
}
export const bursts = [];
export function burst(pos, color, count, speed, size = .09) {
  const geo = new THREE.BufferGeometry(), p = new Float32Array(count * 3), cols = new Float32Array(count * 3), v = [], c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    p.set([pos.x, pos.y, pos.z], i * 3);
    const d = new V3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
    v.push(d.multiplyScalar(speed * (.3 + Math.random() * .7)));
    if (color === 'rainbow') c.setHSL(Math.random(), 1, .6); else c.set(color).offsetHSL(0, 0, (Math.random() - .5) * .3);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts); bursts.push({ pts, v, life: 0, max: 1.8 });
}
export function updateBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.life += dt;
    const p = b.pts.geometry.attributes.position;
    for (let k = 0; k < b.v.length; k++) {
      b.v[k].multiplyScalar(.965); b.v[k].y -= dt * 1.2;
      p.setXYZ(k, p.getX(k) + b.v[k].x * dt, p.getY(k) + b.v[k].y * dt, p.getZ(k) + b.v[k].z * dt);
    }
    p.needsUpdate = true; b.pts.material.opacity = 1 - b.life / b.max;
    if (b.life >= b.max) { scene.remove(b.pts); disposeObj(b.pts); bursts.splice(i, 1); }
  }
}

export function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < .75 ? 56 : 40; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();
