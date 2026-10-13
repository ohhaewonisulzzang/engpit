import { $ } from '../dom.js';
import { monthKey, SUPER, SLOT_KEY } from '../state.js';
import { TEST_MODE } from '../config.js';
import { SFX } from '../sound.js';
import { rankReady, session, onAuth, signUp, logIn, logOut, authError, ID_RULE, fetchTop, fetchMine } from '../ranking.js';
import { toast, esc, currentTab, leaveLogin } from './common.js';
import { renderProfile } from './profile.js';

/* =========================================================
   로그인 화면(tab-login)과 랭킹 화면(tab-rank)
   - 랭킹: 이번 달 전투 최고 웨이브 순위 (매달 1일 한국 시간 0시에 새로 시작)
   ========================================================= */
const monthName = k => `${k.slice(0, 4)}년 ${+k.slice(5)}월`;
const prevMonth = k => { const [y, m] = k.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
function untilReset() {
  const [y, m] = monthKey().split('-').map(Number);
  const left = Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1) - 9 * 3600e3 - Date.now();
  const d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 36e5);
  return d > 0 ? `${d}일 ${h}시간` : `${h}시간 ${Math.floor(left % 36e5 / 6e4)}분`;
}
const MEDAL = ['#ffc83d', '#c9d3dc', '#d08a4a'];
const rec = r => `<span class="rk-sh">${r.wave}<small>웨이브</small></span><span class="rk-k">처치 ${r.kills.toLocaleString()}</span>`;

/* ---------- 슈퍼계정·관리 계정 전용 저장 ----------
   슈퍼계정으로 로그인하면 'engpit_save_super_<id>'에 따로 저장하고(무한 코인, 전부 해금),
   관리 계정은 'engpit_save_ctl_<id>'에 따로 저장한다(대시보드에서 바꾼 값을 받음, control.js).
   로그아웃하면 원래 저장으로 돌아간다. 바뀔 때는 새로고침해서 처음부터 다시 불러온다 */
export function syncSlot() {
  const want = session?.super ? 'super_' + session.uid : session?.ctl ? 'ctl_' + session.uid : null;
  const have = (() => { try { return localStorage.getItem(SLOT_KEY); } catch (e) { return null; } })();
  if (want === have) return false;
  try { want ? localStorage.setItem(SLOT_KEY, want) : localStorage.removeItem(SLOT_KEY); } catch (e) { return false; }
  location.reload();
  return true;
}
syncSlot();

/* ---------- 머리 위 계정 버튼 ---------- */
function renderAcct() {
  const b = $('acctBtn'); if (!b) return;
  b.textContent = session ? session.username : '로그인';
  b.classList.toggle('in', !!session);
  fitAcct();
}
// 좁은 화면에서 아이디가 칸보다 길면 잘리지 않게 글자를 조금씩 줄인다
function fitAcct() {
  const b = $('acctBtn'); if (!b) return;
  b.style.fontSize = '';
  let f = parseFloat(getComputedStyle(b).fontSize);
  while (b.scrollWidth > b.clientWidth + 1 && f > 9) { f -= .5; b.style.fontSize = f + 'px'; }
}
addEventListener('resize', fitAcct);
document.fonts?.ready.then(fitAcct); // 웹폰트가 늦게 오면 글자 폭이 바뀌므로 한 번 더
onAuth(() => { if (syncSlot()) return; renderAcct(); if (currentTab === 'rank') renderRanking(); if (currentTab === 'login') renderLogin(); });
renderAcct();

/* ---------- 로그인 / 회원가입 화면 ---------- */
let mode = 'login', busyAuth = false;
export function renderLogin() {
  renderProfile();
  const box = $('loginBox');
  if (session) {
    box.innerHTML = `<div class="auth-card">
      <div class="auth-hello"><span class="auth-av">${esc(session.username[0].toUpperCase())}</span><div><b>${esc(session.username)}</b><small>${SUPER ? '슈퍼계정이에요. 코인이 무한이고 모든 무기·기계·갤럭시 파워가 열려 있어요.' : '로그인 중이에요. 전투 기록이 이번 달 랭킹에 올라가요.'}</small></div></div>
      <div class="auth-btns"><button class="btn primary" data-tab="rank">랭킹 보기</button><button class="btn" id="authOut">로그아웃</button></div></div>`;
    $('authOut').onclick = () => { logOut(); SFX.tick(); toast('로그아웃했어요'); };
    return;
  }
  const up = mode === 'signup';
  box.innerHTML = `<form class="auth-card" id="authForm">
    <h2>${up ? '회원가입' : '로그인'}</h2>
    <p class="auth-sub">${up ? '아이디와 비밀번호만 정하면 바로 가입돼요. 아이디가 랭킹에 이름으로 보여요.' : '로그인하면 전투 기록이 이번 달 랭킹에 올라가요.'}</p>
    <label>아이디<input id="authId" autocomplete="username" spellcheck="false" autocapitalize="off" maxlength="16" placeholder="영어·숫자·_ 3~16자"></label>
    <label>비밀번호<input id="authPw" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="6자 이상"></label>
    ${up ? '<label>비밀번호 확인<input id="authPw2" type="password" autocomplete="new-password"></label><small class="auth-warn">비밀번호를 잊으면 찾을 수 없으니 꼭 기억해 두세요.</small>' : ''}
    <div class="auth-err" id="authErr" role="alert"></div>
    <button class="btn primary auth-go" id="authGo">${up ? '가입하기' : '로그인'}</button>
    <p class="auth-switch">${up ? '이미 계정이 있나요?' : '처음이에요?'} <button type="button" id="authMode">${up ? '로그인' : '회원가입'}</button></p>
  </form>`;
  $('authMode').onclick = () => { mode = up ? 'login' : 'signup'; renderLogin(); $('authId').focus(); };
  $('authForm').onsubmit = async e => {
    e.preventDefault(); if (busyAuth) return;
    const id = $('authId').value.trim(), pw = $('authPw').value, err = m => { $('authErr').textContent = m; SFX.wrong(); };
    if (!rankReady()) return err('랭킹 서버가 아직 연결되지 않았어요.');
    if (!ID_RULE.test(id)) return err('아이디는 영어, 숫자, _ 로 3~16자예요.');
    if (pw.length < 6) return err('비밀번호는 6자 이상으로 써 주세요.');
    if (up && pw !== $('authPw2').value) return err('비밀번호 확인이 달라요.');
    busyAuth = true; $('authGo').disabled = true; $('authErr').textContent = '';
    try {
      await (up ? signUp(id, pw) : logIn(id, pw));
      SFX.coin(); toast(up ? `가입 완료! 환영해요, ${esc(session.username)}님` : `${esc(session.username)}님, 반가워요`);
      if (syncSlot()) return; // 슈퍼계정이면 전용 저장으로 바꿔서 새로고침
      leaveLogin();
    } catch (ex) { err(authError(ex)); }
    finally { busyAuth = false; if ($('authGo')) $('authGo').disabled = false; }
  };
}

/* ---------- 순위표 ---------- */
let busy = false;
export async function renderRanking() {
  const k = monthKey();
  $('rkHead').innerHTML = `<div><h2>${monthName(k)} 전투 랭킹</h2>
      <p>이번 달 전투에서 도달한 최고 웨이브로 순위를 매겨요. 웨이브가 같으면 처치 수가 많은 사람이 위예요. 매달 1일에 새로 시작해요.</p></div>
    <div class="rk-reset"><b>${untilReset()}</b>초기화까지</div>`;
  // 로그인 안 했으면 로그인 화면으로 안내
  $('rkAuth').innerHTML = session ? '' : `<div class="rk-cta"><span>로그인하면 내 전투 기록이 랭킹에 올라가요.</span><button class="btn primary" data-tab="login">로그인 / 회원가입</button></div>`;
  $('rkMe').innerHTML = '';
  if (!rankReady()) { $('rkList').innerHTML = '<p class="rk-msg">랭킹 서버가 아직 연결되지 않았어요.</p>'; $('rkPrev').innerHTML = ''; return; }
  if (busy) return; busy = true;
  $('rkList').innerHTML = '<p class="rk-msg">순위를 불러오는 중…</p>';
  try {
    const [top, prev, mine] = await Promise.all([fetchTop(k), fetchTop(prevMonth(k), 3), fetchMine(k).catch(() => null)]);
    if (session) $('rkMe').innerHTML = `<div class="rk-mine"><span>내 이번 달 기록</span>${mine
      ? `${rec(mine)}<span class="rk-pos">${mine.rank ? `${mine.rank}위` : ''}</span>`
      : `<span class="rk-pos">아직 기록이 없어요. 전투에 나가 보세요!</span>`}</div>${TEST_MODE ? '<p class="rk-note">테스트 모드(개발 서버)에서는 전투 기록을 올리지 않아요.</p>' : ''}`;
    const me = session?.uid;
    $('rkList').innerHTML = top.length ? `<ol class="rk-list">${top.map((r, i) => `<li class="rk-row${r.user_id === me ? ' me' : ''}">
        <span class="rk-no"${i < 3 ? ` style="--mc:${MEDAL[i]}"` : ''}>${i + 1}</span>
        <b>${esc(r.username)}${r.user_id === me ? '<em>나</em>' : ''}</b>${rec(r)}</li>`).join('')}</ol>`
      : '<p class="rk-msg">이번 달 첫 기록의 주인공이 되어 보세요!</p>';
    $('rkPrev').innerHTML = prev.length ? `<h3>${monthName(prevMonth(k))} 명예의 전당</h3>
      <div class="rk-podium">${prev.map((r, i) => `<div style="--mc:${MEDAL[i]}"><span>${i + 1}위</span><b>${esc(r.username)}</b><small>${r.wave}웨이브 · 처치 ${r.kills.toLocaleString()}</small></div>`).join('')}</div>` : '';
  } catch (e) {
    $('rkList').innerHTML = e.status === 404
      ? '<p class="rk-msg">랭킹 표가 아직 서버에 없어요.<br><small>Supabase SQL Editor에서 supabase/ranking.sql을 실행해 주세요.</small></p>'
      : '<p class="rk-msg">순위를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>';
  } finally { busy = false; }
}
