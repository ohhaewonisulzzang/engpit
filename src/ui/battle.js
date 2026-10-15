import { $ } from '../dom.js';
import { state, save } from '../state.js';
import { RAR } from '../config.js';
import { SFX } from '../sound.js';
import { WEAPONS } from '../three/weapons.js';
import { thumb } from './dex.js';
import { toast, esc } from './common.js';
import { metas, equipMeta, isWorn } from '../meta.js';
import { galaxyHTML, bindGalaxy } from './galaxy.js';
import { beginRun, submitWave, submitPro, session, rankReady } from '../ranking.js';
import { G, hooks, startRun, choosePerk, setPaused, quitRun, clearRun } from '../battle/game.js';
import { ARMS, KIND_NAME, MAX_EQUIP, PERKS, WAVE_LEN, MAX_ARM_LV, armLevel, lvMult, galaxyOn, PRO_HP, PRO_DMG, proCost } from '../battle/data.js';

/* =========================================================
   전투 화면: 무기 장착(로비), HUD, 웨이브 효과 고르기, 결과
   - 하드 모드: 로비 아래에서 단계를 고르고 조각을 내고 출격. 기록은 프로랭킹으로
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
const power = id => Math.round(ARMS[id].dmg * lvMult(armLevel(id)));
// 하드 모드: 일반 전투처럼 웨이브 1부터, 적만 더 세다 (battle/data.js의 PRO_HP·PRO_DMG)
const pct = k => Math.round((k - 1) * 100);
function hardHTML() {
  const cost = proCost(), pb = state.proBest;
  return `<div class="hard">
    <div class="hard-head"><div><b>하드 모드</b>
      <p>조각을 내고 들어가는 어려운 전투예요. 일반 전투처럼 웨이브 1부터 시작하지만 적의 체력과 공격력이 ${pct(PRO_HP)}%씩 더 세고, 조각이 떨어지지 않아요. 기록은 <b>프로랭킹</b>에 올라가요.</p></div>
      <div class="hard-best"><b>${pb ? pb.wave : 0}</b>하드 최고 웨이브</div></div>
    <div class="hard-go"><span>가진 조각 <i class="si"></i>${state.shards}</span>
      <button class="btn hell" id="bHard" ${state.shards >= cost ? '' : 'disabled'}>하드 모드 출격 · 조각 ${cost || '무료'}</button></div>
  </div>`;
}

/* ---------- 메타 고르기: 메타 탭에서 만든 무기 3개 조합을 눌러 한 번에 장착 ---------- */
function metaHTML(eq) {
  const list = metas();
  return `<div class="bl-label">메타 <small>${list.length ? '누르면 그 조합으로 장착해요' : ''}</small></div>
    ${list.length ? `<div class="bmetas">${list.map(m => `<button class="bmeta${isWorn(m, eq) ? ' on' : ''}" data-meta="${m.id}">
        <b>${esc(m.name)}</b><span>${m.arms.map(id => { const w = byId(id); return w ? `<img src="${thumb(w, !!state.inv[id])}" alt="${w.name}" title="${w.name}">` : ''; }).join('')}</span>
        ${isWorn(m, eq) ? '<em>장착 중</em>' : ''}</button>`).join('')}</div>`
      : '<p class="bmeta-empty">아직 메타가 없어요. <button class="btn" data-tab="meta">메타 만들러 가기</button></p>'}`;
}

/* ---------- 로비 ---------- */
export function renderBattle() {
  if (G) return; // 전투 중이거나 결과 화면
  const eq = equipped(), best = state.best;
  const owned = [...WEAPONS].reverse().filter(w => state.inv[w.id]);
  const slot = id => {
    if (!id) return '<div class="slot empty"><span>빈 칸</span></div>';
    const w = byId(id);
    // 장착 칸: 무기 정보 + 갤럭시 파워 착용/해금
    return `<div class="slot" style="--rc:${RAR[w.r].color}"><div class="slot-main"><img src="${thumb(w, true)}" alt="">
      <div><b>${w.name}</b><small>전투 Lv.${armLevel(id)} · ${KIND_NAME[ARMS[id].kind]} · 공격력 ${power(id)}</small></div>
      <button class="out" data-un="${id}" aria-label="${w.name} 빼기">빼기</button></div>${galaxyHTML(w, true)}</div>`;
  };
  const card = w => {
    const on = eq.includes(w.id), r = RAR[w.r];
    return `<button class="acard${on ? ' on' : ''}" style="--rc:${r.color}" data-eq="${w.id}">
      ${on ? '<em>장착 중</em>' : ''}<img src="${thumb(w, true)}" alt="">
      <span class="rl${w.r === 'ultra' ? ' ultra-c' : ''}"><i class="cap-ic"></i>${r.name}</span>
      <b>${w.name}</b><small>Lv.${armLevel(w.id)} · ${KIND_NAME[ARMS[w.id].kind]}${galaxyOn(w.id) ? ' · ✦' : ''}</small></button>`;
  };
  $('bLobby').innerHTML = `<div class="bl-box">
    <div class="bl-head">
      <div><h2>전투</h2><p>뽑은 무기로 몰려오는 적을 버텨요. ${WAVE_LEN}초를 버티면 보스가 나오고, 보스를 잡으면 효과를 하나 골라 더 강해져요. 적이 떨어뜨린 <i class="si"></i>조각으로 행운과 뽑기 기계를 업그레이드할 수 있어요.</p></div>
      <div class="bl-best"><b>${best ? best.wave : 0}</b>최고 웨이브</div>
    </div>
    ${metaHTML(eq)}
    <div class="bl-label">장착한 무기 <small>${eq.length}/${MAX_EQUIP}${eq.length ? ' · 갤럭시 파워도 여기서 착용할 수 있어요' : ' · 비어 있으면 맨주먹으로 싸워요'}</small></div>
    <div class="slots">${Array.from({ length: MAX_EQUIP }, (_, i) => slot(eq[i])).join('')}</div>
    <div class="bl-label">가진 무기 <small>도감에서 조각으로 전투 레벨을 올려요 (최대 ${MAX_ARM_LV})</small></div>
    <div class="armgrid">${owned.length ? owned.map(card).join('') : '<p class="bl-empty">아직 무기가 없어요. 뽑기에서 무기를 뽑아 오세요.</p>'}</div>
    ${hardHTML()}
    <div class="bl-go"><span>이동: WASD·방향키 또는 화면을 누르고 끌기 · 일시정지: Esc</span><button class="btn primary" id="bStart">출격하기</button></div>
  </div>`;
}
bindGalaxy($('bLobby'), renderBattle);
$('bLobby').onclick = e => {
  if (e.target.closest('#bStart')) return go();
  if (e.target.closest('#bHard')) return go(0);
  if (e.target.closest('[data-gp-buy],[data-gp-toggle]')) return;
  const mb = e.target.closest('[data-meta]');
  if (mb) {
    const miss = equipMeta(mb.dataset.meta);
    SFX.tick(); if (miss > 0) toast(`없는 무기 ${miss}개는 빼고 장착했어요`);
    return renderBattle();
  }
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
// pro: 하드 모드면 0 (없으면 일반 전투). 하드 모드는 출격할 때마다 조각을 낸다
function go(pro = null) {
  if (pro != null) {
    const cost = proCost();
    if (state.shards < cost) { SFX.wrong(); toast('조각이 모자라요'); return; }
    state.shards -= cost; save();
  }
  clearRun(); startRun(equipped(), pro);
  beginRun(); // 랭킹용 판 번호 받기 (로그인했을 때만)
  ['bLobby', 'bEnd', 'bPerk', 'bPause'].forEach(id => show(id, false));
  $('bShards').parentElement.hidden = pro != null; // 하드 모드는 조각이 안 나온다
  $('bhud').hidden = false; SFX.pop();
}

/* ---------- 전투 중 ---------- */
hooks.hud = g => {
  const p = g.p;
  $('bHp').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
  $('bHpT').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('bWave').textContent = g.pro == null ? `웨이브 ${g.wave}` : `하드 · 웨이브 ${g.wave}`;
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
      <p class="small">${G.pro == null ? '그만둬도 지금까지 모은 조각은 그대로 받아요.' : '그만둬도 지금까지의 기록은 프로랭킹에 올라가요. 입장 조각은 돌려받지 못해요.'}</p></div>`;
    $('bResume').onclick = () => setPaused(false);
    $('bQuit').onclick = () => { show('bPause', false); quitRun(); };
  }
  show('bPause', on);
};
$('bPauseBtn').onclick = () => setPaused(true);

hooks.end = s => {
  $('bhud').hidden = true; $('bBanner').className = 'bbanner'; show('bPerk', false); show('bPause', false);
  const pro = s.pro != null, board = pro ? '프로랭킹' : '랭킹';
  const cost = pro ? proCost() : 0, retry = pro ? `다시 도전 · 조각 ${cost || '무료'}` : '다시 도전';
  $('bEnd').innerHTML = `<div class="bp-box"><h2>${pro ? '하드 모드 · ' : ''}${s.gaveUp ? '전투 종료' : '쓰러졌어요'}</h2>${s.rec ? '<div class="rec">최고 기록!</div>' : ''}
    <div class="end-stats"><div><b>${s.wave}</b>웨이브</div><div><b>${s.kills}</b>처치</div><div><b>${fmt(s.time)}</b>버틴 시간</div>${pro ? '' : `<div><b><i class="si"></i>${s.shards}</b>얻은 조각</div>`}</div>
    <p>${pro ? '하드 모드 기록은 이번 달 프로랭킹에 올라가요.' : '조각은 도감 탭에서 행운과 뽑기 기계 업그레이드에 쓸 수 있어요.'}</p>
    <p class="rk-sent" id="bRank">${rankReady() ? (session ? `${board}에 기록을 올리는 중…` : `로그인하면 이 기록이 이번 달 ${board}에 올라가요 (랭킹 탭)`) : ''}</p>
    <div class="fg-btns center"><button class="btn" id="bToLobby">무기 바꾸기</button><button class="btn ${pro ? 'hell' : 'primary'}" id="bRetry" ${state.shards >= cost ? '' : 'disabled'}>${retry}</button></div></div>`;
  show('bEnd', true);
  // 이번 판 결과를 월간 랭킹(하드 모드는 프로랭킹)에 올림 (서버가 이번 달 최고 기록보다 좋을 때만 바꿈)
  if (session && rankReady()) (pro ? submitPro(s.pro, s.wave, s.kills) : submitWave(s.wave, s.kills))
    .then(r => { if ($('bRank')) $('bRank').textContent = {
      ok: `${board}에 기록했어요. 랭킹 탭에서 순위를 확인해 보세요!`, test: `테스트 모드에서는 ${board}에 올리지 않아요`,
      hidden: '이 계정은 랭킹에 올라가지 않아요', norun: '판을 시작할 때 랭킹 서버에 연결되지 않아 이번 판은 기록되지 않았어요', off: '',
    }[r]; })
    .catch(() => { if ($('bRank')) $('bRank').textContent = `${board}에 올리지 못했어요 (인터넷 연결이나 기록을 확인할 수 없었어요)`; });
  $('bRetry').onclick = () => go(s.pro);
  $('bToLobby').onclick = () => { show('bEnd', false); clearRun(); renderBattle(); show('bLobby', true); };
};

// 다른 탭으로 가면 자동으로 일시정지
export const leaveBattle = () => setPaused(true);
