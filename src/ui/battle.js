import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { RAR } from '../config.js';
import { SFX } from '../sound.js';
import { WEAPONS } from '../three/weapons.js';
import { thumb } from './dex.js';
import { toast } from './common.js';
import { G, hooks, startRun, choosePerk, setPaused, quitRun, clearRun } from '../battle/game.js';
import { ARMS, KIND_NAME, MAX_EQUIP, PERKS, WAVE_LEN, armLevel, lvMult } from '../battle/data.js';

/* =========================================================
   전투 화면: 무기 장착(로비), HUD, 웨이브 효과 고르기, 결과
   ========================================================= */
const show = (id, on) => $(id).classList.toggle('show', on);
const byId = id => WEAPONS.find(w => w.id === id);
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// 장착한 무기 (처음 한 번은 가진 것 중 좋은 무기부터 자동으로 채움)
export function equipped() {
  if (!Array.isArray(state.equip)) state.equip = [...WEAPONS].reverse().filter(w => state.inv[w.id]).slice(0, MAX_EQUIP).map(w => w.id);
  state.equip = state.equip.filter(id => state.inv[id]).slice(0, MAX_EQUIP);
  return state.equip;
}
const power = id => Math.round(ARMS[id].dmg * lvMult(armLevel(state.inv[id])));

/* ---------- 로비 ---------- */
export function renderBattle() {
  if (G) return; // 전투 중이거나 결과 화면
  const eq = equipped(), best = state.best;
  const owned = [...WEAPONS].reverse().filter(w => state.inv[w.id]);
  const slot = id => {
    if (!id) return '<div class="slot empty"><span>빈 칸</span></div>';
    const w = byId(id);
    return `<button class="slot" style="--rc:${RAR[w.r].color}" data-un="${id}"><img src="${thumb(w, true)}" alt="">
      <div><b>${w.name}</b><small>전투 Lv.${armLevel(state.inv[id])} · ${KIND_NAME[ARMS[id].kind]} · 공격력 ${power(id)}</small></div><span class="out">빼기</span></button>`;
  };
  const card = w => {
    const on = eq.includes(w.id), r = RAR[w.r];
    return `<button class="acard${on ? ' on' : ''}" style="--rc:${r.color}" data-eq="${w.id}">
      ${on ? '<em>장착 중</em>' : ''}<img src="${thumb(w, true)}" alt="">
      <span class="rl${w.r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name}</span>
      <b>${w.name}</b><small>Lv.${armLevel(state.inv[w.id])} · ${KIND_NAME[ARMS[w.id].kind]}</small></button>`;
  };
  $('bLobby').innerHTML = `<div class="bl-box">
    <div class="bl-head">
      <div><h2>전투</h2><p>뽑은 무기로 몰려오는 적을 버텨요. ${WAVE_LEN}초를 버티면 보스가 나오고, 보스를 잡으면 효과를 하나 골라 더 강해져요. 적이 떨어뜨린 <i class="si"></i>조각으로 행운과 뽑기 기계를 업그레이드할 수 있어요.</p></div>
      <div class="bl-best"><b>${best ? best.wave : '-'}</b>최고 웨이브</div>
    </div>
    <div class="bl-label">장착한 무기 <small>${eq.length}/${MAX_EQUIP}${eq.length ? '' : ' · 비어 있으면 맨주먹으로 싸워요'}</small></div>
    <div class="slots">${Array.from({ length: MAX_EQUIP }, (_, i) => slot(eq[i])).join('')}</div>
    <div class="bl-label">가진 무기 <small>같은 무기를 많이 가질수록 전투 레벨이 올라요 (최대 10)</small></div>
    <div class="armgrid">${owned.length ? owned.map(card).join('') : '<p class="bl-empty">아직 무기가 없어요. 뽑기에서 무기를 뽑아 오세요.</p>'}</div>
    <div class="bl-go"><span>이동: WASD·방향키 또는 화면을 누르고 끌기 · 일시정지: Esc</span><button class="btn primary" id="bStart">출격하기</button></div>
  </div>`;
}
$('bLobby').onclick = e => {
  if (e.target.closest('#bStart')) return go();
  const un = e.target.closest('[data-un]'), eb = e.target.closest('[data-eq]');
  const eq = equipped();
  if (un) state.equip = eq.filter(x => x !== un.dataset.un);
  else if (eb) {
    const id = eb.dataset.eq;
    if (eq.includes(id)) state.equip = eq.filter(x => x !== id);
    else if (eq.length >= MAX_EQUIP) { toast(`${MAX_EQUIP}칸이 가득 찼어요. 위에서 하나를 빼고 넣어 주세요.`); SFX.wrong(); return; }
    else eq.push(id);
  } else return;
  save(); SFX.tick(); renderBattle();
};
function go() {
  clearRun(); startRun(equipped());
  ['bLobby', 'bEnd', 'bPerk', 'bPause'].forEach(id => show(id, false));
  $('bhud').hidden = false; SFX.pop();
}

/* ---------- 전투 중 ---------- */
hooks.hud = g => {
  const p = g.p;
  $('bHp').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
  $('bHpT').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('bWave').textContent = `웨이브 ${g.wave}`;
  $('bTime').textContent = { fight: `보스까지 ${Math.ceil(WAVE_LEN - g.waveT)}초`, boss: '보스를 쓰러뜨리세요!', clear: '클리어!' }[g.phase] || '';
  $('bShards').textContent = g.shards; $('bKills').textContent = g.kills;
  const b = g.boss; $('bBoss').hidden = !b;
  if (b) { $('bBossName').textContent = b.name + (b.round ? ` +${b.round}` : ''); $('bBossHp').style.width = Math.max(0, b.hp / b.maxHp * 100) + '%'; }
};
hooks.banner = (txt, col) => {
  const b = $('bBanner'); b.textContent = txt; b.style.setProperty('--rc', col);
  b.className = 'bbanner'; void b.offsetWidth; b.className = 'bbanner show';
};
hooks.perk = list => {
  $('bPerk').innerHTML = `<div class="bp-box"><h2>웨이브 ${G.wave} 클리어!</h2><p>효과를 하나 골라요. 체력도 조금 회복돼요.</p>
    <div class="perks">${list.map((k, i) => `<button class="perk" data-id="${k.id}"><kbd>${i + 1}</kbd><span class="pi">${k.ic}</span>
      <b>${k.name}</b><small>${k.desc}</small>${G.perks[k.id] ? `<em>지금 ${G.perks[k.id]}단계</em>` : ''}</button>`).join('')}</div></div>`;
  show('bPerk', true);
};
const pick = id => { show('bPerk', false); choosePerk(id); };
$('bPerk').onclick = e => { const b = e.target.closest('.perk'); if (b) pick(b.dataset.id); };
addEventListener('keydown', e => {
  if (!$('bPerk').classList.contains('show') || $('tab-battle').offsetParent === null) return;
  const b = $('bPerk').querySelectorAll('.perk')[+e.key - 1]; if (b) pick(b.dataset.id);
});

hooks.pause = on => {
  if (on) {
    const got = PERKS.filter(k => G.perks[k.id]);
    $('bPause').innerHTML = `<div class="bp-box"><h2>일시정지</h2>
      <p>웨이브 ${G.wave} · 처치 ${G.kills} · 조각 ${G.shards}</p>
      ${got.length ? `<div class="owned-perks">${got.map(k => `<span><i>${k.ic}</i>${k.name} ${G.perks[k.id]}</span>`).join('')}</div>` : ''}
      <div class="fg-btns center"><button class="btn" id="bQuit">그만하기</button><button class="btn primary" id="bResume">계속하기</button></div>
      <p class="small">그만둬도 지금까지 모은 조각은 그대로 받아요.</p></div>`;
    $('bResume').onclick = () => setPaused(false);
    $('bQuit').onclick = () => { show('bPause', false); quitRun(); };
  }
  show('bPause', on);
};
$('bPauseBtn').onclick = () => setPaused(true);

hooks.end = s => {
  $('bhud').hidden = true; $('bBanner').className = 'bbanner'; show('bPerk', false); show('bPause', false);
  $('bEnd').innerHTML = `<div class="bp-box"><h2>${s.gaveUp ? '전투 종료' : '쓰러졌어요'}</h2>${s.rec ? '<div class="rec">최고 기록!</div>' : ''}
    <div class="end-stats"><div><b>${s.wave}</b>웨이브</div><div><b>${s.kills}</b>처치</div><div><b>${fmt(s.time)}</b>버틴 시간</div><div><b><i class="si"></i>${s.shards}</b>얻은 조각</div></div>
    <p>조각은 도감 탭에서 행운과 뽑기 기계 업그레이드에 쓸 수 있어요.</p>
    <div class="fg-btns center"><button class="btn" id="bToLobby">무기 바꾸기</button><button class="btn primary" id="bRetry">다시 도전</button></div></div>`;
  show('bEnd', true);
  $('bRetry').onclick = go;
  $('bToLobby').onclick = () => { show('bEnd', false); clearRun(); renderBattle(); show('bLobby', true); };
};

// 다른 탭으로 가면 자동으로 일시정지
export const leaveBattle = () => setPaused(true);
