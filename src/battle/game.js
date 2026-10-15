import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { tone, SFX } from '../sound.js';
import { RAR } from '../config.js';
import { WEAPONS } from '../three/weapons.js';
import { sprite } from '../ui/dex.js';
import { curSkin, curTheme, paintHero } from '../shop.js';
import { PRO_GRAD, proYears } from '../titles.js';
import { FX, drawFx } from './fx.js'; // 이펙트 스프라이트 시트 (불러오면 미리 받아 둔다)
import { ARMS, ENEMIES, PERKS, WAVE_LEN, armLevel, lvMult, bossFor, waveHp, waveDmg, galaxyOn, PRO_STAGES, PRO_GOAL, PRO_HP, PRO_DMG } from './data.js';

/* =========================================================
   전투 (탕탕특공대식 핵앤슬래시)
   - 캐릭터는 이동만 하고, 장착한 무기가 알아서 공격한다
   - 웨이브마다 WAVE_LEN초를 버티면 보스가 나오고, 보스를 잡으면 효과를 하나 고른다
   - 적이 떨어뜨린 조각은 바로 내 조각에 더해진다 (행운·기계 업그레이드에 사용)
   - 하드 모드(G.pro = 단계 번호): 높은 웨이브에서 시작하고 적이 더 세며, 조각이 떨어지지 않는다
   ========================================================= */
export const hooks = { hud: null, perk: null, end: null, banner: null, pause: null };
export let G = null;

const cv = $('bcv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, zoom = 1;
function fit() {
  W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
  DPR = Math.min(devicePixelRatio, 2); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  zoom = Math.max(.75, Math.min(1.25, Math.min(W, H) / 560));
}
new ResizeObserver(fit).observe(cv);
const visible = () => cv.offsetParent !== null;

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ---------- 입력: WASD/방향키, 화면을 누르고 끌면 가상 조이스틱 ---------- */
const keys = {};
let joy = null;
addEventListener('keydown', e => {
  if (!visible() || e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (/^Arrow|^Space$/.test(e.code)) e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy = null; setPaused(true); });
cv.addEventListener('pointerdown', e => { joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (joy && joy.id === e.pointerId) { joy.x = e.clientX; joy.y = e.clientY; } });
const endJoy = e => { if (joy && joy.id === e.pointerId) joy = null; };
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);

/* ---------- 판 시작 / 끝 ---------- */
export function startRun(ids, pro = null) {
  const start = pro == null ? 1 : PRO_STAGES[pro].start;
  G = {
    pro, start, t: 0, wave: start, waveT: 0, phase: 'fight', paused: false, clearT: 0,
    p: { x: 0, y: 0, r: 14, hp: 120, maxHp: 120, face: 0, inv: 0, hurt: 0, walk: 0 },
    mods: { atk: 1, haste: 1, speed: 1, area: 1, proj: 0, crit: .05, armor: 0, regen: 0, magnet: 90, greed: 1 },
    perks: {}, enemies: [], shots: [], bullets: [], drops: [], parts: [], texts: [], fx: [], zones: [],
    spawnT: 1, kills: 0, shards: 0, shardAcc: 0, boss: null, shake: 0, regenT: 0, hitSnd: 0, pickSnd: 0,
    cam: { x: 0, y: 0 },
  };
  G.arms = (ids.length ? ids : ['fists']).map(makeArm);
  // 갤럭시 파워 중 캐릭터 전체에 붙는 것 (이동 속도, 재생, 보호막, 반사)
  for (const a of G.arms) {
    const g = a.gp; if (!g) continue;
    if (g.fx === 'swift') G.mods.speed += g.v;
    if (g.fx === 'regen') G.mods.regen += g.v;
    if (g.fx === 'shield') G.shieldPct = Math.max(G.shieldPct || 0, g.v);
    if (g.fx === 'thorns') G.thorns = (G.thorns || 0) + g.v;
  }
  G.shieldT = 0; G.p.shield = 0;
  if (!W) fit();
  waveStart();
  hooks.banner?.(pro == null ? '웨이브 1' : `${PRO_STAGES[pro].name} · 웨이브 ${start}`, pro == null ? '#ffc83d' : '#ff5a1f');
}
function makeArm(id) {
  const w = WEAPONS.find(x => x.id === id);
  return {
    id, w, d: ARMS[id], lv: w ? armLevel(id) : 1,
    col: w ? RAR[w.r].color : '#f3efe6', img: w ? sprite(w) : null,
    cd: Math.random() * .4, ang: Math.random() * TAU, hits: new WeakMap(), gp: galaxyOn(id),
  };
}
// 무기별 능력치: 웨이브 효과에 그 무기의 갤럭시 파워를 더한 것
function modsFor(a) {
  const m = G.mods, g = a.gp; if (!g) return m;
  const f = g.fx, v = g.v;
  return { ...m,
    atk: m.atk * (f === 'power' ? 1 + v : 1), area: m.area * (f === 'reach' ? 1 + v : 1),
    haste: m.haste * (f === 'quick' ? 1 + v : 1), proj: m.proj + (f === 'multi' ? v : 0), crit: m.crit + (f === 'crit' ? v : 0) };
}
export function setPaused(v) {
  if (!G || !['fight', 'boss', 'clear'].includes(G.phase) || G.paused === v) return;
  G.paused = v; joy = null;
  if (v) save();
  hooks.pause?.(v);
}
export const togglePause = () => G && setPaused(!G.paused);
export function quitRun() { if (G && G.phase !== 'over') gameOver(true); }
export function clearRun() { G = null; }

function gameOver(gaveUp) {
  G.phase = 'over'; G.paused = false;
  const p = G.p;
  if (!gaveUp) { puff(p.x, p.y, '#ff6b6b', 60, 260); SFX.fanfare(0); }
  // 일반 전투와 하드 모드는 최고 기록을 따로 적는다
  const key = G.pro == null ? 'best' : 'proBest', best = state[key] || { wave: 0, kills: 0 };
  const rec = G.wave > best.wave || (G.wave === best.wave && G.kills > best.kills);
  if (rec) state[key] = { wave: G.wave, kills: G.kills };
  save();
  const sum = { wave: G.wave, kills: G.kills, shards: G.shards, time: G.t, rec, gaveUp, pro: G.pro, cleared: !!G.proCleared };
  setTimeout(() => hooks.end?.(sum), gaveUp ? 0 : 1300);
}

/* ---------- 웨이브 효과 ---------- */
export function rollPerks() {
  const pool = PERKS.filter(k => (G.perks[k.id] || 0) < k.max && !(k.id === 'heal' && G.p.hp >= G.p.maxHp) && !(k.id === 'greed' && G.pro != null));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
export function choosePerk(id) {
  if (!G || G.phase !== 'perk') return;
  const m = G.mods, p = G.p;
  G.perks[id] = (G.perks[id] || 0) + 1;
  ({
    atk: () => m.atk += .2, haste: () => m.haste += .15, speed: () => m.speed += .12,
    hp: () => { p.maxHp += 25; p.hp += 25; }, proj: () => m.proj++, area: () => m.area += .15,
    crit: () => m.crit += .1, armor: () => m.armor += 2, regen: () => m.regen++,
    magnet: () => m.magnet *= 1.5, greed: () => m.greed += .25, heal: () => p.hp = p.maxHp,
  })[id]();
  G.wave++; G.waveT = 0; G.phase = 'fight'; G.spawnT = 1.5;
  waveStart();
  p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .25);
  SFX.up(2);
  hooks.banner?.(`웨이브 ${G.wave}`, '#ffc83d');
}

/* ---------- 적 ---------- */
const proK = k => G.pro == null ? 1 : k; // 하드 모드에서만 곱하는 배율
function spawnEnemy(type, x, y) {
  const b = ENEMIES[type], hk = waveHp(G.wave) * proK(PRO_HP);
  const e = { ...b, type, look: type, x, y, hp: b.hp * hk, maxHp: b.hp * hk, dmg: b.dmg * waveDmg(G.wave) * proK(PRO_DMG), kx: 0, ky: 0, flash: 0, ph: Math.random() * TAU, shootT: rand(1, 2.5) };
  G.enemies.push(e); return e;
}
const viewR = () => Math.hypot(W, H) / 2 / zoom;
// 화면 테두리 바로 바깥의 아무 곳
function edgePoint() {
  const hw = W / 2 / zoom + 40, hh = H / 2 / zoom + 40, side = Math.random() < .5 ? -1 : 1;
  return Math.random() < hw / (hw + hh) ? [G.p.x + rand(-hw, hw), G.p.y + side * hh] : [G.p.x + side * hw, G.p.y + rand(-hh, hh)];
}
const spawnAround = type => spawnEnemy(type, ...edgePoint());
const waveStart = () => { for (let i = 0; i < 4 + G.wave; i++) spawnAround(pickType()); };
function pickType() {
  const pool = Object.entries(ENEMIES).filter(([, e]) => e.from <= G.wave);
  let r = Math.random() * pool.reduce((s, [, e]) => s + e.w, 0);
  for (const [k, e] of pool) { r -= e.w; if (r < 0) return k; }
  return 'slime';
}
function spawnBoss() {
  const b = bossFor(G.wave), a = Math.random() * TAU, d = viewR() * .8;
  const e = { ...b, type: 'boss', boss: true, x: G.p.x + Math.cos(a) * d, y: G.p.y + Math.sin(a) * d,
    hp: b.hp * proK(PRO_HP), maxHp: b.hp * proK(PRO_HP), dmg: b.dmg * proK(PRO_DMG), kx: 0, ky: 0, flash: 0, ph: 0, z: 0, patT: 2.5, pat: 0, act: null };
  G.enemies.push(e); G.boss = e; G.phase = 'boss';
  hooks.banner?.(`보스 등장! ${b.name}`, b.col);
  SFX.charge(1.2); G.shake = .5;
}
function fireBullet(x, y, ang, sp, dmg, col, arrow) {
  G.bullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: arrow ? 5 : 7, dmg, col, arrow, life: 5 });
}
const MINION = { slime: 'slime', skeleton: 'skeleton', ghost: 'ghost', golem: 'skeleton', dragon: 'bomber' };
function updateBoss(e, dt) {
  const p = G.p, aim = Math.atan2(p.y - e.y, p.x - e.x);
  const A = e.act;
  if (!A) {
    const spd = e.spd * (e.slowT > 0 ? .7 : 1);
    e.x += Math.cos(aim) * spd * dt; e.y += Math.sin(aim) * spd * dt;
    e.patT -= dt;
    if (e.patT <= 0) {
      e.act = { type: e.pats[e.pat++ % e.pats.length], t: 0, a: aim, sx: e.x, sy: e.y, tx: p.x, ty: p.y, n: 0 };
      e.patT = Math.max(1.4, 3 - e.round * .4);
    }
    return;
  }
  A.t += dt;
  switch (A.type) {
    case 'dash': // 0.7초 경고선 → 빠르게 돌진
      if (A.t < .7) A.a = aim;
      else if (A.t < 1.25) { e.x += Math.cos(A.a) * 580 * dt; e.y += Math.sin(A.a) * 580 * dt; if (Math.random() < .5) puff(e.x, e.y, e.col, 2, 60); }
      else e.act = null;
      break;
    case 'jump': { // 높이 뛰어서 표시된 곳에 쿵
      const u = Math.min(A.t / .9, 1);
      e.x = A.sx + (A.tx - A.sx) * u; e.y = A.sy + (A.ty - A.sy) * u; e.z = Math.sin(u * Math.PI) * 140;
      if (u >= 1) {
        e.z = 0; e.act = null; G.shake = .5; tone(90, .3, 'sine', .25, 0, 40);
        ring(e.x, e.y, 20, 110, '#ffffff', .4);
        if (Math.hypot(p.x - e.x, p.y - e.y) < 110 + p.r) hitPlayer(e.dmg);
        for (let i = 0; i < 2 + e.round; i++) spawnEnemy('slime', e.x + rand(-60, 60), e.y + rand(-60, 60));
      }
      break;
    }
    case 'ring': // 사방으로 탄막 두 번
      while (A.n < 2 && A.t >= A.n * .5) {
        const n = 16 + e.round * 4, off = A.n * Math.PI / n;
        for (let i = 0; i < n; i++) fireBullet(e.x, e.y, off + i / n * TAU, 170, e.dmg * .6, e.col);
        A.n++; tone(600, .1, 'triangle', .04, 0, 300);
      }
      if (A.t > .7) e.act = null;
      break;
    case 'spread': // 나를 향해 부채꼴로 세 번
      while (A.n < 3 && A.t >= A.n * .35) {
        for (let i = -2; i <= 2; i++) fireBullet(e.x, e.y, aim + i * .22, 240, e.dmg * .6, e.look === 'dragon' ? '#ff8a3d' : e.col);
        A.n++; tone(420, .08, 'square', .04);
      }
      if (A.t > .9) e.act = null;
      break;
    case 'summon':
      for (let i = 0, n = 4 + e.round * 2; i < n; i++) {
        const a = i / n * TAU, x = e.x + Math.cos(a) * 70, y = e.y + Math.sin(a) * 70;
        spawnEnemy(MINION[e.look], x, y); fxSprite('darkBolt', x, y + 10, 1.6, { rate: 1.6, ground: true });
      }
      ring(e.x, e.y, 10, 90, e.col, .35); e.act = null;
      break;
    case 'slam': // 1초 경고 원 → 내려찍기
      if (A.t >= 1 && !A.n) {
        A.n = 1; G.shake = .6; tone(70, .4, 'sine', .3, 0, 30);
        ring(e.x, e.y, 30, 170, '#ffc83d', .5);
        if (Math.hypot(p.x - e.x, p.y - e.y) < 160 + p.r) hitPlayer(e.dmg * 1.2);
      }
      if (A.t > 1.2) e.act = null;
      break;
  }
}

/* ---------- 데미지 ---------- */
function hurt(e, v, crit, kx = 0, ky = 0) {
  if (e.dead) return;
  e.hp -= v; e.flash = .08;
  const res = e.boss ? .1 : e.heavy ? .35 : 1;
  e.kx += kx * res; e.ky += ky * res;
  text(e.x, e.y - e.r - (e.z || 0), Math.round(v), crit ? '#ffc83d' : '#ffffff', crit);
  if (G.hitSnd <= 0) { tone(160 + Math.random() * 90, .05, 'square', .03); G.hitSnd = .06; }
  if (e.hp <= 0) kill(e);
}
function strike(e, a, kx, ky) {
  const m = modsFor(a), g = a.gp, crit = Math.random() < m.crit;
  if (a.d.slow) e.slowT = 1.5;
  let v = a.d.dmg * lvMult(a.lv) * m.atk * (crit ? 2 : 1);
  if (g) { // 갤럭시 파워: 맞을 때 효과
    if (g.fx === 'execute' && e.hp < e.maxHp * .4) v *= 1 + g.v;
    if (g.fx === 'burn') { e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, v * g.v / 2); e.burnT = 2; }
    if (g.fx === 'slow') e.slowT = 1.5;
    if (g.fx === 'stun' && Math.random() < g.v) e.stunT = .6;
    if (g.fx === 'leech') G.p.hp = Math.min(G.p.maxHp, G.p.hp + v * g.v * .25);
  }
  hurt(e, v, crit, kx, ky);
}
function kill(e) {
  e.dead = true; G.kills++;
  puff(e.x, e.y, e.col, e.boss ? 80 : 10, e.boss ? 320 : 140);
  const pro = G.pro != null; // 하드 모드는 조각이 안 떨어진다
  if (e.boss) {
    const n = pro ? 0 : 10 + G.wave * 4;
    for (let i = 0; i < n; i++) drop(e.x, e.y, 'shard', 1, 260);
    drop(e.x, e.y, 'heart', 0, 120);
    fxSprite('arcaneBurst', e.x, e.y, e.r / 30);
    G.boss = null; startClear();
  } else if (!pro && Math.random() < e.drop) drop(e.x, e.y, 'shard', 1, 80);
  else if (Math.random() < .015) drop(e.x, e.y, 'heart', 0, 60);
}
function hitPlayer(v, src) {
  const p = G.p;
  if (p.inv > 0 || G.phase === 'over' || G.phase === 'clear') return;
  v = Math.max(1, v - G.mods.armor);
  if (G.thorns && src && !src.dead) hurt(src, v * G.thorns * 3, false); // 갤럭시 파워: 반사
  if (p.shield > 0) { const s = Math.min(p.shield, v); p.shield -= s; v -= s; if (v <= 0) { p.inv = .6; text(p.x, p.y - 24, '막음', '#8adfff'); return; } }
  p.hp -= v; p.inv = .6; p.hurt = .25; G.shake = Math.max(G.shake, .25);
  text(p.x, p.y - 24, Math.round(v), '#ff6b6b');
  tone(150, .18, 'sawtooth', .07, 0, 70);
  if (p.hp <= 0) { p.hp = 0; gameOver(false); }
}
function explode(x, y, a) {
  const R = a.d.explode * modsFor(a).area;
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < R + e.r) strike(e, a, 0, 0);
  ring(x, y, 10, R, '#ff8a3d', .3); puff(x, y, '#ffb020', 14, 160); fxSprite('explosionPop', x, y, R / 20);
  tone(120, .15, 'sawtooth', .04, 0, 60);
}
function startClear() {
  G.phase = 'clear'; G.clearT = 0;
  for (const e of G.enemies) if (!e.dead) { e.dead = true; puff(e.x, e.y, e.col, 6, 100); }
  G.bullets.length = 0;
  // 하드 모드: 시작 웨이브부터 PRO_GOAL개를 깨면 단계 클리어, 다음 단계가 열린다
  const st = PRO_STAGES[G.pro];
  if (st && !G.proCleared && G.wave - G.start + 1 >= PRO_GOAL) {
    G.proCleared = true;
    state.proClear = Math.max(state.proClear || 0, G.pro + 1);
    hooks.banner?.(`${st.name} 클리어!${PRO_STAGES[G.pro + 1] ? ' 다음 단계가 열렸어요' : ''}`, '#ff5a1f');
  } else hooks.banner?.(`웨이브 ${G.wave} 클리어!`, '#4fd18b');
  // 지옥 스킨: 1등 한 해 숫자가 몸 주위를 돌다가 흡수되는 마무리 모션
  const year = proYears().at(-1);
  G.finale = curSkin().finale && year ? { t: 0, text: year, done: false } : null;
  SFX.fanfare(3); save();
}

/* ---------- 마무리 모션 (지옥 스킨) ----------
   0 ~ FIN_SPIN초: 흰 숫자가 나타나며 칭호 그라데이션 색으로 바뀌고 캐릭터 주위를 원으로 천천히 돈다
   FIN_SPIN ~ +FIN_ABS초: 점점 빨리 돌며 몸으로 빨려 들어가 사라지고, 흡수되는 순간 빛이 터진다 */
const FIN_SPIN = 2, FIN_ABS = .8, FIN_R = 50;
const FIN_SLOW = .35, FIN_BOOST = 1.6; // 도는 동안 초당 바퀴 수, 흡수하는 동안 더 도는 바퀴 수
// 시간 t까지 돈 각도: 처음엔 일정하게 천천히, 흡수 구간에서는 u³으로 가속 (이어지는 순간 속도가 튀지 않음)
const finAngle = t => {
  const u = Math.max(0, t - FIN_SPIN) / FIN_ABS;
  return TAU * (FIN_SLOW * t + FIN_BOOST * u * u * u);
};
const finaleBusy = () => G.finale && G.finale.t < FIN_SPIN + FIN_ABS;
// 칭호 그라데이션(PRO_GRAD)에서 u(0~1, 반복) 위치의 색
function gradAt(u) {
  const n = PRO_GRAD.length - 1, x = (((u % 1) + 1) % 1) * n, i = Math.floor(x), f = x - i;
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const a = hex(PRO_GRAD[i]), b = hex(PRO_GRAD[i + 1]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}
function updateFinale(dt) {
  const f = G.finale; if (!f) return;
  f.t += dt;
  if (!f.done && f.t >= FIN_SPIN + FIN_ABS) { // 흡수 완료
    f.done = true;
    const p = G.p;
    ring(p.x, p.y, 4, 70, '#ffb020', .45); ring(p.x, p.y, 4, 46, '#ff5a1f', .3);
    for (let i = 0; i < 26; i++) puff(p.x, p.y, gradAt(i / 26), 1, 260);
    G.shake = Math.max(G.shake, .2); SFX.up(3);
  }
}
function drawFinale() {
  const f = G.finale; if (!f || f.t >= FIN_SPIN + FIN_ABS) return;
  const p = G.p, chars = (f.text + ' ' + f.text + ' ').split(''); // 해를 두 번 써서 원을 채운다
  const absorb = Math.max(0, f.t - FIN_SPIN) / FIN_ABS, ein = absorb * absorb; // 흡수 진행 (빨라지며 빨려 들어감)
  const appear = Math.min(1, f.t / .18), gold = Math.min(1, f.t / .35); // 나타나기, 흰색 → 그라데이션
  const R = FIN_R * (1 - ein) * (.6 + .4 * easeOut(appear)), spin = finAngle(f.t);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.font = `700 ${Math.round(20 * (1 - ein * .7))}px Fredoka, Pretendard, sans-serif`;
  chars.forEach((ch, i) => {
    if (ch === ' ') return;
    const a = spin + i / chars.length * TAU, x = p.x + Math.cos(a) * R, y = p.y - 4 + Math.sin(a) * R; // 찌그러지지 않은 원
    const col = gradAt(i / chars.length + G.t * .6);
    ctx.save(); ctx.translate(x, y); // 글자는 똑바로 세운 채 원을 따라 돈다
    ctx.globalAlpha = appear * (1 - ein * .85);
    ctx.shadowColor = col; ctx.shadowBlur = 12 * gold;
    ctx.strokeStyle = 'rgba(40,8,4,.75)'; ctx.lineWidth = 3; ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = col; ctx.fillText(ch, 0, 0);
    if (gold < 1) { ctx.globalAlpha *= 1 - gold; ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(ch, 0, 0); }
    ctx.restore();
  });
  ctx.restore();
}

/* ---------- 무기 ---------- */
function nearest(maxD) {
  const p = G.p; let best = null, bd = maxD * maxD;
  for (const e of G.enemies) { if (e.dead) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function shoot(a, ang, o = {}) {
  const d = a.d;
  G.shots.push({ a, x: G.p.x, y: G.p.y, vx: Math.cos(ang) * d.speed, vy: Math.sin(ang) * d.speed, t: 0,
    life: o.life ?? (d.boomerang ? 2.2 : 1.4), pierce: o.pierce ?? d.pierce, hit: new Set(), r: d.size * .4 * modsFor(a).area });
}
function updateArm(a, dt) {
  const d = a.d, p = G.p, m = modsFor(a);
  if (d.kind === 'orbit') {
    const n = d.count + m.proj, R = d.radius * m.area, hr = d.size * .35 * m.area;
    a.ang += d.spin * m.haste * dt;
    for (let i = 0; i < n; i++) {
      const an = a.ang + i / n * TAU, x = p.x + Math.cos(an) * R, y = p.y + Math.sin(an) * R;
      for (const e of G.enemies) {
        if (e.dead || (e.x - x) ** 2 + (e.y - y) ** 2 > (e.r + hr) ** 2) continue;
        if (G.t - (a.hits.get(e) ?? -9) < .4) continue;
        a.hits.set(e, G.t);
        const k = Math.atan2(e.y - p.y, e.x - p.x);
        strike(e, a, Math.cos(k) * 120, Math.sin(k) * 120);
      }
    }
    return;
  }
  a.cd -= dt * m.haste;
  if (a.cd > 0) return;
  if (d.kind === 'swing' || d.kind === 'spin') {
    const reach = d.reach * m.area, t = nearest(reach + 50);
    if (!t) { a.cd = .1; return; } // 가까이 적이 올 때까지 기다림
    a.cd = d.cd;
    const ang = Math.atan2(t.y - p.y, t.x - p.x), spin = d.kind === 'spin', arc = spin ? TAU : d.arc * Math.PI / 180;
    G.fx.push({ type: 'swing', a, ang, arc, reach, spin, t: 0, dur: spin ? .32 : .2, dir: Math.random() < .5 ? 1 : -1 });
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > reach + e.r) continue;
      if (!spin && Math.abs(angDiff(Math.atan2(dy, dx), ang)) > arc / 2 + e.r / dd) continue;
      const k = d.pull ? -Math.min(dd * 4, 260) : d.knock;
      strike(e, a, dx / dd * k, dy / dd * k);
    }
    tone(spin ? 300 : 520, .09, 'triangle', .03, 0, spin ? 900 : 200);
    if (d.pull) ring(p.x, p.y, reach, 20, '#b45cff', .35);
  } else if (d.kind === 'shot') {
    const t = nearest(520);
    if (!t) { a.cd = .15; return; }
    a.cd = d.cd;
    const n = (d.count || 1) + m.proj, base = Math.atan2(t.y - p.y, t.x - p.x);
    for (let i = 0; i < n; i++) shoot(a, base + (i - (n - 1) / 2) * .16);
    tone(700, .05, 'triangle', .02, 0, 1100);
  } else if (d.kind === 'nova') {
    if (!nearest(600)) { a.cd = .2; return; }
    a.cd = d.cd;
    const n = d.count + m.proj * 2, off = Math.random() * TAU;
    for (let i = 0; i < n; i++) shoot(a, off + i / n * TAU, { life: .9, pierce: 99 });
    tone(880, .25, 'sine', .04, 0, 1760);
  } else if (d.kind === 'thrust') { // 앞으로 길게 찔러서 한 줄을 전부 맞힘
    const reach = d.reach * m.area, w = d.width * m.area, t = nearest(reach + 30);
    if (!t) { a.cd = .1; return; }
    a.cd = d.cd;
    const ang = Math.atan2(t.y - p.y, t.x - p.x), c = Math.cos(ang), s = Math.sin(ang);
    G.fx.push({ type: 'thrust', a, ang, reach, t: 0, dur: .24 });
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, along = dx * c + dy * s, perp = Math.abs(-dx * s + dy * c);
      if (along > -e.r && along < reach + e.r && perp < w + e.r) strike(e, a, c * 140, s * 140);
    }
    tone(380, .08, 'triangle', .03, 0, 900);
  } else if (d.kind === 'bolt') { // 근처 적 몇 마리에게 번개
    const R2 = d.range ** 2, near = G.enemies.filter(e => !e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < R2);
    if (!near.length) { a.cd = .2; return; }
    a.cd = d.cd;
    for (let i = 0, n = d.count + m.proj; i < n && near.length; i++) {
      const e = near.splice(Math.floor(Math.random() * near.length), 1)[0], sr = d.splash * m.area;
      if (d.strike) fxSprite(d.strike, e.x, e.y + e.r * .5, d.strike === 'lightning' ? 1.6 : .8, { rate: 2, ground: true });
      else G.fx.push({ type: 'bolt', x: e.x, y: e.y, t: 0, dur: .28, seed: Math.random() * 99, col: d.col });
      for (const o of G.enemies) if (!o.dead && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < (sr + o.r) ** 2) strike(o, a, 0, 0);
      puff(e.x, e.y, '#cff4ff', 8, 140);
    }
    G.shake = Math.max(G.shake, .12);
    tone(1800, .18, 'sawtooth', .04, 0, 200);
  } else if (d.kind === 'zone') { // 적 근처에 블랙홀을 열어 빨아들이며 계속 피해
    const t = nearest(460);
    if (!t) { a.cd = .3; return; }
    a.cd = d.cd;
    G.zones.push({ a, x: t.x, y: t.y, r: d.radius * m.area, t: 0, tick: 0 });
    tone(90, .8, 'sine', .08, 0, 40);
  }
}
function updateZones(dt) {
  for (const z of G.zones) {
    z.t += dt; z.tick -= dt;
    const hit = z.tick <= 0; if (hit) z.tick = .3;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (d > z.r * 1.7) continue;
      if (!e.boss) { e.x += dx / d * Math.min(d, 110 * dt); e.y += dy / d * Math.min(d, 110 * dt); }
      if (hit && d < z.r + e.r) strike(e, z.a, 0, 0);
    }
  }
  G.zones = G.zones.filter(z => z.t < z.a.d.life);
}
function updateShots(dt) {
  const p = G.p;
  for (const s of G.shots) {
    const d = s.a.d;
    s.t += dt; s.life -= dt;
    if (d.curve) { const c = Math.cos(d.curve * dt), sn = Math.sin(d.curve * dt); [s.vx, s.vy] = [s.vx * c - s.vy * sn, s.vx * sn + s.vy * c]; }
    if (d.boomerang && s.t > .55) { // 돌아오는 도끼
      const dx = p.x - s.x, dy = p.y - s.y, dd = Math.hypot(dx, dy) || 1;
      s.vx += (dx / dd * d.speed * 1.3 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / dd * d.speed * 1.3 - s.vy) * Math.min(1, dt * 6);
      if (dd < 24) s.life = 0;
      if (s.t > .55 && !s.back) { s.back = true; s.hit.clear(); }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (d.fire && Math.random() < .6) G.parts.push({ x: s.x, y: s.y, vx: rand(-20, 20), vy: rand(-20, 20), life: .3, max: .3, col: '#ffb020', r: 4 });
    for (const e of G.enemies) {
      if (e.dead || s.hit.has(e) || (e.x - s.x) ** 2 + (e.y - s.y) ** 2 > (e.r + s.r) ** 2) continue;
      if (d.explode) { explode(s.x, s.y, s.a); s.life = 0; break; }
      s.hit.add(e);
      const sp = Math.hypot(s.vx, s.vy) || 1;
      strike(e, s.a, s.vx / sp * 90, s.vy / sp * 90);
      if (--s.pierce < 0) { s.life = 0; break; }
    }
  }
  G.shots = G.shots.filter(s => s.life > 0);
}

/* ---------- 이펙트 ---------- */
function puff(x, y, col, n, sp) {
  for (let i = 0; i < n && G.parts.length < 500; i++) {
    const a = Math.random() * TAU, v = sp * (.3 + Math.random() * .7);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.3, .7), max: .7, col, r: rand(2, 4.5) });
  }
}
const ring = (x, y, r0, r1, col, dur) => G.fx.push({ type: 'ring', x, y, r0, r1, col, t: 0, dur });
// 이펙트 스프라이트 한 번 재생. rate: 재생 속도 배율, ground: (x, y)가 그림 아래쪽 끝 (번개처럼 땅에 내리꽂히는 것)
function fxSprite(key, x, y, scale = 1, { rate = 1, ground = false } = {}) {
  if (G.fx.length > 160) return;
  const f = FX[key];
  G.fx.push({ type: 'sprite', key, x, y: ground ? y - f.fh * scale / 2 : y, scale, rate, t: 0, dur: f.n / f.fps / rate });
}
function text(x, y, v, col, big) { if (G.texts.length < 70) G.texts.push({ x: x + rand(-8, 8), y, v, col, big, t: 0 }); }
function drop(x, y, kind, v, sp) {
  const a = Math.random() * TAU, s = sp * (.3 + Math.random() * .7);
  G.drops.push({ x, y, kind, v, vx: Math.cos(a) * s, vy: Math.sin(a) * s, pull: false, sp: 0, ph: Math.random() * TAU });
}

/* ---------- 업데이트 ---------- */
function update(dt) {
  const p = G.p, m = G.mods;
  G.t += dt; G.hitSnd -= dt; G.pickSnd -= dt;

  // 이동
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (joy) { const dx = joy.x - joy.x0, dy = joy.y - joy.y0, d = Math.hypot(dx, dy); if (d > 6) { mx = dx / Math.max(d, 46); my = dy / Math.max(d, 46); } }
  const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
  p.x += mx * 160 * m.speed * dt; p.y += my * 160 * m.speed * dt;
  if (l > .1) { p.face = Math.atan2(my, mx); p.walk += dt * 12; }
  p.inv -= dt; p.hurt -= dt;
  if (m.regen) { G.regenT += dt; if (G.regenT >= 1) { G.regenT -= 1; p.hp = Math.min(p.maxHp, p.hp + m.regen); } }
  if (G.shieldPct) { G.shieldT -= dt; if (G.shieldT <= 0) { G.shieldT = 8; p.shield = Math.max(p.shield, p.maxHp * G.shieldPct); } }

  // 웨이브 진행
  if (G.phase === 'fight') { G.waveT += dt; if (G.waveT >= WAVE_LEN) spawnBoss(); }
  if (G.phase === 'fight' || G.phase === 'boss') {
    G.spawnT -= dt * (G.phase === 'boss' ? .25 : 1);
    if (G.spawnT <= 0 && G.enemies.length < 240) {
      G.spawnT = Math.max(.15, 1.15 - G.wave * .1 - G.waveT / WAVE_LEN * .4);
      const n = 1 + Math.floor(G.wave / 3) + (Math.random() < G.waveT / WAVE_LEN * .6 ? 1 : 0);
      for (let i = 0; i < n; i++) spawnAround(pickType());
    }
  }
  if (G.phase === 'clear') {
    G.clearT += dt;
    G.drops.forEach(o => o.pull = true);
    updateFinale(dt);
    if (finaleBusy()) {} // 마무리 모션이 끝난 뒤에 효과를 고른다
    else if (G.clearT > 2 && !G.drops.length || G.clearT > 4) { G.phase = 'perk'; hooks.perk?.(rollPerks()); }
  }

  // 무기
  G.arms.forEach(a => updateArm(a, dt));
  updateShots(dt);
  updateZones(dt);

  // 적
  const far = viewR() * 1.7;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.burnT > 0) { // 갤럭시 파워: 불·독
      e.burnT -= dt; e.hp -= e.burnDps * dt; e.burnTick = (e.burnTick || 0) - dt;
      if (e.burnTick <= 0) { e.burnTick = .5; text(e.x, e.y - e.r, Math.round(e.burnDps / 2), '#ff9a3d'); }
      if (e.hp <= 0) { kill(e); continue; }
    }
    if (e.stunT > 0) { e.stunT -= dt; e.flash -= dt; continue; }
    if (e.boss) updateBoss(e, dt);
    else {
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (d > far) { [e.x, e.y] = edgePoint(); continue; } // 너무 멀어진 적은 화면 근처로 다시
      const spd = e.spd * (e.slowT > 0 ? .45 : 1);
      let vx = dx / d * spd, vy = dy / d * spd;
      if (e.zig) { const s = Math.sin(G.t * 6 + e.ph) * e.spd * .8; vx += -dy / d * s; vy += dx / d * s; }
      if (e.wobble) { const s = Math.sin(G.t * 2 + e.ph) * e.spd * .6; vx += -dy / d * s; vy += dx / d * s; }
      if (e.ranged) {
        if (d < 230) { vx *= -.6; vy *= -.6; }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 430) { e.shootT = rand(2, 3.2); fireBullet(e.x, e.y, Math.atan2(dy, dx), 220, e.dmg, '#c9f27a', true); }
      }
      if (e.bomb && d < e.r + p.r + 16) {
        e.dead = true; ring(e.x, e.y, 10, 70, '#ff8a3d', .3); puff(e.x, e.y, '#ffb020', 20, 200); fxSprite('explosionPop', e.x, e.y, 3.2);
        tone(100, .25, 'sawtooth', .07, 0, 40); G.shake = .3;
        if (d < 70) hitPlayer(e.dmg);
        continue;
      }
      e.x += vx * dt; e.y += vy * dt;
    }
    e.x += e.kx * dt; e.y += e.ky * dt;
    const decay = Math.max(0, 1 - dt * 9); e.kx *= decay; e.ky *= decay;
    e.flash -= dt; e.slowT -= dt;
    if (!(e.z > 20) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + p.r - 3) ** 2) hitPlayer(e.dmg, e);
  }
  // 적끼리 밀어내기
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) {
    const a = es[i]; if (a.dead) continue;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j]; if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d = Math.hypot(dx, dy) || .01, o = (rr - d) * .5; if (o <= 0) continue;
      const wa = a.boss ? 0 : b.boss ? 1 : .5, wb = 1 - wa;
      a.x -= dx / d * o * wa * 2; a.y -= dy / d * o * wa * 2;
      b.x += dx / d * o * wb * 2; b.y += dy / d * o * wb * 2;
    }
  }
  G.enemies = es.filter(e => !e.dead);

  // 적 탄
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + p.r - 2) ** 2) { hitPlayer(b.dmg); b.life = 0; }
  }
  G.bullets = G.bullets.filter(b => b.life > 0);

  // 아이템
  for (const o of G.drops) {
    const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
    if (o.pull || d < m.magnet) { o.pull = true; o.sp += 1100 * dt; o.x += dx / d * o.sp * dt; o.y += dy / d * o.sp * dt; }
    else { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= .9; o.vy *= .9; }
    if (d < p.r + 10) {
      o.got = true;
      if (o.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 20); text(p.x, p.y - 26, '+20', '#4fd18b'); SFX.coin(); fxSprite('leafPoof', p.x, p.y - 4, 2); }
      else {
        G.shardAcc += o.v * m.greed; const n = Math.floor(G.shardAcc); G.shardAcc -= n;
        G.shards += n; state.shards += n;
        if (G.pickSnd <= 0) { tone(1200 + Math.random() * 300, .06, 'triangle', .04); G.pickSnd = .05; }
      }
    }
  }
  G.drops = G.drops.filter(o => !o.got);
  updateFx(dt);
}
function updateFx(dt) {
  for (const o of G.parts) { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= .92; o.vy *= .92; o.life -= dt; }
  G.parts = G.parts.filter(o => o.life > 0);
  for (const o of G.texts) { o.t += dt; o.y -= dt * 40; }
  G.texts = G.texts.filter(o => o.t < .7);
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.dur);
  G.shake = Math.max(0, G.shake - dt);
}

/* ---------- 그리기 ---------- */
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function drawGround(cx, cy) {
  const th = curTheme(), T = 80, hw = W / 2 / zoom, hh = H / 2 / zoom;
  const x0 = Math.floor((cx - hw) / T) - 1, x1 = Math.ceil((cx + hw) / T), y0 = Math.floor((cy - hh) / T) - 1, y1 = Math.ceil((cy + hh) / T);
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
    ctx.fillStyle = (i + j) & 1 ? th.a : th.b; ctx.fillRect(i * T, j * T, T + .5, T + .5);
    const h = hash(i, j), x = i * T + 10 + hash(j, i) * 60, y = j * T + 10 + h * 60;
    if (h < .1) { ctx.fillStyle = th.spot; ctx.beginPath(); ctx.ellipse(x, y, 7, 4.5, 0, 0, TAU); ctx.fill(); }
    else if (h < .2) { ctx.strokeStyle = th.grass; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 7, y - 8); ctx.moveTo(x, y); ctx.lineTo(x, y - 10); ctx.moveTo(x + 5, y); ctx.lineTo(x + 7, y - 8); ctx.stroke(); }
    else if (h < .23) { ctx.fillStyle = th.spark; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
  }
}
function circle(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function shadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * .4, 0, 0, TAU); ctx.fill(); }
function eyes(r, ang, white = '#fff', pupil = '#14161c', dy = -r * .15) {
  const ox = Math.cos(ang) * r * .12, oy = Math.sin(ang) * r * .1;
  for (const s of [-1, 1]) {
    circle(s * r * .36 + ox, dy + oy, r * .24, white);
    circle(s * r * .36 + ox * 2, dy + oy * 2, r * .12, pupil);
  }
}
function drawEnemy(e) {
  const r = e.r, z = e.z || 0, fl = e.flash > 0 && !e.boss, col = fl ? '#ffffff' : e.col, t = G.t + e.ph;
  const look = Math.atan2(G.p.y - e.y, G.p.x - e.x);
  shadow(e.x, e.y + r * .8, r * (z > 0 ? Math.max(.4, 1 - z / 200) : 1));
  ctx.save(); ctx.translate(e.x, e.y - z);
  switch (e.look) {
    case 'slime': {
      const sq = 1 + Math.sin(t * 6) * .08;
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, r * .3, r * 1.1 / sq, r * sq, 0, Math.PI, 0); ctx.lineTo(r * 1.1 / sq, r * .3); ctx.quadraticCurveTo(0, r * .75, -r * 1.1 / sq, r * .3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * .4, -r * .35, r * .22, r * .14, -.5, 0, TAU); ctx.fill();
      eyes(r, look); break;
    }
    case 'bat': {
      const f = Math.sin(t * 22) * .6;
      ctx.fillStyle = fl ? '#fff' : '#6b2fa0';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * r * 2.2, -r * (.6 + f)); ctx.lineTo(s * r * 1.6, r * .2); ctx.lineTo(s * r * 1.1, -r * .1); ctx.closePath(); ctx.fill(); }
      circle(0, 0, r, col); eyes(r, look, '#ffe14a', '#3a0a3a'); break;
    }
    case 'skeleton': {
      circle(0, 0, r, col);
      ctx.fillStyle = fl ? '#fff' : '#cfc8b4'; ctx.fillRect(-r * .55, r * .5, r * 1.1, r * .45);
      circle(-r * .38, -r * .1, r * .28, '#1b1b22'); circle(r * .38, -r * .1, r * .28, '#1b1b22');
      circle(-r * .38, -r * .1, r * .08, '#ff5a72'); circle(r * .38, -r * .1, r * .08, '#ff5a72'); break;
    }
    case 'ghost': {
      ctx.globalAlpha = .82; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -r * .1, r, Math.PI, 0);
      for (let i = 0; i <= 4; i++) ctx.lineTo(r - i * r * .5, r * .9 + (i % 2 ? -1 : 1) * r * .18 * Math.sin(t * 6 + i));
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      circle(-r * .35, -r * .2, r * .17, '#1b2a44'); circle(r * .35, -r * .2, r * .17, '#1b2a44'); break;
    }
    case 'archer': {
      ctx.fillStyle = col;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * .6, -r * .5); ctx.lineTo(s * r * 1.5, -r * .9); ctx.lineTo(s * r * .8, -r * .05); ctx.fill(); }
      circle(0, 0, r, col);
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(Math.cos(look) * r * .6, Math.sin(look) * r * .6, r * .9, look - 1.1, look + 1.1); ctx.stroke();
      eyes(r, look, '#ffe14a'); break;
    }
    case 'bomber': {
      circle(0, 0, r, col);
      ctx.strokeStyle = '#c9a36a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * .4, -r * 1.5, r * .2, -r * 1.7); ctx.stroke();
      circle(r * .2, -r * 1.7, 3 + Math.random() * 3, Math.random() < .5 ? '#ffc83d' : '#ff6a3d');
      eyes(r, look, '#ff6a3d', '#2a0a00'); break;
    }
    case 'golem': {
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-r, -r, r * 2, r * 1.9, r * .35); ctx.fill();
      ctx.strokeStyle = '#5d6b70'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * .5, -r); ctx.lineTo(-r * .2, -r * .4); ctx.lineTo(-r * .5, r * .2); ctx.moveTo(r * .6, r * .3); ctx.lineTo(r * .3, r * .8); ctx.stroke();
      circle(-r * .38, -r * .25, r * .14, '#5ce1ff'); circle(r * .38, -r * .25, r * .14, '#5ce1ff'); break;
    }
    case 'dragon': {
      const f = Math.sin(t * 5) * .3;
      ctx.fillStyle = fl ? '#fff' : '#b8323a';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * .5, -r * .2); ctx.lineTo(s * r * 2, -r * (1 + f)); ctx.lineTo(s * r * 1.8, r * .3); ctx.closePath(); ctx.fill(); }
      circle(0, 0, r, col);
      ctx.fillStyle = '#ffe0a0'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * .4, -r * .8); ctx.lineTo(s * r * .7, -r * 1.4); ctx.lineTo(s * r * .75, -r * .65); ctx.fill(); }
      eyes(r, look, '#ffe14a', '#2a0a00'); break;
    }
  }
  if (e.boss && e.flash > 0) { ctx.globalAlpha = .3; circle(0, 0, r, '#fff'); ctx.globalAlpha = 1; }
  if (e.boss) { // 왕관
    ctx.fillStyle = '#ffc83d'; ctx.beginPath(); const cy = -r - 4, w = r * .55;
    ctx.moveTo(-w, cy); ctx.lineTo(-w, cy - 14); ctx.lineTo(-w / 2, cy - 6); ctx.lineTo(0, cy - 18); ctx.lineTo(w / 2, cy - 6); ctx.lineTo(w, cy - 14); ctx.lineTo(w, cy); ctx.fill();
  }
  ctx.restore();
  if (e.stunT > 0) { ctx.fillStyle = '#ffe14a'; ctx.font = '700 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦✦', e.x, e.y - z - r - 6); }
  if (e.burnT > 0) { ctx.globalAlpha = .35; circle(e.x, e.y - z, r + 4, '#ff7a20'); ctx.globalAlpha = 1; }
  if (e.slowT > 0) { ctx.strokeStyle = 'rgba(140,220,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y - z, r + 3, 0, TAU); ctx.stroke(); }
  if (!e.boss && e.hp < e.maxHp && e.maxHp > 40) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - r, e.y + r + 4, r * 2, 4);
    ctx.fillStyle = '#ff6b6b'; ctx.fillRect(e.x - r, e.y + r + 4, r * 2 * Math.max(0, e.hp / e.maxHp), 4);
  }
}
function drawTelegraph(e) {
  const A = e.act; if (!A) return;
  const k = .35 + Math.sin(G.t * 20) * .15;
  ctx.fillStyle = `rgba(255,80,90,${k * .5})`; ctx.strokeStyle = `rgba(255,80,90,${k + .3})`; ctx.lineWidth = 2;
  if (A.type === 'dash' && A.t < .7) {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(A.a); ctx.fillRect(0, -e.r * .8, 320, e.r * 1.6); ctx.restore();
  } else if (A.type === 'jump') {
    ctx.beginPath(); ctx.arc(A.tx, A.ty, 110, 0, TAU); ctx.fill(); ctx.stroke();
  } else if (A.type === 'slam' && A.t < 1) {
    ctx.beginPath(); ctx.arc(e.x, e.y, 160, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(e.x, e.y, 160 * A.t, 0, TAU); ctx.fill();
  }
}
function drawPlayer(p) {
  const bob = Math.abs(Math.sin(p.walk)) * 3;
  shadow(p.x, p.y + p.r * .9, p.r);
  if (p.inv > 0 && Math.floor(G.t * 20) % 2) return;
  ctx.save(); ctx.translate(p.x, p.y - bob);
  paintHero(ctx, p.r, curSkin(), { ox: Math.cos(p.face) * 4, oy: Math.sin(p.face) * 3, hurt: p.hurt > 0, t: G.t });
  ctx.restore();
  if (p.shield > 0) { ctx.strokeStyle = 'rgba(138,223,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - bob, p.r + 6, 0, TAU); ctx.stroke(); }
}
function drawImg(a, x, y, ang, L, centered) {
  if (a.img?.complete && a.img.naturalWidth) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
    ctx.drawImage(a.img, -L / 2, centered ? -L / 2 : -L - 2, L, L); ctx.restore();
  } else circle(x + Math.cos(ang) * L * .7, y + Math.sin(ang) * L * .7, centered ? L * .3 : 7, '#f3efe6');
}
function drawArms() {
  const p = G.p;
  for (const a of G.arms) {
    if (a.d.kind !== 'orbit') continue;
    const m = modsFor(a), n = a.d.count + m.proj, R = a.d.radius * m.area, L = a.d.size * m.area;
    for (let i = 0; i < n; i++) {
      const an = a.ang + i / n * TAU, x = p.x + Math.cos(an) * R, y = p.y + Math.sin(an) * R;
      ctx.globalAlpha = .25; circle(x, y, L * .4, a.col); ctx.globalAlpha = 1;
      drawImg(a, x, y, an + Math.PI / 2 + G.t * 6, L, true);
    }
  }
  for (const f of G.fx) {
    if (f.type === 'thrust') {
      const u = f.t / f.dur, out = Math.sin(u * Math.PI) * f.reach * .55, c = Math.cos(f.ang), s = Math.sin(f.ang);
      ctx.globalAlpha = (1 - u) * .4; ctx.strokeStyle = f.a.col; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + c * f.reach, p.y + s * f.reach); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      drawImg(f.a, p.x + c * out, p.y + s * out, f.ang, f.reach * .75);
      continue;
    }
    if (f.type !== 'swing') continue;
    const u = easeOut(f.t / f.dur), start = f.spin ? f.ang : f.ang - f.dir * f.arc / 2, cur = start + f.dir * u * f.arc;
    ctx.globalAlpha = (1 - f.t / f.dur) * .45; ctx.strokeStyle = f.a.col; ctx.lineWidth = f.reach * .4;
    ctx.beginPath(); ctx.arc(p.x, p.y, f.reach * .72, Math.min(start, cur), Math.max(start, cur)); ctx.stroke(); ctx.globalAlpha = 1;
    drawImg(f.a, p.x, p.y, cur, f.reach * 1.15);
  }
}
function drawShots() {
  for (const s of G.shots) {
    const d = s.a.d;
    if (d.arrow) {
      const a = Math.atan2(s.vy, s.vx), c = Math.cos(a), sn = Math.sin(a);
      ctx.globalAlpha = .35; ctx.strokeStyle = '#8adfff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(s.x - c * 26, s.y - sn * 26); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 3; ctx.stroke();
      circle(s.x, s.y, 4, '#ffffff'); continue;
    }
    if (d.stone) { circle(s.x, s.y, s.r + 2, '#7d7768'); circle(s.x - 1, s.y - 1, s.r * .5, '#a9a291'); continue; }
    if (d.fire) { ctx.globalAlpha = .4; circle(s.x, s.y, s.r * 2.4, '#ff6a3d'); ctx.globalAlpha = 1; circle(s.x, s.y, s.r * 1.2, '#ffc83d'); circle(s.x, s.y, s.r * .6, '#fff6d8'); continue; }
    const L = d.size * modsFor(s.a).area;
    if (d.kind === 'nova') { ctx.globalAlpha = .3; circle(s.x, s.y, L * .4, `hsl(${(G.t * 300 + s.x) % 360},100%,65%)`); ctx.globalAlpha = 1; }
    drawImg(s.a, s.x, s.y, d.spinning ? s.t * 16 : Math.atan2(s.vy, s.vx), L, true);
  }
  for (const b of G.bullets) {
    if (b.arrow) {
      const a = Math.atan2(b.vy, b.vx); ctx.strokeStyle = '#e8d8a8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(b.x - Math.cos(a) * 12, b.y - Math.sin(a) * 12); ctx.lineTo(b.x, b.y); ctx.stroke(); circle(b.x, b.y, 3, b.col);
    } else { ctx.globalAlpha = .35; circle(b.x, b.y, b.r * 1.9, b.col); ctx.globalAlpha = 1; circle(b.x, b.y, b.r, b.col); circle(b.x, b.y, b.r * .45, '#fff'); }
  }
}
function drawDrops() {
  for (const o of G.drops) {
    const y = o.y + Math.sin(G.t * 4 + o.ph) * 2;
    if (o.kind === 'heart') {
      ctx.fillStyle = '#ff5a72'; ctx.beginPath(); ctx.moveTo(o.x, y + 6);
      ctx.bezierCurveTo(o.x - 12, y - 3, o.x - 5, y - 11, o.x, y - 4); ctx.bezierCurveTo(o.x + 5, y - 11, o.x + 12, y - 3, o.x, y + 6); ctx.fill();
    } else {
      ctx.globalAlpha = .3; circle(o.x, y, 9, '#8fe8ff'); ctx.globalAlpha = 1;
      ctx.fillStyle = '#8fe8ff'; ctx.beginPath(); ctx.moveTo(o.x, y - 7); ctx.lineTo(o.x + 5, y); ctx.lineTo(o.x, y + 7); ctx.lineTo(o.x - 5, y); ctx.fill();
      ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(o.x, y - 7); ctx.lineTo(o.x + 2, y - 1); ctx.lineTo(o.x - 2, y - 1); ctx.fill();
    }
  }
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!G) { // 로비 뒤 배경
    const t = performance.now() / 1000;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-t * 20, -t * 12); drawGround(t * 20, t * 12); ctx.restore();
    return;
  }
  const p = G.p, c = G.cam;
  c.x += (p.x - c.x) * .15; c.y += (p.y - c.y) * .15;
  const sx = (Math.random() - .5) * G.shake * 30, sy = (Math.random() - .5) * G.shake * 30;
  ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(zoom, zoom); ctx.translate(-c.x, -c.y);
  drawGround(c.x, c.y);
  drawDrops();
  G.enemies.forEach(e => e.boss && drawTelegraph(e));
  for (const z of G.zones) { // 블랙홀
    const life = z.a.d.life, k = Math.min(1, z.t * 4, (life - z.t) * 3);
    ctx.save(); ctx.translate(z.x, z.y); ctx.scale(k, k);
    ctx.globalAlpha = .35; circle(0, 0, z.r, '#3a0a6a'); ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `hsla(${(z.t * 200 + i * 90) % 360},100%,70%,.7)`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, z.r * (.45 + i * .15), z.t * (5 - i) + i, z.t * (5 - i) + i + 2.2); ctx.stroke();
    }
    circle(0, 0, z.r * .28, '#000'); ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, z.r * .3, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  for (const f of G.fx) if (f.type === 'ring') {
    const u = f.t / f.dur; ctx.globalAlpha = 1 - u; ctx.strokeStyle = f.col; ctx.lineWidth = 6 * (1 - u) + 1;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * easeOut(u), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (const f of G.fx) if (f.type === 'bolt') { // 번개
    const u = f.t / f.dur; let x = f.x, y = f.y - 320;
    ctx.globalAlpha = 1 - u; ctx.strokeStyle = f.col || '#cff4ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 1; i <= 8; i++) { y = f.y - 320 + i * 40; x = f.x + (i < 8 ? Math.sin(f.seed + i * 2.7) * 22 : 0); ctx.lineTo(x, y); }
    ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = (1 - u) * .5; circle(f.x, f.y, 30, '#9adcff'); ctx.globalAlpha = 1;
  }
  const ents = [...G.enemies];
  ents.sort((a, b) => a.y - b.y);
  ents.forEach(drawEnemy);
  for (const f of G.fx) if (f.type === 'sprite') drawFx(ctx, f.key, f.t * f.rate, f.x, f.y, f.scale);
  if (G.phase !== 'over') drawPlayer(p);
  if (G.phase === 'clear') drawFinale();
  drawArms(); drawShots();
  for (const o of G.parts) { ctx.globalAlpha = Math.min(1, o.life / o.max * 1.5); circle(o.x, o.y, o.r, o.col); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const o of G.texts) {
    ctx.globalAlpha = 1 - Math.max(0, o.t - .4) / .3;
    ctx.font = `700 ${o.big ? 20 : 14}px Fredoka, Pretendard, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText(o.v, o.x, o.y); ctx.fillStyle = o.col; ctx.fillText(o.v, o.x, o.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 화면 밖 보스 방향 표시
  const b = G.boss;
  if (b) {
    const dx = (b.x - c.x) * zoom, dy = (b.y - c.y) * zoom;
    if (Math.abs(dx) > W / 2 - 20 || Math.abs(dy) > H / 2 - 20) {
      const a = Math.atan2(dy, dx), k = Math.min((W / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
      ctx.save(); ctx.translate(W / 2 + Math.cos(a) * k, H / 2 + Math.sin(a) * k); ctx.rotate(a);
      ctx.fillStyle = '#ff5a72'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.fill(); ctx.restore();
    }
  }
  // 가상 조이스틱
  if (joy) {
    const r = cv.getBoundingClientRect(), x0 = joy.x0 - r.left, y0 = joy.y0 - r.top;
    const dx = joy.x - joy.x0, dy = joy.y - joy.y0, d = Math.hypot(dx, dy), k = d > 46 ? 46 / d : 1;
    ctx.globalAlpha = .25; circle(x0, y0, 46, '#f3efe6'); ctx.globalAlpha = .6; circle(x0 + dx * k, y0 + dy * k, 20, '#f3efe6'); ctx.globalAlpha = 1;
  }
}

/* ---------- 루프 ---------- */
let last = performance.now(), hudT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (!visible()) return;
  if (!W) fit();
  if (G && !G.paused && ['fight', 'boss', 'clear'].includes(G.phase)) update(dt);
  else if (G && G.phase === 'over') updateFx(dt);
  draw();
  hudT -= dt;
  if (G && hudT <= 0) { hudT = .1; hooks.hud?.(G); }
}
requestAnimationFrame(frame);
