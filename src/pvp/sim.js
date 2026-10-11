import { ARMS, GALAXY, lvMult } from '../battle/data.js';
import { PVP_HP, PVP_DMG, SPEED, DASH, COUNTDOWN, ROUND_TIME, BREAK_TIME, POISON, ROUNDS_TO_WIN, ARENA, WALLS, SPAWN } from './rules.js';

/* =========================================================
   경쟁전 대결 (호스트가 돌리고, 결과 화면은 스냅샷으로 둘 다 그린다)
   - 무기는 일반 전투처럼 알아서 공격하고, 사람은 이동과 대시(무적)만 한다
   - 벽은 몸과 날아가는 공격을 막는다. 번개는 0.35초 전에 떨어질 자리가 보여서 피할 수 있다
   - phase: count(카운트다운) → fight → break(라운드 끝) → … → over
   ========================================================= */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 무기 하나 (lo: { id, lv, gp })
function makeArm(lo) {
  const d = ARMS[lo.id] || ARMS.fists;
  return { id: lo.id, d, lv: lo.lv || 1, g: lo.gp ? GALAXY[lo.id] || null : null, cd: rand(.3, .7), ang: Math.random() * TAU, lastHit: -9 };
}
// 무기별 능력치 (갤럭시 파워 포함) — 화면에서도 궤도 개수·반지름을 그릴 때 같이 씀
export function armMods(a) {
  const f = a.g?.fx, v = a.g?.v || 0;
  return { atk: 1 + (f === 'power' ? v : 0), area: 1 + (f === 'reach' ? v : 0), haste: 1 + (f === 'quick' ? v : 0),
    proj: f === 'multi' ? v : 0, crit: .05 + (f === 'crit' ? v : 0) };
}
export const orbitShape = a => { const m = armMods(a); return { n: a.d.count + m.proj, R: a.d.radius * m.area, size: a.d.size * m.area }; };

function makePlayer(i, loadout) {
  const p = { i, x: 0, y: 0, r: 16, hp: PVP_HP, maxHp: PVP_HP, face: i ? Math.PI : 0, kx: 0, ky: 0,
    dashT: 0, dashCd: 0, dashSeq: 0, dx: 0, dy: 0, stun: 0, stunImm: 0, slow: 0, burnT: 0, burnDps: 0, burnTick: 0, burnBy: null,
    shield: 0, shieldT: 0, flash: 0, arms: loadout.map(makeArm), swift: 0, regen: 0, shieldPct: 0, thorns: 0 };
  // 캐릭터 전체에 붙는 갤럭시 파워
  for (const a of p.arms) {
    const g = a.g; if (!g) continue;
    if (g.fx === 'swift') p.swift += g.v;
    if (g.fx === 'regen') p.regen += g.v * PVP_HP / 120 * .5;  // 일반 전투 체력(120)에 맞춘 값을 경쟁전 체력으로 환산
    if (g.fx === 'shield') p.shieldPct = Math.max(p.shieldPct, g.v);
    if (g.fx === 'thorns') p.thorns += g.v;
  }
  return p;
}

export function createSim(loadouts) {
  const S = { t: 0, ph: 'count', pt: 0, rt: 0, round: 1, score: [0, 0], winner: -1, lastRound: -1,
    players: loadouts.map((lo, i) => makePlayer(i, lo)), shots: [], zones: [], bolts: [], ev: [], evId: 0, shotId: 0 };
  resetRound(S);
  return S;
}
function resetRound(S) {
  S.players.forEach((p, i) => {
    Object.assign(p, { x: SPAWN[i].x, y: SPAWN[i].y, hp: p.maxHp, kx: 0, ky: 0, dashT: 0, dashCd: 0, stun: 0, stunImm: 0, slow: 0,
      burnT: 0, shield: 0, shieldT: 0, flash: 0, face: i ? Math.PI : 0 });
    p.arms.forEach(a => { a.cd = rand(.3, .7); a.lastHit = -9; });
  });
  S.shots = []; S.zones = []; S.bolts = []; S.ph = 'count'; S.pt = 0; S.rt = 0;
}
const ev = (S, e) => { e.i = ++S.evId; e.at = S.t; S.ev.push(e); };

/* ---------- 충돌 ---------- */
function inWall(x, y, r = 0) {
  for (const w of WALLS) if (x > w.x - r && x < w.x + w.w + r && y > w.y - r && y < w.y + w.h + r) return w;
  return null;
}
// 원을 벽과 경기장 밖에서 밀어낸다
function pushOut(p) {
  for (const w of WALLS) {
    const cx = clamp(p.x, w.x, w.x + w.w), cy = clamp(p.y, w.y, w.y + w.h);
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
    if (d < p.r) {
      if (d > .01) { p.x = cx + dx / d * p.r; p.y = cy + dy / d * p.r; }
      else { // 중심이 벽 안: 가장 가까운 면으로
        const opts = [[w.x - p.r - p.x, 0], [w.x + w.w + p.r - p.x, 0], [0, w.y - p.r - p.y], [0, w.y + w.h + p.r - p.y]];
        const [mx, my] = opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0];
        p.x += mx; p.y += my;
      }
    }
  }
  p.x = clamp(p.x, p.r, ARENA.w - p.r); p.y = clamp(p.y, p.r, ARENA.h - p.r);
}
// 독 안개 바깥이면 true (가운데 기준 사각형이 줄어듦)
export function safeRect(rt) {
  const k = clamp((rt - POISON.start) / (POISON.full - POISON.start), 0, 1), s = 1 - (1 - POISON.minScale) * k;
  const hw = ARENA.w * s / 2, hh = ARENA.h * s / 2;
  return { x0: ARENA.w / 2 - hw, y0: ARENA.h / 2 - hh, x1: ARENA.w / 2 + hw, y1: ARENA.h / 2 + hh, k };
}

/* ---------- 데미지 ---------- */
function hurt(S, t, v, att, opts = {}) {
  if (t.dashT > 0 && !opts.pure) { ev(S, { t: 'tx', x: t.x, y: t.y - 26, v: '회피', c: '#8adfff' }); return 0; }
  if (t.shield > 0 && !opts.pure) { const s = Math.min(t.shield, v); t.shield -= s; v -= s; }
  if (v <= 0) { ev(S, { t: 'tx', x: t.x, y: t.y - 26, v: '막음', c: '#8adfff' }); return 0; }
  t.hp -= v; t.flash = .1;
  ev(S, { t: 'tx', x: t.x, y: t.y - 26, v: Math.round(v), c: opts.crit ? '#ffc83d' : opts.col || '#ffffff', b: !!opts.crit, w: t.i });
  // 가시: 맞은 만큼 때린 사람에게 돌려줌 (돌려준 피해는 다시 돌려주지 않음)
  if (t.thorns && att && !opts.pure) { att.hp -= v * t.thorns; att.flash = .1; ev(S, { t: 'tx', x: att.x, y: att.y - 26, v: Math.round(v * t.thorns), c: '#ff9ad0' }); }
  return v;
}
function strike(S, att, a, t, kx = 0, ky = 0) {
  const m = armMods(a), g = a.g, crit = Math.random() < m.crit;
  let v = a.d.dmg * lvMult(a.lv) * m.atk * PVP_DMG * (crit ? 2 : 1);
  if (g?.fx === 'execute' && t.hp < t.maxHp * .4) v *= 1 + g.v;
  const dealt = hurt(S, t, v, att, { crit });
  if (!dealt) return;
  t.kx += kx * .35; t.ky += ky * .35;
  if (a.d.slow) t.slow = 1.2;
  if (g) { // 갤럭시 파워: 맞을 때 효과
    if (g.fx === 'burn') { t.burnDps = Math.max(t.burnT > 0 ? t.burnDps : 0, v * g.v / 2); t.burnT = 2; }
    if (g.fx === 'slow') t.slow = 1.5;
    if (g.fx === 'stun' && t.stunImm <= 0 && Math.random() < g.v) { t.stun = .4; t.stunImm = 2; ev(S, { t: 'tx', x: t.x, y: t.y - 40, v: '기절!', c: '#ffe14a' }); }
    if (g.fx === 'leech') att.hp = Math.min(att.maxHp, att.hp + dealt * g.v);
  }
}

/* ---------- 무기 ---------- */
function updateArm(S, p, o, a, ai, dt) {
  const d = a.d, m = armMods(a), dx = o.x - p.x, dy = o.y - p.y, dist = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  if (d.kind === 'orbit') {
    const { n, R, size } = orbitShape(a), hr = size * .35;
    a.ang += d.spin * m.haste * dt;
    if (p.stun > 0 || S.t - a.lastHit < .4) return;
    for (let i = 0; i < n; i++) {
      const an = a.ang + i / n * TAU, x = p.x + Math.cos(an) * R, y = p.y + Math.sin(an) * R;
      if ((o.x - x) ** 2 + (o.y - y) ** 2 < (o.r + hr) ** 2) { a.lastHit = S.t; strike(S, p, a, o, dx / dist * 120, dy / dist * 120); break; }
    }
    return;
  }
  a.cd -= dt * m.haste;
  if (a.cd > 0 || p.stun > 0) return;
  if (d.kind === 'swing' || d.kind === 'spin') {
    const reach = d.reach * m.area;
    if (dist > reach + o.r + 20) { a.cd = .1; return; }
    a.cd = d.cd;
    const spin = d.kind === 'spin', arc = spin ? TAU : d.arc * Math.PI / 180;
    ev(S, { t: 'sw', o: p.i, a: ai, ang, arc, reach, spin: spin ? 1 : 0, dir: Math.random() < .5 ? 1 : -1 });
    // 무기는 상대 쪽으로 휘두르므로 사거리 안이면 맞는다
    if (dist <= reach + o.r) {
      const k = d.pull ? -Math.min(dist * 4, 260) : d.knock;
      strike(S, p, a, o, dx / dist * k, dy / dist * k);
    }
  } else if (d.kind === 'shot') {
    if (dist > 560) { a.cd = .15; return; }
    a.cd = d.cd;
    const n = (d.count || 1) + m.proj;
    for (let i = 0; i < n; i++) shoot(S, p, a, ai, ang + (i - (n - 1) / 2) * .16);
  } else if (d.kind === 'nova') {
    if (dist > 600) { a.cd = .2; return; }
    a.cd = d.cd;
    const n = d.count + m.proj * 2, off = Math.random() * TAU;
    for (let i = 0; i < n; i++) shoot(S, p, a, ai, off + i / n * TAU, { life: .9, pierce: 99 });
  } else if (d.kind === 'thrust') {
    const reach = d.reach * m.area, w = d.width * m.area;
    if (dist > reach + 30) { a.cd = .1; return; }
    a.cd = d.cd;
    const c = Math.cos(ang), s = Math.sin(ang);
    ev(S, { t: 'th', o: p.i, a: ai, ang, reach });
    const along = dx * c + dy * s, perp = Math.abs(-dx * s + dy * c);
    if (along > -o.r && along < reach + o.r && perp < w + o.r) strike(S, p, a, o, c * 140, s * 140);
  } else if (d.kind === 'bolt') { // 떨어질 자리를 0.35초 먼저 보여 줌 (여러 개면 상대 주변에 흩어짐)
    if (dist > d.range) { a.cd = .2; return; }
    a.cd = d.cd;
    const n = d.count + m.proj;
    for (let i = 0; i < n; i++) {
      const r = i ? rand(30, 90) : 0, t = Math.random() * TAU;
      S.bolts.push({ x: o.x + Math.cos(t) * r, y: o.y + Math.sin(t) * r, r: d.splash * m.area, t: 0, delay: .35 + i * .08, o: p.i, a: ai });
    }
  } else if (d.kind === 'zone') {
    if (dist > 460) { a.cd = .3; return; }
    a.cd = d.cd;
    S.zones.push({ x: o.x, y: o.y, r: d.radius * m.area, t: 0, tick: .15, o: p.i, a: ai });
  }
}
function shoot(S, p, a, ai, ang, o = {}) {
  const d = a.d, m = armMods(a);
  S.shots.push({ id: ++S.shotId, o: p.i, a: ai, x: p.x, y: p.y, vx: Math.cos(ang) * d.speed, vy: Math.sin(ang) * d.speed, t: 0,
    life: o.life ?? (d.boomerang ? 2.2 : 1.4), pierce: o.pierce ?? d.pierce ?? 0, r: d.size * .4 * m.area, hit: false, back: false });
}
function explode(S, p, a, x, y) {
  const R = a.d.explode * armMods(a).area, o = S.players[1 - p.i];
  ev(S, { t: 'rg', x, y, r0: 10, r1: R, c: '#ff8a3d' });
  if (Math.hypot(o.x - x, o.y - y) < R + o.r) strike(S, p, a, o);
}
function updateShots(S, dt) {
  for (const s of S.shots) {
    const p = S.players[s.o], o = S.players[1 - s.o], a = p.arms[s.a], d = a.d;
    s.t += dt; s.life -= dt;
    if (d.curve) { const c = Math.cos(d.curve * dt), sn = Math.sin(d.curve * dt); [s.vx, s.vy] = [s.vx * c - s.vy * sn, s.vx * sn + s.vy * c]; }
    if (d.boomerang && s.t > .55) { // 돌아오는 도끼
      const dx = p.x - s.x, dy = p.y - s.y, dd = Math.hypot(dx, dy) || 1;
      s.vx += (dx / dd * d.speed * 1.3 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / dd * d.speed * 1.3 - s.vy) * Math.min(1, dt * 6);
      if (dd < 24) s.life = 0;
      if (!s.back) { s.back = true; s.hit = false; }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < 0 || s.y < 0 || s.x > ARENA.w || s.y > ARENA.h) { s.life = 0; continue; }
    if (!d.boomerang && inWall(s.x, s.y)) { if (d.explode) explode(S, p, a, s.x, s.y); s.life = 0; continue; }
    if (!s.hit && (o.x - s.x) ** 2 + (o.y - s.y) ** 2 < (o.r + s.r) ** 2) {
      if (d.explode) { explode(S, p, a, s.x, s.y); s.life = 0; continue; }
      s.hit = true;
      const sp = Math.hypot(s.vx, s.vy) || 1;
      strike(S, p, a, o, s.vx / sp * 90, s.vy / sp * 90);
      if (--s.pierce < 0 && !d.boomerang) s.life = 0;
    }
  }
  S.shots = S.shots.filter(s => s.life > 0);
}
function updateZones(S, dt) {
  for (const z of S.zones) {
    const p = S.players[z.o], o = S.players[1 - z.o], a = p.arms[z.a];
    z.t += dt; z.tick -= dt;
    const dx = z.x - o.x, dy = z.y - o.y, d = Math.hypot(dx, dy) || 1;
    if (d < z.r * 1.5 && o.dashT <= 0) { o.x += dx / d * Math.min(d, 60 * dt); o.y += dy / d * Math.min(d, 60 * dt); }
    if (z.tick <= 0) { z.tick = .3; if (d < z.r + o.r) strike(S, p, a, o); }
  }
  S.zones = S.zones.filter(z => z.t < S.players[z.o].arms[z.a].d.life);
  for (const b of S.bolts) {
    b.t += dt;
    if (b.t < b.delay) continue;
    b.done = true;
    const p = S.players[b.o], o = S.players[1 - b.o];
    ev(S, { t: 'bo', x: b.x, y: b.y, c: p.arms[b.a].d.col || '#cff4ff' });
    if (Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r) strike(S, p, p.arms[b.a], o);
  }
  S.bolts = S.bolts.filter(b => !b.done);
}

/* ---------- 한 프레임 ----------
   inputs[i] = { mx, my, dash } (dash는 누를 때마다 1씩 커지는 수) */
export function step(S, dt, inputs) {
  S.t += dt; S.pt += dt;
  S.ev = S.ev.filter(e => S.t - e.at < 1.2); // 스냅샷이 몇 개 빠져도 효과가 전달되게 잠깐 남겨 둠
  if (S.ph === 'count') { if (S.pt >= COUNTDOWN) { S.ph = 'fight'; S.pt = 0; ev(S, { t: 'go' }); } return; }
  if (S.ph === 'break') {
    if (S.pt >= BREAK_TIME) { if (S.winner >= 0) { S.ph = 'over'; ev(S, { t: 'over', w: S.winner }); } else { S.round++; resetRound(S); } }
    return;
  }
  if (S.ph !== 'fight') return;
  S.rt += dt;
  const [A, B] = S.players;

  // 이동·대시
  S.players.forEach((p, i) => {
    const inp = inputs[i] || { mx: 0, my: 0, dash: 0 };
    let mx = inp.mx || 0, my = inp.my || 0; const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    p.dashCd -= dt; p.stun -= dt; p.stunImm -= dt; p.slow -= dt; p.flash -= dt;
    if (inp.dash > p.dashSeq) {
      p.dashSeq = inp.dash;
      if (p.dashCd <= 0 && p.stun <= 0) {
        const dl = Math.hypot(mx, my);
        [p.dx, p.dy] = dl > .1 ? [mx / dl, my / dl] : [Math.cos(p.face), Math.sin(p.face)];
        p.dashT = DASH.time; p.dashCd = DASH.cd; ev(S, { t: 'dash', o: i });
      }
    }
    if (p.dashT > 0) { p.dashT -= dt; p.x += p.dx * DASH.speed * dt; p.y += p.dy * DASH.speed * dt; }
    else if (p.stun <= 0) {
      const sp = SPEED * (1 + p.swift) * (p.slow > 0 ? .6 : 1);
      p.x += mx * sp * dt; p.y += my * sp * dt;
      if (l > .1) p.face = Math.atan2(my, mx);
    }
    p.x += p.kx * dt; p.y += p.ky * dt;
    const decay = Math.max(0, 1 - dt * 9); p.kx *= decay; p.ky *= decay;
    pushOut(p);
  });
  // 서로 겹치지 않게
  { const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || .01, o = A.r + B.r - d;
    if (o > 0) { A.x -= dx / d * o / 2; A.y -= dy / d * o / 2; B.x += dx / d * o / 2; B.y += dy / d * o / 2; pushOut(A); pushOut(B); } }

  // 무기
  A.arms.forEach((a, i) => updateArm(S, A, B, a, i, dt));
  B.arms.forEach((a, i) => updateArm(S, B, A, a, i, dt));
  updateShots(S, dt);
  updateZones(S, dt);

  // 지속 효과·독 안개
  const safe = safeRect(S.rt);
  for (const p of S.players) {
    if (p.burnT > 0) {
      p.burnT -= dt; p.hp -= p.burnDps * dt; p.burnTick -= dt;
      if (p.burnTick <= 0) { p.burnTick = .5; ev(S, { t: 'tx', x: p.x, y: p.y - 26, v: Math.round(p.burnDps / 2), c: '#ff9a3d' }); }
    }
    if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    if (p.shieldPct) { p.shieldT -= dt; if (p.shieldT <= 0) { p.shieldT = 8; p.shield = Math.max(p.shield, p.maxHp * p.shieldPct); } }
    if (p.x < safe.x0 || p.x > safe.x1 || p.y < safe.y0 || p.y > safe.y1) p.hp -= p.maxHp * POISON.dps * dt;
  }

  // 라운드 끝
  const deadA = A.hp <= 0, deadB = B.hp <= 0;
  if (deadA || deadB || S.rt >= ROUND_TIME) {
    let w = deadA && deadB ? -1 : deadA ? 1 : deadB ? 0 : -1;
    if (!deadA && !deadB) { const ra = A.hp / A.maxHp, rb = B.hp / B.maxHp; w = ra === rb ? -1 : ra > rb ? 0 : 1; }
    if (w >= 0) { S.score[w]++; if (S.score[w] >= ROUNDS_TO_WIN) S.winner = w; }
    S.lastRound = w; S.ph = 'break'; S.pt = 0;
    ev(S, { t: 'round', w });
  }
}

// 상대가 나갔을 때: 남은 사람이 이긴 것으로 끝냄
export function forfeit(S, loser) {
  S.winner = 1 - loser; S.score[1 - loser] = Math.max(S.score[1 - loser], ROUNDS_TO_WIN);
  S.ph = 'over'; ev(S, { t: 'over', w: S.winner, ff: 1 });
}

/* ---------- 스냅샷 (호스트 → 게스트, 그리고 화면 그리기용) ---------- */
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
export function snapshot(S) {
  return {
    k: 's', t: r2(S.t), ph: S.ph, pt: r1(S.pt), rt: r1(S.rt), rd: S.round, sc: S.score, w: S.winner, lr: S.lastRound,
    p: S.players.map(p => [Math.round(p.x), Math.round(p.y), Math.round(Math.max(0, p.hp)), r2(p.face), Math.round(p.shield),
      p.dashT > 0 ? 1 : 0, p.stun > 0 ? 1 : 0, p.slow > 0 ? 1 : 0, p.burnT > 0 ? 1 : 0, p.flash > 0 ? 1 : 0, r1(Math.max(0, p.dashCd))]),
    oa: S.players.map(p => p.arms.map(a => a.d.kind === 'orbit' ? r2(a.ang) : 0)),
    sh: S.shots.map(s => [s.id, s.o, s.a, Math.round(s.x), Math.round(s.y), r2(Math.atan2(s.vy, s.vx)), r2(s.t)]),
    z: S.zones.map(z => [z.o, z.a, Math.round(z.x), Math.round(z.y), Math.round(z.r), r2(z.t)]),
    b: S.bolts.map(b => [Math.round(b.x), Math.round(b.y), Math.round(b.r), r2(Math.min(1, b.t / b.delay))]),
    ev: S.ev.map(e => { const { at, ...rest } = e; return rest; }),
  };
}
