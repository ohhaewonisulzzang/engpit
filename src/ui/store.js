import { $ } from '../dom.js';
import { state } from '../state.js';
import { FREE } from '../config.js';
import { SFX } from '../sound.js';
import { CATS, owns, using, canBuy, buy, use, paintHero } from '../shop.js';
import { toast, updateHUD, currentTab, esc } from './common.js';

/* =========================================================
   코인 상점 화면(tab-store): 캐릭터 스킨, 배경 테마, 효과음, 칭호
   - 아이템마다 미리보기(캐릭터·바닥 그림, 소리 듣기, 칭호 모양)가 있다
   ========================================================= */
let cat = 'skin';
// 랭킹 1등 보상(지옥의 군주 스킨)은 상점에서 팔지 않으므로, 받은 사람에게만 (쓰기 버튼으로) 보인다
const shownOf = k => CATS.find(x => x.key === k).list.filter(it => !it.pro || owns(k, it));
const TAU = Math.PI * 2;

export function renderStore() {
  const c = CATS.find(x => x.key === cat), list = shownOf(cat);
  const have = list.filter(it => owns(cat, it)).length;
  $('storeHead').innerHTML = `<div><h2>코인 상점</h2>
      <p>단어 테스트에서 모은 코인으로 캐릭터와 배경, 효과음, 칭호를 바꿔 보세요. 산 아이템은 언제든 다시 바꿔 쓸 수 있어요.</p></div>
    <div class="st-wallet"><i class="ci"></i><b>${FREE ? '∞' : state.coins}</b></div>`;
  $('storeSeg').innerHTML = CATS.map(x => `<button data-cat="${x.key}"${x.key === cat ? ' class="on"' : ''}>${x.name}</button>`).join('');
  $('storeNote').textContent = `${c.name} ${have}/${list.length}개 가짐`;
  $('storeGrid').innerHTML = list.map(it => {
    const own = owns(cat, it), on = using(cat, it);
    const btn = on ? `<button class="btn on" disabled>사용 중</button>`
      : own ? `<button class="btn" data-use="${it.id}">${cat === 'title' ? '달기' : '사용하기'}</button>`
      : `<button class="btn primary" data-buy="${it.id}" ${canBuy(it) ? '' : 'disabled'}>${canBuy(it) ? '구매' : '코인 부족'} <i class="ci"></i>${it.price}</button>`;
    return `<div class="st-card${on ? ' on' : ''}${own ? ' own' : ''}">
      <div class="st-pv">${preview(it)}</div>
      <b>${esc(it.name)}</b><small>${esc(it.desc)}</small>${btn}</div>`;
  }).join('');
  drawPreviews();
}

function preview(it) {
  if (cat === 'skin') return `<canvas class="st-cv" data-skin="${it.id}" width="160" height="120"></canvas>`;
  if (cat === 'theme') return `<canvas class="st-cv" data-theme="${it.id}" width="160" height="120"></canvas>`;
  if (cat === 'sfx') return `<div class="st-sfx"><button class="btn" data-play="ok" data-id="${it.id}">정답 ▶</button><button class="btn" data-play="no" data-id="${it.id}">오답 ▶</button></div>`;
  return `<span class="tchip st-title">${esc(it.name)}</span>`;
}

// 캐릭터·바닥 미리보기. 캐릭터는 움직이는 장식이 있어서 상점을 보는 동안 계속 그린다
let raf = 0;
function drawPreviews() {
  cancelAnimationFrame(raf);
  const cvs = [...document.querySelectorAll('#storeGrid canvas')];
  const list = CATS.find(x => x.key === cat).list;
  const frame = () => {
    const t = performance.now() / 1000;
    for (const cv of cvs) {
      const g = cv.getContext('2d'), it = list.find(x => x.id === (cv.dataset.skin || cv.dataset.theme));
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      if (cv.dataset.theme) { ground(g, it, cv.width, cv.height); continue; }
      g.translate(cv.width / 2, cv.height / 2 + 8); g.scale(2.6, 2.6);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 14 * .9, 14, 5.6, 0, 0, TAU); g.fill();
      paintHero(g, 14, it, { ox: Math.cos(t) * 4, oy: Math.sin(t * 1.3) * 2, t });
    }
    if (cat === 'skin' && currentTab === 'store') raf = requestAnimationFrame(frame);
  };
  frame();
}
// 전투 바닥과 같은 무늬를 작게
function ground(g, th, w, h) {
  const T = 40;
  for (let i = 0; i * T < w; i++) for (let j = 0; j * T < h; j++) {
    g.fillStyle = (i + j) & 1 ? th.a : th.b; g.fillRect(i * T, j * T, T, T);
  }
  const dots = [[20, 30, 'spot'], [110, 22, 'grass'], [60, 80, 'spark'], [130, 95, 'spot'], [30, 100, 'grass'], [90, 55, 'spark']];
  for (const [x, y, k] of dots) {
    if (k === 'grass') { g.strokeStyle = th.grass; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x - 7, y - 8); g.moveTo(x, y); g.lineTo(x, y - 10); g.moveTo(x + 5, y); g.lineTo(x + 7, y - 8); g.stroke(); }
    else { g.fillStyle = th[k]; g.beginPath(); g.ellipse(x, y, k === 'spot' ? 7 : 4, k === 'spot' ? 4.5 : 4, 0, 0, TAU); g.fill(); }
  }
}

$('storeSeg').onclick = e => {
  const b = e.target.closest('[data-cat]'); if (!b || b.dataset.cat === cat) return;
  cat = b.dataset.cat; SFX.tick(); renderStore();
};
$('storeGrid').onclick = e => {
  const list = CATS.find(x => x.key === cat).list;
  const p = e.target.closest('[data-play]');
  if (p) { list.find(x => x.id === p.dataset.id)[p.dataset.play](); return; }
  const b = e.target.closest('[data-buy]'), u = e.target.closest('[data-use]');
  if (b) {
    const it = list.find(x => x.id === b.dataset.buy);
    if (!buy(cat, it)) return;
    SFX.coin(); toast(`<b>${esc(it.name)}</b>을(를) 샀어요!`);
  } else if (u) {
    use(cat, list.find(x => x.id === u.dataset.use)); SFX.tick();
  } else return;
  updateHUD(); renderStore();
};
