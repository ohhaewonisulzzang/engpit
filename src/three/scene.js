import * as THREE from 'three';
import { $ } from '../dom.js';
import { V3, std, addBasic, glowTex, makeEnv } from './helpers.js';

/* =========================================================
   메인 3D 씬 (뽑기 머신)
   ========================================================= */
export const stage = $('stage');
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
stage.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b2f33);
scene.fog = new THREE.Fog(0x0b2f33, 16, 34);
scene.environment = makeEnv(renderer);
export const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
export const CAM_HOME = new V3(0, 3.0, 11.2), LOOK_HOME = new V3(0, 2.05, 0);
export const CAM_FOCUS = new V3(0, 3.0, 10.2), LOOK_FOCUS = new V3(0, 2.6, 4);
export const R = new V3(0, 3.0, 5.6); // 무기 공개 위치

scene.add(new THREE.HemisphereLight(0xe6f4f0, 0x0d2e30, .8));
export const key = new THREE.DirectionalLight(0xffffff, 1.7);
key.position.set(4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 8, bottom: -3, near: 1, far: 25 }); key.shadow.bias = -.0005;
scene.add(key);
export const rimL = new THREE.PointLight(0xff3d8b, 40, 16); rimL.position.set(-5, 4, -2); scene.add(rimL);
export const rimR = new THREE.PointLight(0x3dc8ff, 40, 16); rimR.position.set(5, 3, -2); scene.add(rimR);
export const revealLight = new THREE.PointLight(0xffffff, 0, 14); revealLight.position.set(0, 3.2, 8); scene.add(revealLight);

// 바닥 & 배경
export const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), std(0x103c41, { roughness: .9 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
export const floorRing = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.45, 64), addBasic(0xffc83d, .3));
floorRing.rotation.x = -Math.PI / 2; floorRing.position.y = .01; scene.add(floorRing);
{
  const n = 400, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 10; p.set([Math.cos(a) * r, Math.random() * 16 - 1, Math.sin(a) * r - 6], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe8e3, size: .08, opacity: .5, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
}

export function makeCapsule(color, r = .22) {
  const g = new THREE.Group();
  const topM = new THREE.MeshPhysicalMaterial({ color, roughness: .25, clearcoat: 1 });
  const botM = new THREE.MeshPhysicalMaterial({ color: 0xf4f2ff, roughness: .3, clearcoat: 1 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), topM);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), botM);
  const band = new THREE.Mesh(new THREE.TorusGeometry(r, r * .07, 6, 24), botM); band.rotation.x = Math.PI / 2;
  bot.add(band); top.castShadow = bot.castShadow = true;
  g.add(top, bot); g.userData = { top, bot, topM, botM }; return g;
}
export function textTex(draw, w = 512, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const paint = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  paint(); document.fonts?.ready.then(paint); document.fonts?.load('600 92px Fredoka').then(paint);
  return t;
}
