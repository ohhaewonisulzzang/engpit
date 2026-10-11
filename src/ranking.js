import { RANKING, TEST_MODE } from './config.js';

/* =========================================================
   회원(아이디 + 비밀번호)과 월간 전투 랭킹 (Supabase REST)
   - 아이디는 '아이디@engpit.game' 이라는 가짜 이메일로 바꿔서 Supabase Auth에 가입한다
   - 랭킹은 이번 달 전투 최고 웨이브 (같으면 처치 수). 서버 규칙은 supabase/ranking.sql
   ========================================================= */
export const rankReady = () => !!(RANKING.url && RANKING.key);
const BASE = () => RANKING.url.replace(/\/$/, '');
const AUTH_KEY = 'engpit_auth';
export const ID_RULE = /^[A-Za-z0-9_]{3,16}$/;
// 아이디는 쓴 그대로 보이지만 로그인은 대소문자를 가리지 않는다
const toEmail = id => `${id.toLowerCase()}@engpit.game`;

// 로그인 정보 { token, refresh, exp, uid, username }
export let session = (() => { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { return null; } })();
const listeners = new Set();
export const onAuth = f => listeners.add(f);
function setSession(s) {
  session = s;
  try { s ? localStorage.setItem(AUTH_KEY, JSON.stringify(s)) : localStorage.removeItem(AUTH_KEY); } catch (e) {}
  listeners.forEach(f => f(s));
}

async function req(path, { method = 'GET', body, token, headers } = {}) {
  const r = await fetch(BASE() + path, {
    method, body: body && JSON.stringify(body),
    headers: { apikey: RANKING.key, Authorization: `Bearer ${token || RANKING.key}`, 'Content-Type': 'application/json', ...headers },
  });
  const txt = await r.text(); let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
  if (!r.ok) throw Object.assign(new Error(data?.msg || data?.message || data?.error_description || r.statusText), { status: r.status, code: data?.error_code || data?.code });
  return { data, headers: r.headers };
}
const fromAuth = (d, username) => ({
  token: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in - 60) * 1000,
  uid: d.user.id, username: username || d.user.user_metadata?.username,
});

// 서버 오류를 화면에 보여 줄 말로
export function authError(e) {
  const m = (e.code || '') + ' ' + (e.message || '');
  if (/already|exists|registered|Database error saving/i.test(m)) return '이미 있는 아이디예요. 다른 아이디를 써 주세요.';
  if (/invalid_credentials|Invalid login/i.test(m)) return '아이디 또는 비밀번호가 맞지 않아요.';
  if (/weak_password|Password should/i.test(m)) return '비밀번호는 6자 이상으로 써 주세요.';
  if (/email_not_confirmed|confirm/i.test(m)) return '서버에서 "Confirm email" 설정을 꺼야 가입할 수 있어요.';
  if (/rate|too many/i.test(m)) return '잠깐 뒤에 다시 시도해 주세요.';
  if (e instanceof TypeError) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return '문제가 생겼어요: ' + (e.message || '알 수 없는 오류');
}

export async function signUp(id, pw) {
  const { data } = await req('/auth/v1/signup', { method: 'POST', body: { email: toEmail(id), password: pw, data: { username: id } } });
  // 인증 메일 설정이 켜져 있으면 세션 없이 사용자만 돌아온다
  if (!data?.access_token) throw Object.assign(new Error('confirm'), { code: 'email_not_confirmed' });
  setSession(await withProfile(fromAuth(data, id)));
}
export async function logIn(id, pw) {
  const { data } = await req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: toEmail(id), password: pw } });
  setSession(await withProfile(fromAuth(data)));
}
// 서버 프로필에서 아이디(대소문자 그대로)와 슈퍼계정 여부를 붙인다
async function withProfile(s) {
  try {
    const rows = (await req(`/rest/v1/profiles?id=eq.${s.uid}&select=username,is_super,hide_rank`, { token: s.token })).data;
    if (rows?.[0]) { s.username = rows[0].username; s.super = !!rows[0].is_super; s.hideRank = !!rows[0].hide_rank; }
  } catch (e) {}
  return s;
}
export function logOut() {
  const t = session?.token; setSession(null);
  if (t) req('/auth/v1/logout', { method: 'POST', token: t }).catch(() => {});
}
// 토큰이 곧 만료되면 새로 받아 온다 (리프레시가 실패하면 로그아웃)
async function token() {
  if (!session) return null;
  if (Date.now() < session.exp) return session.token;
  try {
    const { data } = await req('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh } });
    setSession({ ...fromAuth(data, session.username), super: session.super, hideRank: session.hideRank });
    return session.token;
  } catch (e) { if (e.status === 400 || e.status === 401) setSession(null); return null; }
}

// 판 시작: 서버에서 판 번호를 받아 둔다. 끝나면 이 번호로만 기록을 올릴 수 있고,
// 서버는 판이 시작된 뒤 실제로 흐른 시간에 비해 웨이브·처치 수가 말이 되는지 확인한다 (supabase/secure_runs.sql)
let runId = null;
export async function beginRun() {
  runId = null;
  if (!rankReady() || TEST_MODE || !session) return;
  const t = await token(); if (!t) return;
  try { runId = (await req('/rest/v1/rpc/start_run', { method: 'POST', token: t, body: {} })).data; } catch (e) {}
}
// 전투 한 판 결과 올리기 (서버가 이번 달 최고 기록보다 좋을 때만 바꿈)
// 돌려주는 값: 'ok' | 'test'(개발 서버) | 'hidden'(랭킹 제외 계정) | 'norun'(판 번호를 못 받음) | 'off'(로그인 안 함)
export async function submitWave(wave, kills) {
  if (!rankReady() || !session) return 'off';
  if (TEST_MODE) return 'test';
  const id = runId; runId = null;
  if (!id) return 'norun';
  const t = await token(); if (!t) return 'off';
  await req('/rest/v1/rpc/submit_wave', { method: 'POST', token: t, body: { p_run: id, p_wave: wave, p_kills: kills } });
  return session.hideRank ? 'hidden' : 'ok';
}

const ORDER = 'order=wave.desc,kills.desc,updated_at.asc';
export async function fetchTop(month, limit = 50) {
  return (await req(`/rest/v1/wave_rank_view?month=eq.${month}&select=user_id,username,wave,kills&${ORDER}&limit=${limit}`)).data;
}
export async function fetchMine(month) {
  if (!session) return null;
  const rows = (await req(`/rest/v1/wave_rank_view?month=eq.${month}&user_id=eq.${session.uid}&select=wave,kills`)).data;
  if (!rows?.length) return null;
  const { wave, kills } = rows[0];
  // 내 순위 = 나보다 좋은 기록 수 + 1
  const { headers } = await req(`/rest/v1/wave_rank?month=eq.${month}&or=(wave.gt.${wave},and(wave.eq.${wave},kills.gt.${kills}))&select=user_id`,
    { headers: { Prefer: 'count=exact', Range: '0-0' } });
  const n = +(headers.get('content-range') || '').split('/')[1];
  return { wave, kills, rank: Number.isFinite(n) ? n + 1 : null };
}

// 경쟁전 비공개 채널에 들어갈 때 쓰는 로그인 토큰 (곧 만료되면 새로 받음)
export const freshToken = () => token();
// 로그인한 사람으로 서버 함수 부르기 (경쟁전에서 사용)
export async function rpc(name, body = {}) {
  const t = await token(); if (!t) throw Object.assign(new Error('login required'), { status: 401 });
  return (await req(`/rest/v1/rpc/${name}`, { method: 'POST', token: t, body })).data;
}
export const getRows = async path => (await req(`/rest/v1/${path}`)).data;
