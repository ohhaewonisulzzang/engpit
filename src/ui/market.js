import { $ } from '../dom.js';
import { state } from '../state.js';
import { FREE, RAR, EXCHANGE } from '../config.js';
import { SFX } from '../sound.js';
import { SHOP, owns, wearing, buy, wear, missingOf, exchange, TITLES, titleState, claimTitle, setTitle, rewardText } from '../market.js';
import { toast, updateHUD } from './common.js';
import { openModal } from './dex.js';

/* =========================================================
   상점 화면 (tab-shop): 꾸미기 / 조각 교환소 / 칭호
   ========================================================= */
let view = 'deco', deco = 'skin';
const KIND = { skin: '모자', theme: '테마', sfx: '정답 효과음' };
const VIEWS = { deco: '꾸미기', trade: '조각 교환소', title: '칭호' };

export function renderMarket() {
  $('mkHead').innerHTML = `<div><h2>상점</h2><p>단어를 맞혀 모은 코인으로 꾸미고, 조각으로 무기를 바꾸고, 칭호를 모아 보세요.</p></div>
    <div class="mk-wallet"><span><i class="ci"></i><b>${FREE ? '∞' : state.coins}</b>코인</span><span><i class="si"></i><b>${state.shards}</b>조각</span></div>`;
  $('mkNav').innerHTML = Object.entries(VIEWS).map(([k, n]) => `<button data-view="${k}" class="${view === k ? 'on' : ''}">${n}</button>`).join('');
  ({ deco: renderDeco, trade: renderTrade, title: renderTitles })[view]();
}
$('mkNav').onclick = e => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  view = b.dataset.view; SFX.tick(); renderMarket();
};

/* ---------- 꾸미기 ---------- */
function renderDeco() {
  const list = SHOP[deco], on = wearing(deco);
  $('mkBody').innerHTML = `<div class="mk-kinds">${Object.entries(KIND).map(([k, n]) => `<button class="chip${deco === k ? ' on' : ''}" data-kind="${k}">${n}</button>`).join('')}</div>
    <div class="mk-grid">${list.map(it => {
      const have = owns(deco, it.id), worn = on === it.id;
      const act = worn ? '<span class="mk-worn">쓰는 중</span>'
        : have ? `<button class="btn" data-wear="${it.id}">쓰기</button>`
        : `<button class="btn primary mk-buy" data-buy="${it.id}"><i class="ci"></i>${it.price}</button>`;
      return `<div class="mk-card${worn ? ' worn' : ''}">
        <div class="mk-prev">${preview(deco, it)}</div>
        <b>${it.name}</b><small>${it.desc}</small>
        <div class="mk-act">${act}</div></div>`;
    }).join('')}</div>`;
  if (deco === 'skin') $('mkBody').querySelectorAll('canvas[data-skin]').forEach(c => drawHat(c, SHOP.skin.find(s => s.id === c.dataset.skin)));
}
function preview(kind, it) {
  if (kind === 'skin') return `<canvas data-skin="${it.id}" width="120" height="120"></canvas>`;
  if (kind === 'theme') {
    const [bg, bg2, sf, , line] = it.c;
    return `<div class="mk-mini" style="background:${bg};border-color:${line}"><i style="background:${bg2}"></i><i style="background:${sf}"></i><i style="background:${sf};width:40%"></i><em></em></div>`;
  }
  return `<button class="mk-play" data-play="${it.id}" aria-label="${it.name} 들어 보기"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>`;
}
// 모자 미리보기: 전투 캐릭터와 같은 모양
function drawHat(c, s) {
  const x = c.getContext('2d'), r = 34, cx = 60, cy = 64;
  x.clearRect(0, 0, 120, 120);
  x.save(); x.translate(cx, cy); x.rotate(-.42);
  x.fillStyle = '#f3efe6'; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
  if (s.cap === 'rainbow') {
    const g = x.createLinearGradient(-r, 0, r, 0);
    ['#ff5a72', '#ffc83d', '#4fd18b', '#3d8bff', '#a46bff'].forEach((col, i) => g.addColorStop(i / 4, col));
    x.fillStyle = g;
  } else x.fillStyle = s.cap;
  x.beginPath(); x.arc(0, 0, r, Math.PI, 0); x.closePath(); x.fill();
  x.fillStyle = s.band; x.fillRect(-r, -2, r * 2, 6);
  x.rotate(.42);
  x.fillStyle = '#14161c';
  for (const ex of [-11, 11]) { x.beginPath(); x.arc(ex, 14, 5, 0, Math.PI * 2); x.fill(); }
  x.restore();
}
function onDeco(e) {
  const k = e.target.closest('[data-kind]'); if (k) { deco = k.dataset.kind; SFX.tick(); return renderDeco(); }
  const p = e.target.closest('[data-play]'); if (p) return SHOP.sfx.find(s => s.id === p.dataset.play).play();
  const w = e.target.closest('[data-wear]');
  if (w) { wear(deco, w.dataset.wear); SFX.tick(); toast(`${SHOP[deco].find(s => s.id === w.dataset.wear).name}로 바꿨어요`); return renderMarket(); }
  const b = e.target.closest('[data-buy]'); if (!b) return;
  // 한 번 누르면 확인, 3초 안에 한 번 더 누르면 산다 (잘못 눌러서 사는 것 방지)
  if (!b.classList.contains('sure')) {
    $('mkBody').querySelectorAll('.mk-buy.sure').forEach(x => { x.classList.remove('sure'); x.innerHTML = x.dataset.label; });
    b.dataset.label = b.innerHTML; b.classList.add('sure'); b.textContent = '정말 살까요?';
    clearTimeout(b._t); b._t = setTimeout(() => { if (b.isConnected) { b.classList.remove('sure'); b.innerHTML = b.dataset.label; } }, 3000);
    return;
  }
  const it = SHOP[deco].find(s => s.id === b.dataset.buy), res = buy(deco, it.id);
  if (res === 'poor') { SFX.wrong(); toast(`코인이 ${it.price - state.coins}개 모자라요. 단어 테스트에서 모아 보세요.`); return renderMarket(); }
  if (res === 'ok') { SFX.up(2); toast(`${it.name}을(를) 샀어요! 바로 쓰는 중이에요`); if (deco === 'sfx') it.play(); }
  updateHUD(); renderMarket();
}

/* ---------- 조각 교환소 ---------- */
function renderTrade() {
  $('mkBody').innerHTML = `<p class="mk-note">조각을 내면 고른 등급의 무기 하나를 확정으로 받아요. 아직 없는 무기가 먼저 나오고, 그 등급을 다 모았으면 가진 무기가 하나 더 생겨서 전투 레벨이 올라가요.</p>
    <div class="ex-row">${Object.entries(EXCHANGE).map(([r, cost]) => {
      const R = RAR[r], miss = missingOf(r).length, can = state.shards >= cost;
      return `<div class="ex-ticket${r === 'ultra' ? ' ultra' : ''}" style="--rc:${R.color}">
        <span class="ex-rar${r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${R.name}</span>
        <div class="ex-cost"><b>${cost}</b>조각</div>
        <div class="bar"><i style="width:${Math.min(1, state.shards / cost) * 100}%"></i></div>
        <small>${miss ? `아직 없는 무기 ${miss}종` : '다 모았어요 · 전투 레벨 올리기'}</small>
        <button class="btn${can ? ' primary' : ''}" data-ex="${r}" ${can ? '' : 'disabled'}>${can ? '교환하기' : `${cost - state.shards}개 더 필요`}</button>
      </div>`;
    }).join('')}</div>
    <p class="mk-note">조각은 도감에서 남는 희귀·초희귀를 분해하거나 전투에서 적을 잡으면 모여요.</p>`;
}
function onTrade(e) {
  const b = e.target.closest('[data-ex]'); if (!b) return;
  const got = exchange(b.dataset.ex); if (!got) return;
  const R = RAR[got.w.r];
  SFX.fanfare(R.rank);
  toast(`${got.isNew ? 'NEW! ' : ''}${R.name} <b>${got.w.name}</b>을(를) 받았어요`);
  updateHUD(); renderMarket(); openModal(got.w);
}

/* ---------- 칭호 ---------- */
const ORDER = { ready: 0, locked: 1, done: 2 };
function renderTitles() {
  const rows = TITLES.map(t => ({ t, st: titleState(t), g: t.goal() }))
    .sort((a, b) => ORDER[a.st] - ORDER[b.st] || (b.g[0] / b.g[1]) - (a.g[0] / a.g[1]));
  $('mkBody').innerHTML = `<p class="mk-note">조건을 채우면 보상을 받고, 받은 칭호 하나를 골라 이름 옆에 달 수 있어요.</p>
    <div class="tt-list">${rows.map(({ t, st, g }) => {
      const cur = Math.min(g[0], g[1]), main = state.title === t.id;
      const btn = st === 'ready' ? `<button class="btn primary" data-claim="${t.id}">보상 받기</button>`
        : st === 'done' ? `<button class="btn${main ? ' on' : ''}" data-main="${t.id}">${main ? '다는 중' : '달기'}</button>`
        : '';
      return `<div class="tt-row ${st}">
        <div class="tt-main"><b>${t.name}</b><small>${t.desc}</small>
          ${st === 'done' ? '' : `<div class="bar"><i style="width:${cur / g[1] * 100}%"></i></div><span class="tt-num">${cur.toLocaleString()} / ${g[1].toLocaleString()}</span>`}</div>
        <div class="tt-side"><span class="tt-reward">${st === 'done' ? '받음' : rewardText(t.reward)}</span>${btn}</div>
      </div>`;
    }).join('')}</div>`;
}
function onTitles(e) {
  const c = e.target.closest('[data-claim]');
  if (c) {
    const t = TITLES.find(x => x.id === c.dataset.claim);
    if (!claimTitle(t.id)) return;
    SFX.up(3); toast(`칭호 <b>${t.name}</b>! ${rewardText(t.reward)}를 받았어요`);
    updateHUD(); return renderMarket();
  }
  const m = e.target.closest('[data-main]'); if (!m) return;
  setTitle(m.dataset.main); SFX.tick(); updateHUD(); renderMarket();
}

$('mkBody').onclick = e => ({ deco: onDeco, trade: onTrade, title: onTitles })[view](e);
// 다른 곳(칭호 알림)에서 바로 칭호 화면을 열 때
export function openTitles() { view = 'title'; }
