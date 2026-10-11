import { $ } from '../dom.js';
import { state, monthKey } from '../state.js';
import { RAR, TEST_MODE } from '../config.js';
import { SFX } from '../sound.js';
import { WEAPONS } from '../three/weapons.js';
import { armLevel, galaxyOn, GALAXY, KIND_NAME, ARMS, MAX_ARM_LV } from '../battle/data.js';
import { session, rankReady, rpc, getRows, freshToken } from '../ranking.js';
import { findMatch, connectMatch } from '../pvp/net.js';
import { createSim, step, snapshot, forfeit } from '../pvp/sim.js';
import { makeView, takeEvents, blend, render } from '../pvp/view.js';
import { BANS, PICKS, BUDGET, COST, BAN_TIME, PICK_TIME, PICK_ORDER, ROUNDS_TO_WIN, ROUND_TIME, COUNTDOWN, DASH, PVP_HP, tierOf, nextTier } from '../pvp/rules.js';
import { thumb } from './dex.js';
import { toast, esc, currentTab } from './common.js';

/* =========================================================
   경쟁전 화면: 로비(티어·순위) → 매칭 → 밴픽 → 대결(3판 2선승) → 결과
   호스트(0)가 밴픽과 대결을 진행하고, 게스트(1)는 입력만 보내고 받은 화면을 그린다
   ========================================================= */
const show = (id, on) => $(id).classList.toggle('show', on);
const byId = id => WEAPONS.find(w => w.id === id);
const costOf = id => id === 'fists' ? 0 : COST[byId(id)?.r] ?? 0;
const season = () => monthKey();
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

// 경쟁전 진행 상태
let P = null;               // { role, me(0|1), matchId, opp, conn, info:[], D(밴픽), S(대결: 호스트만), V(화면) ... }
let lobbyBusy = null;       // 매칭 중이면 { cancel }
export const pvpBusy = () => !!P && P.stage !== 'end';

/* ---------- 내 정보 (가진 무기·레벨·갤럭시 파워) ---------- */
function myInfo() {
  const owned = {}, gal = [];
  for (const w of WEAPONS) if (state.inv[w.id]) { owned[w.id] = armLevel(state.inv[w.id]); if (galaxyOn(w.id)) gal.push(w.id); }
  return { name: session?.username || '나', owned, gal };
}
// 상대가 보낸 정보는 그대로 믿지 않고 정리한다 (없는 무기 id 버림, 레벨은 1~11 정수, 이름은 16자)
function cleanInfo(x) {
  const owned = {}, ids = new Set(WEAPONS.map(w => w.id));
  for (const [id, lv] of Object.entries(x?.owned || {})) if (ids.has(id)) owned[id] = Math.max(1, Math.min(MAX_ARM_LV, Math.floor(+lv) || 1));
  const gal = Array.isArray(x?.gal) ? x.gal.filter(id => owned[id] && GALAXY[id]) : [];
  return { name: String(x?.name || '상대').slice(0, 16), owned, gal };
}
const cleanLo = lo => [0, 1].map(i => (Array.isArray(lo?.[i]) ? lo[i] : []).slice(0, PICKS).map(e => ({
  id: e?.id === 'fists' || byId(e?.id) ? e.id : 'fists', lv: Math.max(1, Math.min(MAX_ARM_LV, Math.floor(+e?.lv) || 1)), gp: !!e?.gp && !!GALAXY[e?.id] })));
// 호스트(상대)가 보낸 화면 정보: 숫자는 숫자로, 단계 이름은 정해진 것만 (화면에 넣기 전에 정리)
const num = v => Number.isFinite(+v) ? +v : 0;
const nums = a => (Array.isArray(a) ? a : []).map(num);
const PHASES = ['count', 'fight', 'break', 'over'];
const EV_TYPES = ['sw', 'th', 'bo', 'rg', 'tx', 'dash', 'go', 'round', 'over'];
function cleanSnap(m) {
  const sc = [0, 1].map(i => Math.max(0, Math.min(ROUNDS_TO_WIN, Math.floor(num(m.sc?.[i])))));
  const ev = (Array.isArray(m.ev) ? m.ev : []).filter(e => e && EV_TYPES.includes(e.t)).slice(0, 200).map(e => ({
    t: e.t, i: num(e.i), o: num(e.o) ? 1 : 0, a: Math.max(0, Math.min(PICKS - 1, Math.floor(num(e.a)))), w: num(e.w),
    x: num(e.x), y: num(e.y), ang: num(e.ang), arc: num(e.arc), reach: num(e.reach), spin: num(e.spin), dir: num(e.dir) < 0 ? -1 : 1,
    r0: num(e.r0), r1: num(e.r1), b: !!e.b, c: /^#[0-9a-f]{3,8}$/i.test(e.c) ? e.c : '#ffffff',
    v: typeof e.v === 'number' ? Math.round(e.v) : ['회피', '막음', '기절!'].includes(e.v) ? e.v : '' }));
  const row = (a, n) => nums(a).slice(0, n);
  return { k: 's', t: num(m.t), ph: PHASES.includes(m.ph) ? m.ph : 'fight', pt: num(m.pt), rt: num(m.rt), rd: Math.max(1, Math.floor(num(m.rd)) || 1),
    sc, w: [0, 1].includes(m.w) ? m.w : -1, lr: num(m.lr),
    p: [0, 1].map(i => { const r = row(m.p?.[i], 11); while (r.length < 11) r.push(0); return r; }),
    oa: [0, 1].map(i => row(m.oa?.[i], PICKS)),
    sh: (Array.isArray(m.sh) ? m.sh : []).slice(0, 300).map(x => { const r = row(x, 7); r[1] = r[1] ? 1 : 0; r[2] = Math.max(0, Math.min(PICKS - 1, Math.floor(r[2]))); return r; }),
    z: (Array.isArray(m.z) ? m.z : []).slice(0, 50).map(x => { const r = row(x, 6); r[0] = r[0] ? 1 : 0; r[1] = Math.max(0, Math.min(PICKS - 1, Math.floor(r[1]))); return r; }),
    b: (Array.isArray(m.b) ? m.b : []).slice(0, 50).map(x => row(x, 4)), ev };
}
const cleanIds = a => (Array.isArray(a) ? a : []).filter(id => id === 'fists' || byId(id));
async function myRating() {
  if (!session) return { pts: 0, wins: 0, losses: 0 };
  try {
    const r = await getRows(`pvp_rating_view?season=eq.${season()}&user_id=eq.${session.uid}&select=pts,wins,losses`);
    return r?.[0] || { pts: 0, wins: 0, losses: 0 };
  } catch (e) { return { pts: 0, wins: 0, losses: 0, err: e.status || 1 }; }
}

/* =========================================================
   로비
   ========================================================= */
const MODENAV = `<div class="modenav seg"><button data-tab="battle">일반 전투</button><button data-tab="pvp" class="on">경쟁전</button></div>`;
export async function renderPvp() {
  if (P) return; // 경기 중
  ['pvQueue', 'pvDraft', 'pvEnd'].forEach(id => show(id, false));
  $('pvHud').hidden = true; show('pvLobby', true);
  const box = $('pvLobby');
  if (!rankReady() || !session) {
    box.innerHTML = `<div class="bl-box">${MODENAV}<div class="pv-intro"><h2>경쟁전</h2>
      <p>다른 사람과 실시간으로 1대1 대결을 해요. 이기면 티어 점수가 올라가요.</p>
      <div class="rk-cta"><span>경쟁전은 로그인해야 할 수 있어요.</span><button class="btn primary" data-tab="login">로그인 / 회원가입</button></div></div></div>`;
    return;
  }
  box.innerHTML = `<div class="bl-box">${MODENAV}<p class="rk-msg">불러오는 중…</p></div>`;
  const [r, top] = await Promise.all([myRating(), getRows(`pvp_rating_view?season=eq.${season()}&select=user_id,username,pts,wins,losses&order=pts.desc,wins.desc&limit=10`).catch(() => null)]);
  if (P || currentTab !== 'pvp') return;
  const tier = tierOf(r.pts), nt = nextTier(r.pts);
  const prog = nt ? (r.pts - tier.min) / (nt.min - tier.min) : 1;
  box.innerHTML = `<div class="bl-box">${MODENAV}
    <div class="pv-head">
      <div class="pv-tier" style="--tc:${tier.color}"><span class="pv-emb">${tier.name[0]}</span>
        <div><small>${+season().slice(5)}월 시즌</small><b>${tier.name}</b><span>${r.pts}점 · ${r.wins}승 ${r.losses}패</span>
        <div class="bar"><i style="width:${prog * 100}%"></i></div><em>${nt ? `${nt.name}까지 ${nt.min - r.pts}점` : '최고 티어!'}</em></div></div>
      <div class="pv-go">
        <button class="btn primary big" id="pvQuick">빠른 대전</button>
        <div class="pv-room"><button class="btn" id="pvMake">친구 방 만들기</button>
          <form id="pvJoinF"><input id="pvCode" inputmode="numeric" maxlength="4" placeholder="방 코드 4자리" autocomplete="off"><button class="btn">들어가기</button></form></div>
      </div>
    </div>
    ${r.err === 404 ? '<p class="rk-msg">경쟁전 서버 설정이 아직 안 됐어요. (supabase/pvp.sql 실행 필요)</p>' : ''}
    <div class="pv-rules"><b>규칙</b><ul>
      <li>1대1 넉아웃, <b>3판 2선승</b>. 한 판에 목숨은 하나, 40초가 지나면 독 안개가 좁혀 와요.</li>
      <li>이동하면 무기가 알아서 공격해요. <b>대시</b>(Space 또는 대시 버튼)를 쓰는 동안은 무적이에요.</li>
      <li>시작 전에 각자 <b>${BANS}개를 밴</b>하고 1-2-2-1 순서로 <b>${PICKS}개씩</b> 골라요. 같은 무기는 한 사람만.</li>
      <li>비용: 울트라 ${COST.ultra}, 레전더리 ${COST.legend}, 영웅 ${COST.hero}, 희귀·초희귀 0점. <b>합이 ${BUDGET}점 이하</b>.</li>
      <li>이기면 +25점, 지면 -15점. 같은 상대와는 하루 3판까지만 점수가 바뀌어요.</li>
    </ul></div>
    <h3>${+season().slice(5)}월 경쟁전 순위</h3>
    ${top?.length ? `<ol class="rk-list">${top.map((x, i) => `<li class="rk-row${x.user_id === session.uid ? ' me' : ''}">
      <span class="rk-no"${i < 3 ? ` style="--mc:${['#ffc83d', '#c9d3dc', '#d08a4a'][i]}"` : ''}>${i + 1}</span>
      <b>${esc(x.username)}</b><span class="pv-t" style="color:${tierOf(x.pts).color}">${tierOf(x.pts).name}</span><span class="rk-sh">${x.pts}<small>점</small></span><span class="rk-k">${x.wins}승 ${x.losses}패</span></li>`).join('')}</ol>`
      : '<p class="rk-msg">이번 시즌 첫 경기의 주인공이 되어 보세요!</p>'}
  </div>`;
  $('pvQuick').onclick = () => startSearch(null, r.pts);
  $('pvMake').onclick = () => startSearch({ code: String(1000 + Math.floor(Math.random() * 9000)), creator: true }, r.pts);
  $('pvJoinF').onsubmit = e => {
    e.preventDefault();
    const code = $('pvCode').value.trim();
    if (!/^\d{4}$/.test(code)) { toast('방 코드는 숫자 4자리예요'); SFX.wrong(); return; }
    startSearch({ code, creator: false }, r.pts);
  };
}

/* ---------- 매칭 ---------- */
function startSearch(room, pts) {
  if (lobbyBusy) return;
  SFX.pop();
  const t0 = Date.now();
  show('pvQueue', true);
  const paint = () => {
    $('pvQueue').innerHTML = `<div class="bp-box"><div class="pv-spin"></div>
      <h2>${room ? (room.creator ? '친구를 기다리는 중' : '방에 들어가는 중') : '상대를 찾는 중'}</h2>
      ${room?.creator ? `<p>친구에게 방 코드를 알려 주세요</p><div class="pv-code">${room.code}</div>` : `<p>${fmtT((Date.now() - t0) / 1000)}</p>`}
      <div class="fg-btns center"><button class="btn" id="pvCancel">취소</button></div></div>`;
    $('pvCancel').onclick = cancelSearch;
  };
  paint();
  const tick = setInterval(() => { if (!lobbyBusy) return clearInterval(tick); if (!room?.creator) paint(); }, 1000);
  const me = { uid: session.uid, name: session.username, pts };
  lobbyBusy = findMatch({
    me, room,
    createMatch: guest => rpc('pvp_create_match', { p_guest: guest }),
    joinMatch: id => rpc('pvp_join_match', { p_match: id }),
    onFound: r => { clearInterval(tick); lobbyBusy = null; show('pvQueue', false); beginMatch(r, me); },
    onError: e => { console.warn('matchmaking', e); },
  });
}
function cancelSearch() { lobbyBusy?.cancel(); lobbyBusy = null; show('pvQueue', false); SFX.tick(); }

/* =========================================================
   매치 시작: 연결 → 서로 정보 교환 → 밴픽
   ========================================================= */
async function beginMatch({ role, matchId, opp }, me) {
  SFX.fanfare(2);
  const token = await freshToken();
  if (!token) { toast('로그인이 만료됐어요. 다시 로그인해 주세요'); return renderPvp(); }
  const conn = connectMatch({ matchId, role, me, opp, token });
  P = { role, me: role === 'host' ? 0 : 1, matchId, opp, conn, info: [], stage: 'connect', timers: [], leftT: 0 };
  P.info[P.me] = myInfo();
  show('pvLobby', false); show('pvDraft', true);
  $('pvDraft').innerHTML = `<div class="bp-box"><div class="pv-spin"></div><h2>${esc(opp.name)} 님과 연결하는 중</h2><p>잠깐만 기다려 주세요</p></div>`;
  conn.on(onMsg);
  conn.onState(s => {
    if (s === 'ready') { sayHello(); }
    if (s === 'error' && P?.stage === 'connect') abort('경기 채널에 들어가지 못했어요. 서버 설정(pvp.sql)을 확인해 주세요');
    if (s === 'left') { clearTimeout(P.leftT); P.leftT = setTimeout(oppGone, 12000); if (P.stage === 'match') toast('상대 연결이 끊겼어요. 12초 안에 돌아오지 않으면 승리해요'); }
    if (s === 'back') { clearTimeout(P.leftT); }
  });
  // 상대가 30초 안에 안 들어오면 취소
  P.timers.push(setTimeout(() => { if (P && P.stage === 'connect') abort('상대가 들어오지 않아 경기가 취소됐어요'); }, 30000));
}
function sayHello() {
  if (!P) return;
  P.conn.ctl({ k: 'hello', info: P.info[P.me] });
  if (!P.info[1 - P.me]) P.timers.push(setTimeout(sayHello, 1000));
}
function abort(msg) { cleanup(); toast(msg); renderPvp(); }
function cleanup() {
  if (!P) return;
  P.timers.forEach(clearTimeout); clearInterval(P.simI); clearInterval(P.draftI); clearInterval(P.inpI); clearTimeout(P.leftT);
  P.conn.close(); P = null; $('pvHud').hidden = true; $('pvDash').hidden = true;
}
function oppGone() {
  if (!P) return;
  if (P.stage === 'match' && P.S) { forfeit(P.S, 1 - P.me); return; }        // 호스트: 바로 승리 처리
  if (P.stage === 'match') { finish(P.me, true); return; }                    // 게스트: 호스트가 나감
  if (P.stage !== 'end') abort('상대가 나가서 경기가 취소됐어요');
}

/* ---------- 메시지 ---------- */
function onMsg(m) {
  if (!P) return;
  if (m.k === 'hello') {
    const first = !P.info[1 - P.me];
    P.info[1 - P.me] = cleanInfo(m.info);
    if (first) P.conn.ctl({ k: 'hello', info: P.info[P.me] });
    if (P.role === 'host' && !P.D) startDraft();
  } else if (m.k === 'draft' && P.role === 'guest') {
    m.d.bans = [cleanIds(m.d.bans?.[0]), cleanIds(m.d.bans?.[1])]; m.d.picks = [cleanIds(m.d.picks?.[0]), cleanIds(m.d.picks?.[1])];
    P.D = m.d; P.D.endAt = Date.now() + m.d.left * 1000; P.stage = 'draft'; drawDraft(); }
  else if (m.k === 'act' && P.role === 'host') draftAct(1, m.a, m.id);
  else if (m.k === 'start' && P.role === 'guest' && P.stage !== 'match' && P.stage !== 'end') startFight(cleanLo(m.lo));
  else if (m.k === 's' && P.role === 'guest') {
    if (P.stage === 'draft') return; // 시작 메시지를 아직 못 받음
    P.prev = P.cur; P.prevAt = P.curAt; P.cur = cleanSnap(m); P.curAt = performance.now(); P.lastSnap = Date.now();
  } else if (m.k === 'i' && P.role === 'host') {
    const c = v => Math.max(-1, Math.min(1, +v || 0));
    P.inp[1] = { mx: c(m.mx), my: c(m.my), dash: Math.floor(+m.dash) || 0 }; P.gotInput = true;
  }
  else if (m.k === 'end' && P.role === 'guest' && P.stage === 'match') finish([0, 1].includes(m.w) ? m.w : -1, false, cleanSnap({ sc: m.sc }).sc);
}

/* =========================================================
   밴픽 (호스트가 진행)
   ========================================================= */
const whoPicks = D => PICK_ORDER[D.step] === 0 ? D.first : 1 - D.first;
const spent = (D, i) => D.picks[i].reduce((s, id) => s + costOf(id), 0);
const taken = (D, id) => D.picks[0].includes(id) || D.picks[1].includes(id);
const banned = (D, id) => D.bans[0].includes(id) || D.bans[1].includes(id);
function canPick(D, i, id) {
  if (id === 'fists') return true;
  return !!P.info[i]?.owned?.[id] && !banned(D, id) && !taken(D, id) && spent(D, i) + costOf(id) <= BUDGET;
}
function startDraft() {
  P.D = { ph: 'ban', endAt: Date.now() + BAN_TIME * 1000, bans: [[], []], picks: [[], []], first: Math.random() < .5 ? 0 : 1, step: 0 };
  P.stage = 'draft';
  P.draftI = setInterval(draftTick, 250);
  pubDraft(); drawDraft();
}
function pubDraft() { const { endAt, ...d } = P.D; P.conn.ctl({ k: 'draft', d: { ...d, left: Math.max(0, (endAt - Date.now()) / 1000) } }); P.lastPub = Date.now(); }
function draftTick() {
  if (!P?.D) return;
  const D = P.D, now = Date.now();
  if (D.ph === 'ban' && (now >= D.endAt || (D.bans[0].length >= BANS && D.bans[1].length >= BANS))) {
    D.ph = 'pick'; D.endAt = now + PICK_TIME * 1000; pubDraft(); drawDraft(); SFX.up(1);
  } else if (D.ph === 'pick' && now >= D.endAt) autoPick(whoPicks(D));
  else if (now - P.lastPub > 1000) pubDraft(); // 메시지가 빠져도 따라오게 1초마다 다시 보냄
  drawDraftTimer();
}
// 시간이 지나면 가장 비싸고 레벨 높은 무기를 대신 골라 줌 (없으면 주먹)
function autoPick(i) {
  const D = P.D, own = P.info[i].owned;
  const ids = Object.keys(own).filter(id => canPick(D, i, id))
    .sort((a, b) => costOf(b) - costOf(a) || own[b] - own[a]);
  draftAct(i, 'pick', ids[0] || 'fists');
}
function draftAct(i, a, id) {
  const D = P.D; if (!D) return;
  if (a === 'ban') {
    if (D.ph !== 'ban' || D.bans[i].length >= BANS || id === 'fists' || !byId(id) || D.bans[i].includes(id)) return;
    D.bans[i].push(id);
  } else {
    if (D.ph !== 'pick' || whoPicks(D) !== i || !canPick(D, i, id)) return;
    D.picks[i].push(id); D.step++; D.endAt = Date.now() + PICK_TIME * 1000;
    if (D.step >= PICK_ORDER.length) {
      D.ph = 'done'; clearInterval(P.draftI); pubDraft(); drawDraft();
      const lo = [0, 1].map(k => D.picks[k].map(w => ({ id: w, lv: w === 'fists' ? 1 : P.info[k].owned[w] || 1, gp: P.info[k].gal.includes(w) })));
      const sendStart = () => { if (!P || P.gotInput) return; P.conn.ctl({ k: 'start', lo }); P.timers.push(setTimeout(sendStart, 1000)); };
      setTimeout(() => { if (P) { startFight(lo); sendStart(); } }, 1500);
      return;
    }
  }
  pubDraft(); drawDraft();
}
// 내가 누른 밴/픽 (게스트는 호스트에게 보냄)
function myAct(a, id) {
  if (P.role === 'host') return draftAct(0, a, id);
  P.conn.ctl({ k: 'act', a, id });
}

/* ---------- 밴픽 화면 ---------- */
function drawDraftTimer() {
  const el = $('pvDT'); if (!el || !P?.D) return;
  el.textContent = Math.max(0, Math.ceil((P.D.endAt - Date.now()) / 1000));
}
setInterval(() => { if (P?.role === 'guest' && P.stage === 'draft') drawDraftTimer(); }, 250);
function drawDraft() {
  const D = P.D, me = P.me, op = 1 - me, info = P.info;
  if (!D || !info[op]) return;
  const myTurn = D.ph === 'ban' ? D.bans[me].length < BANS : D.ph === 'pick' && whoPicks(D) === me;
  const title = D.ph === 'ban' ? `밴하기 (${D.bans[me].length}/${BANS})` : D.ph === 'done' ? '곧 시작해요!' : myTurn ? '내 차례: 무기를 고르세요' : `${esc(info[op].name)} 님이 고르는 중`;
  const slots = i => Array.from({ length: PICKS }, (_, k) => {
    const id = D.picks[i][k], w = id && byId(id);
    return id ? `<div class="pv-slot" style="--rc:${w ? RAR[w.r].color : '#f3efe6'}">${w ? `<img src="${thumb(w, true)}" alt="">` : '<span class="pv-fist">✊</span>'}<b>${w ? w.name : '주먹'}</b><small>Lv.${id === 'fists' ? 1 : info[i].owned[id] || 1}${info[i].gal.includes(id) ? ' · ✦' : ''}</small></div>`
      : '<div class="pv-slot empty"></div>';
  }).join('');
  const hideOppBans = D.ph === 'ban';
  const card = w => {
    const id = w.id, isBan = D.bans[me].includes(id) || (!hideOppBans && D.bans[op].includes(id));
    const mine = D.picks[me].includes(id), theirs = D.picks[op].includes(id), own = info[me].owned[id];
    let cls = '', ok = false;
    if (D.ph === 'ban') ok = myTurn && !D.bans[me].includes(id);
    else if (D.ph === 'pick') ok = myTurn && canPick(D, me, id);
    if (isBan) cls = ' ban'; else if (mine) cls = ' mine'; else if (theirs) cls = ' theirs'; else if (!ok) cls = ' off';
    return `<button class="pv-card${cls}" style="--rc:${RAR[w.r].color}" data-pv="${id}" ${ok ? '' : 'disabled'}>
      <span class="pv-cost">${COST[w.r]}</span><img src="${thumb(w, !!own)}" alt="">
      <b>${w.name}</b><small>${own ? `Lv.${own}${info[me].gal.includes(id) ? ' ✦' : ''}` : '없음'} · ${KIND_NAME[ARMS[id].kind]}</small></button>`;
  };
  const pool = [...WEAPONS].reverse();
  $('pvDraft').innerHTML = `<div class="pv-draft">
    <div class="pv-dtop"><div><small>${D.ph === 'ban' ? '밴' : D.ph === 'pick' ? '픽' : '완료'}</small><h2>${title}</h2></div><div class="pv-timer" id="pvDT"></div></div>
    <div class="pv-teams">
      <div class="pv-team me"><div class="pv-tn">${esc(info[me].name)} <em>나</em><span>비용 ${spent(D, me)}/${BUDGET}</span></div><div class="pv-slots">${slots(me)}</div>
        <div class="pv-bans">밴: ${D.bans[me].map(id => byId(id)?.name).join(', ') || '-'}</div></div>
      <div class="pv-team op"><div class="pv-tn">${esc(info[op].name)}<span>비용 ${spent(D, op)}/${BUDGET}</span></div><div class="pv-slots">${slots(op)}</div>
        <div class="pv-bans">밴: ${hideOppBans ? `${D.bans[op].length}개 (밴이 끝나면 공개)` : D.bans[op].map(id => byId(id)?.name).join(', ') || '-'}</div></div>
    </div>
    ${D.ph === 'pick' && myTurn ? `<div class="pv-help">비용이 ${BUDGET - spent(D, me)}점 남았어요. 가진 무기만 고를 수 있어요.${Object.keys(info[me].owned).every(id => !canPick(D, me, id)) ? ' <button class="btn" data-pv="fists">주먹으로 싸우기</button>' : ''}</div>` : ''}
    ${D.ph === 'ban' ? '<div class="pv-help">상대가 못 쓰게 할 무기를 고르세요. 서로의 밴은 밴이 끝나면 공개돼요.</div>' : ''}
    <div class="pv-pool">${pool.map(card).join('')}</div></div>`;
  drawDraftTimer();
}
$('pvDraft').addEventListener('click', e => {
  const b = e.target.closest('[data-pv]'); if (!b || b.disabled || !P?.D) return;
  const D = P.D;
  myAct(D.ph === 'ban' ? 'ban' : 'pick', b.dataset.pv); SFX.tick();
  // 게스트는 호스트의 응답을 기다리는 동안 눌린 것처럼 보이게
  if (P.role === 'guest') b.classList.add('wait');
});

/* =========================================================
   대결
   ========================================================= */
const cv = $('pcv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function fit() { W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return; DPR = Math.min(devicePixelRatio, 2); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
new ResizeObserver(fit).observe(cv);

/* ---------- 입력: WASD/방향키 + Space(대시), 화면을 누르고 끌면 조이스틱 ---------- */
const keys = {};
let joy = null, dashN = 0;
const active = () => P?.stage === 'match' && currentTab === 'pvp';
addEventListener('keydown', e => {
  if (!active() || e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (/^Arrow|^Space$/.test(e.code)) e.preventDefault();
  if (e.code === 'Space' && !e.repeat) dashN++;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy = null; });
cv.addEventListener('pointerdown', e => { joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (joy?.id === e.pointerId) { joy.x = e.clientX; joy.y = e.clientY; } });
const endJoy = e => { if (joy?.id === e.pointerId) joy = null; };
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);
$('pvDash').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); dashN++; });
function readInput() {
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (joy) { const dx = joy.x - joy.x0, dy = joy.y - joy.y0, d = Math.hypot(dx, dy); if (d > 6) { mx = dx / Math.max(d, 46); my = dy / Math.max(d, 46); } }
  return { mx: Math.round(mx * 100) / 100, my: Math.round(my * 100) / 100, dash: dashN };
}

function startFight(lo) {
  if (!P || P.stage === 'match') return;
  P.stage = 'match'; P.lo = lo;
  clearInterval(P.draftI);
  show('pvDraft', false); $('pvHud').hidden = false; $('pvDash').hidden = false;
  if (!W) fit();
  P.V = makeView(lo, P.me, [P.info[0].name, P.info[1].name]);
  dashN = 0; joy = null;
  if (P.role === 'host') {
    P.S = createSim(lo); P.inp = [{ mx: 0, my: 0, dash: 0 }, { mx: 0, my: 0, dash: 0 }];
    let last = performance.now(), sendAcc = 0;
    // 대결은 화면과 상관없이 1초에 60번 진행 (다른 탭을 봐도 멈추지 않게)
    P.simI = setInterval(() => {
      if (!P?.S) return;
      const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
      P.inp[0] = readInput();
      step(P.S, dt, P.inp);
      sendAcc += dt;
      if (sendAcc >= (P.conn.p2p ? .05 : .1)) { sendAcc = 0; P.snap = snapshot(P.S); P.conn.send(P.snap); }
      else if (!P.snap) P.snap = snapshot(P.S);
      if (P.S.ph === 'over' && !P.overSent) {
        P.overSent = true; const w = P.S.winner, sc = P.S.score;
        P.snap = snapshot(P.S); P.conn.send(P.snap);
        for (let k = 0; k < 4; k++) P.timers.push(setTimeout(() => P?.conn.ctl({ k: 'end', w, sc }), k * 600));
        setTimeout(() => finish(w, false, sc), 1800);
      }
    }, 1000 / 60);
  } else {
    // 게스트: 입력을 1초에 20번 보내고, 8초 동안 화면이 안 오면 호스트가 나간 것으로 봄
    P.lastSnap = Date.now();
    P.inpI = setInterval(() => {
      if (!P) return;
      P.conn.send({ k: 'i', ...readInput() });
      if (Date.now() - P.lastSnap > 8000 && P.stage === 'match') oppGone();
    }, 50);
  }
  banner('3', '#ffc83d');
}

/* ---------- 화면 ---------- */
let lastFrame = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  if (!P?.V || currentTab !== 'pvp' || !(P.stage === 'match' || P.stage === 'end')) return;
  if (!W) fit();
  let s;
  if (P.role === 'host') { if (P.S) s = snapshot(P.S); }
  else if (P.cur) { const iv = Math.max(30, P.curAt - (P.prevAt || P.curAt - 100)); s = blend(P.prev, P.cur, Math.min(1, (now - P.curAt) / iv)); }
  if (!s) return;
  takeEvents(P.V, s, { go: () => { banner('시작!', '#4fd18b'); SFX.up(2); }, round: e => roundBanner(e.w, s) });
  render(ctx, W, H, DPR, P.V, s, dt);
  hud(s);
}
requestAnimationFrame(frame);

function hud(s) {
  const me = P.me, op = 1 - me, names = P.V.names;
  const hp = i => Math.max(0, s.p[i][2]) / PVP_HP * 100;
  $('pvHud').innerHTML = `
    <div class="ph-side me"><b>${esc(names[me])}</b><div class="hpbar"><i style="width:${hp(me)}%"></i><span>${Math.ceil(Math.max(0, s.p[me][2]))}</span></div></div>
    <div class="ph-mid"><div class="ph-score">${dots(s.sc[me], '#4fd18b')}<em>${s.rd}라운드</em>${dots(s.sc[op], '#ff6b6b')}</div>
      <span>${s.ph === 'count' ? `${Math.max(1, Math.ceil(COUNTDOWN - s.pt))}` : s.ph === 'fight' ? fmtT(ROUND_TIME - s.rt) : ''}</span></div>
    <div class="ph-side op"><b>${esc(names[op])}</b><div class="hpbar op"><i style="width:${hp(op)}%"></i><span>${Math.ceil(Math.max(0, s.p[op][2]))}</span></div></div>`;
  // 카운트다운 숫자
  if (s.ph === 'count') { const n = Math.max(1, Math.ceil(COUNTDOWN - s.pt)); if (P.lastCount !== n) { P.lastCount = n; banner(String(n), '#ffc83d'); SFX.tick(); } }
  else P.lastCount = 0;
  const cd = s.p[me][10] || 0;
  $('pvDash').style.setProperty('--cd', `${(1 - cd / DASH.cd) * 360}deg`);
  $('pvDash').classList.toggle('ready', cd <= 0);
}
const dots = (n, c) => `<span class="ph-dots">${Array.from({ length: ROUNDS_TO_WIN }, (_, i) => `<i style="${i < n ? `background:${c}` : ''}"></i>`).join('')}</span>`;
function banner(txt, col) {
  const b = $('pvBanner'); b.textContent = txt; b.style.setProperty('--rc', col);
  b.className = 'bbanner'; void b.offsetWidth; b.className = 'bbanner show';
}
function roundBanner(w) {
  if (w < 0) banner('무승부', '#c9d3dc');
  else if (w === P.me) { banner('라운드 승리!', '#4fd18b'); SFX.fanfare(2); }
  else { banner('라운드 패배', '#ff6b6b'); SFX.fanfare(0); }
}

/* ---------- 결과 ---------- */
async function finish(w, ff, sc) {
  if (!P || P.stage === 'end') return;
  P.stage = 'end';
  clearInterval(P.inpI);
  const won = w === P.me, matchId = P.matchId;
  sc = sc || P.S?.score || P.cur?.sc || [0, 0];
  $('pvDash').hidden = true;
  won ? SFX.fanfare(4) : SFX.fanfare(0);
  show('pvEnd', true);
  const paint = msg => {
    $('pvEnd').innerHTML = `<div class="bp-box"><h2 class="${won ? 'pv-win' : 'pv-lose'}">${won ? '승리!' : '패배'}</h2>
      <div class="pv-final">${sc[P.me]} : ${sc[1 - P.me]}</div>
      ${ff ? `<p>${won ? '상대가 나가서 승리했어요.' : ''}</p>` : ''}
      <p class="pv-res" id="pvRes">${msg}</p>
      <div class="fg-btns center"><button class="btn primary" id="pvBack">경쟁전 로비로</button></div></div>`;
    $('pvBack').onclick = () => { clearTimeout(P?.retryT); P?.timers.forEach(clearTimeout); clearInterval(P?.simI); P?.conn.close(); P = null; show('pvEnd', false); $('pvHud').hidden = true; renderPvp(); };
  };
  paint('점수를 반영하는 중…');
  if (TEST_MODE) { paint('테스트 모드(개발 서버)에서는 점수를 반영하지 않아요'); return; }
  // 결과 보고: 상대 확인을 기다려야 하면 95초 뒤 한 번 더
  const report = async again => {
    try {
      const r = await rpc('pvp_report', { p_match: matchId, p_won: won });
      if (r === 'pending') { paint(again ? '상대 확인이 늦어지고 있어요. 나중에 반영돼요.' : '상대의 결과 확인을 기다리는 중… (최대 1분 30초)'); if (!again && P) P.retryT = setTimeout(() => report(true), 95000); return; }
      paint({ win: '승리! 점수를 반영했어요 (같은 상대와 하루 3판, 하루 20판이 넘거나 상대가 나간 경기는 점수가 그대로예요)', loss: '-15점', void: '결과가 서로 달라서 이번 경기는 무효가 됐어요', done: '이미 반영됐어요' }[r] || '반영됐어요');
    } catch (e) { paint('점수를 반영하지 못했어요 (인터넷 연결 확인)'); }
  };
  report(false);
}
