import { ARMS, GALAXY } from '../battle/data.js';
import { RAR } from '../config.js';
import { WEAPONS } from '../three/weapons.js';
import { sprite } from '../ui/dex.js';
import { tone } from '../sound.js';
import { ARENA, WALLS, DASH, PVP_HP } from './rules.js';
import { orbitShape, safeRect } from './sim.js';

/* =========================================================
   경쟁전 화면 그리기
   - 호스트와 게스트 모두 스냅샷으로 그린다 (게스트는 스냅샷 사이를 부드럽게 이어 줌)
   - 카메라는 내 캐릭터를 따라가고, 화면 밖 상대는 가장자리 화살표로 보여 준다
   ========================================================= */
const TAU = Math.PI * 2;
const COL = ['#e8364f', '#3a8aff']; // 0: 호스트(빨강) 1: 게스트(파랑)
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAng = (a, b, k) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return a + d * k; };
const easeOut = t => 1 - Math.pow(1 - t, 3);

// 무기 정보 (궤도 모양·그림) — 밴픽 결과로 한 번 만든다
export function makeView(loadouts, me, names) {
  return {
    me, names, cam: { x: 0, y: 0, init: false }, fx: [], seen: new Set(), shake: 0,
    arms: loadouts.map(lo => lo.map(e => {
      const w = WEAPONS.find(x => x.id === e.id);
      return { id: e.id, d: ARMS[e.id] || ARMS.fists, g: e.gp ? GALAXY[e.id] || null : null, img: w ? sprite(w) : null, col: w ? RAR[w.r].color : '#f3efe6' };
    })),
  };
}

// 새로 들어온 효과(ev)를 한 번씩만 재생
export function takeEvents(V, snap, hooks = {}) {
  for (const e of snap.ev) {
    if (V.seen.has(e.i)) continue;
    V.seen.add(e.i);
    if (V.seen.size > 600) V.seen = new Set([...V.seen].slice(-300));
    if (e.t === 'sw') { V.fx.push({ ...e, life: e.spin ? .32 : .2, max: e.spin ? .32 : .2 }); tone(e.spin ? 300 : 520, .08, 'triangle', .025, 0, e.spin ? 900 : 200); }
    else if (e.t === 'th') { V.fx.push({ ...e, life: .24, max: .24 }); tone(380, .07, 'triangle', .025, 0, 900); }
    else if (e.t === 'bo') { V.fx.push({ ...e, life: .3, max: .3 }); V.shake = Math.max(V.shake, .12); tone(1800, .15, 'sawtooth', .03, 0, 200); }
    else if (e.t === 'rg') V.fx.push({ ...e, life: .3, max: .3 });
    else if (e.t === 'tx') {
      V.fx.push({ ...e, life: .7, max: .7, x: e.x + (Math.random() - .5) * 16 });
      if (e.w === V.me) { V.shake = Math.max(V.shake, .18); tone(150, .14, 'sawtooth', .05, 0, 70); }
      else if (typeof e.v === 'number') tone(220 + Math.random() * 80, .05, 'square', .025);
    } else if (e.t === 'dash') tone(600, .12, 'sine', .04, 0, 1400);
    hooks[e.t]?.(e);
  }
}

// 게스트: 이전 스냅샷과 지금 스냅샷 사이를 k(0~1)로 이어서 그릴 상태를 만든다
export function blend(a, b, k) {
  if (!a || k >= 1) return b;
  const prevShots = new Map(a.sh.map(s => [s[0], s]));
  return { ...b,
    p: b.p.map((p, i) => { const q = a.p[i]; return [lerp(q[0], p[0], k), lerp(q[1], p[1], k), ...p.slice(2)]; }),
    oa: b.oa.map((arr, i) => arr.map((v, j) => lerpAng(a.oa[i]?.[j] ?? v, v, k))),
    sh: b.sh.map(s => { const q = prevShots.get(s[0]); return q ? [s[0], s[1], s[2], lerp(q[3], s[3], k), lerp(q[4], s[4], k), s[5], s[6]] : s; }),
  };
}

/* ---------- 그리기 ---------- */
function circle(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function drawImg(ctx, a, x, y, ang, L, centered) {
  if (a.img?.complete && a.img.naturalWidth) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
    ctx.drawImage(a.img, -L / 2, centered ? -L / 2 : -L - 2, L, L); ctx.restore();
  } else circle(ctx, x + Math.cos(ang) * L * .5, y + Math.sin(ang) * L * .5, centered ? L * .3 : 6, a.col);
}
function drawFloor(ctx, s) {
  ctx.fillStyle = '#061c1f'; ctx.fillRect(-400, -400, ARENA.w + 800, ARENA.h + 800);
  const T = 80;
  for (let i = 0; i < ARENA.w / T; i++) for (let j = 0; j < ARENA.h / T; j++) {
    ctx.fillStyle = (i + j) & 1 ? '#0c3337' : '#0b2f33'; ctx.fillRect(i * T, j * T, T + .5, T + .5);
  }
  ctx.strokeStyle = '#22646b'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, ARENA.w, ARENA.h);
  // 가운데 선과 출발 지점
  ctx.globalAlpha = .25; ctx.strokeStyle = '#f3efe6'; ctx.lineWidth = 2; ctx.setLineDash([12, 12]);
  ctx.beginPath(); ctx.moveTo(ARENA.w / 2, 0); ctx.lineTo(ARENA.w / 2, ARENA.h); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  // 독 안개
  const sf = safeRect(s.ph === 'fight' ? s.rt : 0);
  if (sf.k > 0) {
    ctx.fillStyle = 'rgba(120,220,90,.22)';
    ctx.fillRect(0, 0, ARENA.w, sf.y0); ctx.fillRect(0, sf.y1, ARENA.w, ARENA.h - sf.y1);
    ctx.fillRect(0, sf.y0, sf.x0, sf.y1 - sf.y0); ctx.fillRect(sf.x1, sf.y0, ARENA.w - sf.x1, sf.y1 - sf.y0);
    ctx.strokeStyle = '#9aff6a'; ctx.lineWidth = 3; ctx.strokeRect(sf.x0, sf.y0, sf.x1 - sf.x0, sf.y1 - sf.y0);
  }
  for (const w of WALLS) {
    ctx.fillStyle = '#1d5a61'; ctx.fillRect(w.x, w.y + 6, w.w, w.h);
    ctx.fillStyle = '#2b7a82'; ctx.fillRect(w.x, w.y, w.w, w.h - 4);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(w.x, w.y, w.w, 5);
  }
}
function drawPlayer(ctx, V, s, i, t) {
  const p = s.p[i], [x, y, hp, face, shield, dash, stun, slow, burn, flash] = p, r = 16;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + r * .9, r, r * .4, 0, 0, TAU); ctx.fill();
  if (dash) { ctx.globalAlpha = .35; circle(ctx, x - Math.cos(face) * 18, y - Math.sin(face) * 18, r, COL[i]); ctx.globalAlpha = 1; }
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.42);
  circle(ctx, 0, 0, r, flash ? '#ffffff' : '#f3efe6');
  ctx.fillStyle = COL[i]; ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.rotate(.42);
  const ox = Math.cos(face) * 4, oy = Math.sin(face) * 3;
  circle(ctx, -4 + ox, 5 + oy, 2.2, '#14161c'); circle(ctx, 4 + ox, 5 + oy, 2.2, '#14161c');
  ctx.restore();
  if (shield > 0) { ctx.strokeStyle = 'rgba(138,223,255,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TAU); ctx.stroke(); }
  if (burn) { ctx.globalAlpha = .3; circle(ctx, x, y, r + 5, '#ff7a20'); ctx.globalAlpha = 1; }
  if (slow) { ctx.strokeStyle = 'rgba(140,220,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke(); }
  if (stun) { ctx.fillStyle = '#ffe14a'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦ ✦', x, y - r - 22 + Math.sin(t * 10) * 2); }
  // 머리 위 이름과 체력
  const bw = 54, ratio = Math.max(0, hp) / PVP_HP;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - bw / 2, y - r - 14, bw, 6);
  ctx.fillStyle = i === V.me ? '#4fd18b' : '#ff6b6b'; ctx.fillRect(x - bw / 2, y - r - 14, bw * Math.min(1, ratio), 6);
  ctx.font = '700 12px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText(V.names[i], x, y - r - 19);
  ctx.fillStyle = i === V.me ? '#ffffff' : '#ffb3b3'; ctx.fillText(V.names[i], x, y - r - 19);
}
function drawArms(ctx, V, s, t) {
  // 궤도 무기
  s.p.forEach((p, i) => V.arms[i].forEach((a, j) => {
    if (a.d.kind !== 'orbit') return;
    const { n, R, size } = orbitShape(a), base = s.oa[i]?.[j] || 0;
    for (let k = 0; k < n; k++) {
      const an = base + k / n * TAU, x = p[0] + Math.cos(an) * R, y = p[1] + Math.sin(an) * R;
      ctx.globalAlpha = .25; circle(ctx, x, y, size * .4, a.col); ctx.globalAlpha = 1;
      drawImg(ctx, a, x, y, an + Math.PI / 2 + t * 6, size, true);
    }
  }));
  // 휘두르기·찌르기
  for (const f of V.fx) {
    const pl = s.p[f.o]; if (!pl || (f.t !== 'sw' && f.t !== 'th')) continue;
    const a = V.arms[f.o][f.a], u = 1 - f.life / f.max, [px, py] = pl;
    if (f.t === 'th') {
      const out = Math.sin(u * Math.PI) * f.reach * .55, c = Math.cos(f.ang), sn = Math.sin(f.ang);
      ctx.globalAlpha = (1 - u) * .4; ctx.strokeStyle = a.col; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + c * f.reach, py + sn * f.reach); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      drawImg(ctx, a, px + c * out, py + sn * out, f.ang, f.reach * .75);
    } else {
      const e = easeOut(u), start = f.spin ? f.ang : f.ang - f.dir * f.arc / 2, cur = start + f.dir * e * f.arc;
      ctx.globalAlpha = (1 - u) * .45; ctx.strokeStyle = a.col; ctx.lineWidth = f.reach * .4;
      ctx.beginPath(); ctx.arc(px, py, f.reach * .72, Math.min(start, cur), Math.max(start, cur)); ctx.stroke(); ctx.globalAlpha = 1;
      drawImg(ctx, a, px, py, cur, f.reach * 1.15);
    }
  }
}
function drawShots(ctx, V, s, t) {
  for (const z of s.z) { // 블랙홀·장판
    const [o, ai, x, y, r, zt] = z, life = V.arms[o][ai].d.life || 2.5, k = Math.min(1, zt * 4, (life - zt) * 3);
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0, k), Math.max(0, k));
    ctx.globalAlpha = .35; circle(ctx, 0, 0, r, '#3a0a6a'); ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = `hsla(${(zt * 200 + i * 120) % 360},100%,70%,.7)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * (.5 + i * .17), zt * (5 - i) + i, zt * (5 - i) + i + 2.2); ctx.stroke(); }
    circle(ctx, 0, 0, r * .26, '#000'); ctx.restore();
  }
  for (const b of s.b) { // 번개 떨어질 자리
    const [x, y, r, k] = b;
    ctx.strokeStyle = `rgba(255,80,90,${.4 + k * .5})`; ctx.fillStyle = `rgba(255,80,90,${.12 + k * .2})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * k, 0, TAU); ctx.fill();
  }
  for (const sh of s.sh) {
    const [, o, ai, x, y, ang, st] = sh, a = V.arms[o][ai], d = a.d;
    if (d.arrow) {
      const c = Math.cos(ang), sn = Math.sin(ang);
      ctx.globalAlpha = .35; ctx.strokeStyle = '#8adfff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - c * 26, y - sn * 26); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 3; ctx.stroke(); circle(ctx, x, y, 4, '#fff'); continue;
    }
    if (d.stone) { circle(ctx, x, y, 7, '#7d7768'); continue; }
    if (d.fire) { ctx.globalAlpha = .4; circle(ctx, x, y, 14, '#ff6a3d'); ctx.globalAlpha = 1; circle(ctx, x, y, 7, '#ffc83d'); continue; }
    const L = d.size;
    if (d.kind === 'nova') { ctx.globalAlpha = .3; circle(ctx, x, y, L * .4, `hsl(${(t * 300 + x) % 360},100%,65%)`); ctx.globalAlpha = 1; }
    drawImg(ctx, a, x, y, d.spinning ? st * 16 : ang, L, true);
  }
}
function drawFx(ctx) {
  return V => {
    for (const f of V.fx) {
      const u = 1 - f.life / f.max;
      if (f.t === 'rg') { ctx.globalAlpha = 1 - u; ctx.strokeStyle = f.c; ctx.lineWidth = 6 * (1 - u) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * easeOut(u), 0, TAU); ctx.stroke(); }
      else if (f.t === 'bo') {
        let x = f.x, y = f.y - 320; ctx.globalAlpha = 1 - u; ctx.strokeStyle = f.c; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y);
        for (let i = 1; i <= 8; i++) { y = f.y - 320 + i * 40; x = f.x + (i < 8 ? Math.sin(f.i + i * 2.7) * 22 : 0); ctx.lineTo(x, y); }
        ctx.stroke(); ctx.globalAlpha = (1 - u) * .5; circle(ctx, f.x, f.y, 30, '#9adcff');
      } else if (f.t === 'tx') {
        ctx.globalAlpha = 1 - Math.max(0, u - .55) / .45; ctx.font = `700 ${f.b ? 20 : 14}px Fredoka, Pretendard, sans-serif`; ctx.textAlign = 'center';
        const y = f.y - u * 28; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText(f.v, f.x, y); ctx.fillStyle = f.c; ctx.fillText(f.v, f.x, y);
      }
      ctx.globalAlpha = 1;
    }
  };
}

export function render(ctx, W, H, DPR, V, s, dt) {
  const t = performance.now() / 1000;
  for (const f of V.fx) f.life -= dt;
  V.fx = V.fx.filter(f => f.life > 0);
  V.shake = Math.max(0, V.shake - dt);
  const me = s.p[V.me], zoom = Math.max(.55, Math.min(1.2, Math.min(W, H) / 640));
  // 카메라: 내 캐릭터를 따라가되 경기장 밖이 너무 많이 보이지 않게
  const hw = W / 2 / zoom, hh = H / 2 / zoom;
  const tx = ARENA.w < hw * 2 ? ARENA.w / 2 : Math.max(hw - 60, Math.min(ARENA.w - hw + 60, me[0]));
  const ty = ARENA.h < hh * 2 ? ARENA.h / 2 : Math.max(hh - 60, Math.min(ARENA.h - hh + 60, me[1]));
  if (!V.cam.init) { V.cam.x = tx; V.cam.y = ty; V.cam.init = true; }
  V.cam.x += (tx - V.cam.x) * .15; V.cam.y += (ty - V.cam.y) * .15;
  const sx = (Math.random() - .5) * V.shake * 24, sy = (Math.random() - .5) * V.shake * 24;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#061c1f'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(zoom, zoom); ctx.translate(-V.cam.x, -V.cam.y);
  drawFloor(ctx, s);
  drawShots(ctx, V, s, t);
  [0, 1].sort((a, b) => s.p[a][1] - s.p[b][1]).forEach(i => drawPlayer(ctx, V, s, i, t));
  drawArms(ctx, V, s, t);
  drawFx(ctx)(V);
  ctx.restore();
  // 화면 밖 상대 방향
  const op = s.p[1 - V.me], dx = (op[0] - V.cam.x) * zoom, dy = (op[1] - V.cam.y) * zoom;
  if (Math.abs(dx) > W / 2 - 20 || Math.abs(dy) > H / 2 - 20) {
    const a = Math.atan2(dy, dx), k = Math.min((W / 2 - 30) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 30) / Math.abs(Math.sin(a) || 1e-6));
    ctx.save(); ctx.translate(W / 2 + Math.cos(a) * k, H / 2 + Math.sin(a) * k); ctx.rotate(a);
    ctx.fillStyle = COL[1 - V.me]; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.fill(); ctx.restore();
  }
}
export const dashReady = (s, me) => Math.max(0, s.p[me][10] || 0) / DASH.cd;
