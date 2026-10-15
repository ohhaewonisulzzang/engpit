import { $ } from '../dom.js';
import { state } from '../state.js';
import { FREE } from '../config.js';
import { SFX } from '../sound.js';
import { session } from '../ranking.js';
import { CATS, owns, using, canBuy, buy, use, paintHero, curSkin, curTheme } from '../shop.js';
import { titleOf } from '../titles.js';
import { toast, updateHUD, currentTab, esc } from './common.js';

/* =========================================================
   코인 상점 화면(tab-store)
   - 왼쪽 탈의실: 고른 아이템을 내 캐릭터에 입혀서 크게 보여 준다 (스킨은 지금 배경 위에서, 배경은 지금 스킨으로,
     효과음은 들어 보기, 칭호는 이름표 위에). 사기·쓰기 버튼은 여기 하나만
   - 오른쪽 진열대: 아이템 칸 + 가격표. 누르면 탈의실에서 입어 본다
   ========================================================= */
let cat = 'skin';
const sel = {}; // 분류마다 고른 아이템 id (처음에는 쓰는 중인 것)
const TAU = Math.PI * 2;
const ICON = {
  skin: '<path d="M5 13a7 7 0 0 1 14 0v1H5z"/><path d="M5 14h14v2a7 7 0 0 1-14 0z"/>',
  theme: '<path d="M3 17l5-6 4 4 3-3 6 5"/><rect x="3" y="4" width="18" height="16" rx="2"/>',
  sfx: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  title: '<path d="M4 8h16v8H4z"/><path d="M8 12h8"/>',
};
// 상점에 보이는 아이템 (랭킹 1등 보상은 받은 사람에게만)
const shown = k => CATS.find(x => x.key === k).list.filter(it => !it.pro || owns(k, it));
const picked = () => { const list = shown(cat); return list.find(it => it.id === sel[cat]) || list.find(it => using(cat, it)) || list[0]; };

export function renderStore() {
  const list = shown(cat), it = picked(), have = list.filter(x => owns(cat, x)).length;
  sel[cat] = it.id;
  $('storeHead').innerHTML = `<div><h2>코인 상점</h2><p>단어 테스트에서 모은 코인으로 캐릭터와 배경, 효과음, 칭호를 바꿔요. 아이템을 누르면 사기 전에 먼저 입어 볼 수 있어요.</p></div>
    <div class="st-wallet" title="가진 코인"><i class="ci"></i><b>${FREE ? '∞' : state.coins}</b></div>`;
  $('storeSeg').innerHTML = CATS.map(x => `<button data-cat="${x.key}"${x.key === cat ? ' class="on"' : ''}>
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[x.key]}</svg>${x.name}</button>`).join('');
  renderRoom(it);
  $('storeGrid').innerHTML = `<div class="st-shelf-head"><b>${CATS.find(x => x.key === cat).name}</b><span>${have}/${list.length}개 가짐</span></div>
    <div class="st-tiles">${list.map(x => tile(x)).join('')}</div>`;
  drawThumbs();
  loop();
}

/* ---------- 탈의실 ---------- */
function renderRoom(it) {
  const own = owns(cat, it), on = using(cat, it), need = it.price - state.coins;
  const act = on ? `<button class="btn st-act worn" disabled>${cat === 'title' ? '달고 있어요' : '쓰고 있어요'}</button>`
    : own ? `<button class="btn st-act" data-use="${it.id}">${cat === 'title' ? '이 칭호 달기' : '이걸로 바꾸기'}</button>`
    : canBuy(it) ? `<button class="btn primary st-act" data-buy="${it.id}">사기 <i class="ci"></i>${it.price}</button>`
    : `<button class="btn st-act" disabled>코인 ${need}개 더 모으면 살 수 있어요</button>`;
  const t = cat === 'title' ? it : titleOf(state.title);
  $('storeRoom').innerHTML = `<div class="st-stage"><canvas id="roomCv"></canvas>
      <div class="st-plate">${t ? `<span class="tchip st-tt${t.gold ? ' gold' : ''}${t.pro ? ' pro' : ''}">${esc(t.name)}</span>` : ''}<b>${esc(session?.username || '나')}</b></div>
      ${cat === 'sfx' ? `<div class="st-play"><button class="btn" data-play="ok">정답 소리 ▶</button><button class="btn" data-play="no">오답 소리 ▶</button></div>` : ''}</div>
    <div class="st-info"><h3>${esc(it.name)}</h3><p>${esc(it.desc)}</p>${act}</div>`;
  sizeRoom();
}
let room = { anim: null };
function sizeRoom() {
  const cv = $('roomCv'); if (!cv) return;
  const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
}
addEventListener('resize', () => { if (currentTab === 'store') sizeRoom(); });
// 전투 바닥과 같은 무늬 (w×h를 160×120 무늬로 채움, sx: 옆으로 흐르는 정도)
function ground(g, th, w, h, sx = 0) {
  const T = 40, o = ((sx % (T * 2)) + T * 2) % (T * 2);
  for (let i = -2; i * T - o < w; i++) for (let j = 0; j * T < h; j++) {
    g.fillStyle = (i + j) & 1 ? th.a : th.b; g.fillRect(i * T - o, j * T, T, T);
  }
  const dots = [[20, 30, 'spot'], [110, 22, 'grass'], [60, 80, 'spark'], [130, 95, 'spot'], [30, 100, 'grass'], [90, 55, 'spark']];
  for (let bx = -160; bx < w + 160; bx += 160) for (let by = 0; by < h; by += 120) for (const [dx, dy, k] of dots) {
    const x = bx + dx - (sx % 160), y = by + dy;
    if (k === 'grass') { g.strokeStyle = th.grass; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x - 7, y - 8); g.moveTo(x, y); g.lineTo(x, y - 10); g.moveTo(x + 5, y); g.lineTo(x + 7, y - 8); g.stroke(); }
    else { g.fillStyle = th[k]; g.beginPath(); g.ellipse(x, y, k === 'spot' ? 7 : 4, k === 'spot' ? 4.5 : 4, 0, 0, TAU); g.fill(); }
  }
}
function drawRoom(t) {
  const cv = $('roomCv'); if (!cv || !cv.width) return;
  const g = cv.getContext('2d'), d = cv.width / cv.getBoundingClientRect().width || 1, W = cv.width / d, H = cv.height / d;
  const it = picked(), sk = cat === 'skin' ? it : curSkin(), th = cat === 'theme' ? it : curTheme();
  g.setTransform(d, 0, 0, d, 0, 0);
  ground(g, th, W, H, t * 14);
  // 가운데에서 천천히 좌우로 걷는 캐릭터. 효과음을 들으면 정답은 깡충, 오답은 부르르
  const a = room.anim, k = a ? (t - a.t0) / .5 : 1;
  if (a && k >= 1) room.anim = null;
  const jump = a?.kind === 'ok' && k < 1 ? Math.sin(k * Math.PI) * 26 : 0;
  const shake = a?.kind === 'no' && k < 1 ? Math.sin(k * 40) * 5 * (1 - k) : 0;
  const base = H * .42, x = W / 2 + Math.sin(t * .7) * W * .12 + shake, y = base - jump - Math.abs(Math.sin(t * 5)) * 3, s = Math.min(W, H) / 105;
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, base + 14 * s * .9, 14 * s * (1 - jump / 80), 5.6 * s, 0, 0, TAU); g.fill();
  g.translate(x, y); g.scale(s, s);
  paintHero(g, 14, sk, { ox: Math.cos(t * .7) * 4, oy: Math.sin(t * 1.3) * 1.5, t });
}

/* ---------- 진열대 ---------- */
function tile(it) {
  const own = owns(cat, it), on = using(cat, it), here = sel[cat] === it.id;
  const tag = on ? '<span class="st-tag on">쓰는 중</span>' : own ? '<span class="st-tag own">가짐</span>'
    : `<span class="st-tag price${canBuy(it) ? '' : ' poor'}"><i class="ci"></i>${it.price}</span>`;
  const thumb = cat === 'skin' || cat === 'theme' ? `<canvas data-th="${it.id}" width="128" height="96"></canvas>`
    : cat === 'sfx' ? `<svg class="st-note" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON.sfx}</svg>`
    : `<span class="tchip st-tt${it.gold ? ' gold' : ''}">${esc(it.name)}</span>`;
  return `<button class="st-tile${here ? ' sel' : ''}${on ? ' on' : ''}" data-pick="${it.id}" aria-pressed="${here}">
    <span class="st-thumb">${thumb}</span>${cat === 'title' ? '' : `<b>${esc(it.name)}</b>`}${tag}</button>`;
}
function drawThumbs() {
  for (const cv of document.querySelectorAll('#storeGrid canvas[data-th]')) {
    const it = shown(cat).find(x => x.id === cv.dataset.th), g = cv.getContext('2d');
    if (cat === 'theme') { ground(g, it, cv.width, cv.height); continue; }
    g.clearRect(0, 0, cv.width, cv.height);
    g.translate(cv.width / 2, cv.height / 2 + 6); g.scale(2.3, 2.3);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 13, 13, 4.5, 0, 0, TAU); g.fill();
    paintHero(g, 14, it, { t: 1.2 });
  }
}

// 상점을 보는 동안만 탈의실을 움직인다
let raf = 0;
function loop() {
  cancelAnimationFrame(raf);
  const frame = () => {
    if (currentTab !== 'store') return;
    drawRoom(performance.now() / 1000);
    raf = requestAnimationFrame(frame);
  };
  frame();
}

$('storeSeg').onclick = e => {
  const b = e.target.closest('[data-cat]'); if (!b || b.dataset.cat === cat) return;
  cat = b.dataset.cat; SFX.tick(); renderStore();
};
$('storeGrid').onclick = e => {
  const b = e.target.closest('[data-pick]'); if (!b) return;
  sel[cat] = b.dataset.pick; SFX.tick();
  renderStore();
  if (cat === 'sfx') play('ok');
};
function play(kind) {
  picked()[kind]();
  room.anim = { kind, t0: performance.now() / 1000 };
}
$('storeRoom').onclick = e => {
  const p = e.target.closest('[data-play]'); if (p) return play(p.dataset.play);
  const b = e.target.closest('[data-buy]'), u = e.target.closest('[data-use]');
  const it = picked();
  if (b) {
    if (!buy(cat, it)) return;
    SFX.coin(); toast(`<b>${esc(it.name)}</b>을(를) 샀어요! 바로 쓰고 있어요`);
  } else if (u) {
    use(cat, it); SFX.tick(); toast(`<b>${esc(it.name)}</b>${cat === 'title' ? '을(를) 달았어요' : '(으)로 바꿨어요'}`);
  } else return;
  updateHUD(); renderStore();
};
