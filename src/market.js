import { state, save } from './state.js';
import { FREE, EXCHANGE, MAX_LEVEL } from './config.js';
import { tone, SFX } from './sound.js';
import { WEAPONS } from './three/weapons.js';
import { scene } from './three/scene.js';
import { grant } from './gacha.js';

/* =========================================================
   상점 (ui/market.js가 화면을 그림)
   - 꾸미기: 코인으로 캐릭터 모자·화면 테마·정답 효과음을 사고 골라 쓴다
   - 조각 교환소: 조각으로 영웅·레전더리·울트라 무기 하나를 확정으로 받는다
   - 칭호: 조건을 채우면 보상을 받고, 하나를 골라 이름 옆에 단다
   모두 이 기기의 저장(state)에만 기록하고 서버에는 아무것도 보내지 않는다
   ========================================================= */

/* ---------- 꾸미기 상품 ---------- */
// 모자: 전투 캐릭터의 모자 색 (rainbow는 색이 계속 바뀜)
export const SKINS = [
  { id: 'basic',   name: '빨간 모자',   price: 0,   cap: '#e8364f', band: '#b8203a', desc: '처음부터 쓰던 모자' },
  { id: 'ocean',   name: '파도 모자',   price: 20,  cap: '#3d8bff', band: '#2459b3', desc: '시원한 바다색' },
  { id: 'sprout',  name: '새싹 모자',   price: 20,  cap: '#4fd18b', band: '#2a8f58', desc: '싱그러운 풀색' },
  { id: 'grape',   name: '포도 모자',   price: 35,  cap: '#a46bff', band: '#6b3fc4', desc: '달콤한 보라색' },
  { id: 'gold',    name: '황금 모자',   price: 70,  cap: '#ffc83d', band: '#c98f00', desc: '반짝이는 금색' },
  { id: 'rainbow', name: '무지개 모자', price: 150, cap: 'rainbow', band: '#ffffff', desc: '색이 계속 바뀌어요' },
];
// 테마: 화면 배경색 묶음 (뽑기 화면 3D 배경도 같이 바뀜)
export const THEMES = [
  { id: 'basic',  name: '청록 바다', price: 0,  c: ['#0b2f33', '#0f3b40', '#134a50', '#1a5a61', '#22646b', '#86a9a6'], desc: '처음 테마' },
  { id: 'night',  name: '한밤 보라', price: 30, c: ['#1b1430', '#241a3f', '#2f2352', '#3b2c66', '#46347a', '#a99cc9'], desc: '별이 뜬 밤하늘' },
  { id: 'forest', name: '깊은 숲',   price: 30, c: ['#10291a', '#15351f', '#1d4629', '#255633', '#2c6339', '#8fb59a'], desc: '나무 냄새 나는 숲' },
  { id: 'sunset', name: '저녁 노을', price: 40, c: ['#2e1a1a', '#3a2020', '#4a2a28', '#5a3430', '#6a3c35', '#c9a19a'], desc: '해 질 녘 붉은 하늘' },
  { id: 'ink',    name: '먹물',      price: 50, c: ['#121417', '#181b20', '#22262d', '#2c313a', '#363c47', '#9aa3ae'], desc: '차분한 검은색' },
];
const THEME_VARS = ['--bg', '--bg2', '--surface', '--surface2', '--line', '--muted'];
// 정답 효과음: 단어를 맞혀 코인을 받을 때
export const SOUNDS = [
  { id: 'basic',  name: '코인 소리',   price: 0,  desc: '처음 소리',        play: () => SFX.coin() },
  { id: 'xylo',   name: '실로폰',      price: 15, desc: '도-미-솔 또로롱',  play: () => [784, 988, 1175].forEach((f, i) => tone(f, .25, 'triangle', .14, i * .07)) },
  { id: 'retro',  name: '레트로 게임', price: 25, desc: '8비트 띠링',        play: () => { tone(660, .08, 'square', .06, 0, 1320); tone(1760, .18, 'square', .05, .09); } },
  { id: 'bell',   name: '맑은 종',     price: 25, desc: '딩- 하고 울리는 종', play: () => { tone(1568, .7, 'sine', .12); tone(2349, .5, 'sine', .05, .02); } },
  { id: 'cheer',  name: '빵빠레',      price: 45, desc: '짧은 축하 나팔',    play: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? .45 : .14, 'sawtooth', .06, i * .08)) },
];
export const SHOP = { skin: SKINS, theme: THEMES, sfx: SOUNDS };
const itemKey = (kind, id) => `${kind}:${id}`;
export const find = (kind, id) => SHOP[kind].find(x => x.id === id) || SHOP[kind][0];
export const owns = (kind, id) => id === 'basic' || !!state.owned?.[itemKey(kind, id)];
export const wearing = kind => find(kind, state.wear?.[kind]).id;
export const boughtCount = () => Object.keys(state.owned || {}).length;

// 사기: 코인을 내고 바로 착용한다. 돌려주는 값: 'ok' | 'owned' | 'poor'
export function buy(kind, id) {
  const it = find(kind, id);
  if (owns(kind, id)) return 'owned';
  if (!FREE && state.coins < it.price) return 'poor';
  if (!FREE) state.coins -= it.price;
  state.owned = { ...state.owned, [itemKey(kind, id)]: true };
  wear(kind, id);
  return 'ok';
}
export function wear(kind, id) {
  if (!owns(kind, id)) return false;
  state.wear = { ...DEFAULT_WEAR, ...state.wear, [kind]: id };
  save();
  if (kind === 'theme') applyTheme();
  return true;
}
const DEFAULT_WEAR = { skin: 'basic', theme: 'basic', sfx: 'basic' };

// 테마를 화면(CSS 변수)과 뽑기 화면 3D 배경에 적용
export function applyTheme() {
  const t = find('theme', wearing('theme')), root = document.documentElement.style;
  THEME_VARS.forEach((v, i) => t.id === 'basic' ? root.removeProperty(v) : root.setProperty(v, t.c[i]));
  scene.background.set(t.c[0]); scene.fog.color.set(t.c[0]);
}
// 정답 효과음
export const playCorrect = () => find('sfx', wearing('sfx')).play();
// 전투 캐릭터 모자 색 (t: 시간, 무지개 모자용)
export function capColors(t = 0) {
  const s = find('skin', wearing('skin'));
  return s.cap === 'rainbow' ? { cap: `hsl(${(t * 90) % 360},90%,58%)`, band: s.band } : s;
}

/* ---------- 조각 교환소 ---------- */
// 받을 수 있는 무기: 그 등급 일반 무기 + 지금 기계로 뽑을 수 있는 전용 칼
const exchangePool = r => WEAPONS.filter(w => w.r === r && (!w.m || w.m <= state.level));
export const missingOf = r => exchangePool(r).filter(w => !state.inv[w.id]);
// 조각을 내고 무기 하나 (아직 없는 무기 먼저). 조각이 모자라면 null
export function exchange(r) {
  const cost = EXCHANGE[r];
  if (!cost || state.shards < cost) return null;
  const miss = missingOf(r), pool = miss.length ? miss : exchangePool(r);
  const w = pool[Math.floor(Math.random() * pool.length)];
  state.shards -= cost;
  const isNew = grant(w);
  save();
  return { w, isNew };
}

/* ---------- 칭호 ---------- */
// goal: [지금 값, 목표] / reward: { coins } 또는 { shards }
const kinds = () => WEAPONS.filter(w => state.inv[w.id]).length;
export const TITLES = [
  { id: 'firstpull', name: '첫 뽑기',     desc: '뽑기를 처음 해 보기',          goal: () => [state.pulls, 1],         reward: { coins: 2 } },
  { id: 'pull100',   name: '뽑기 마니아', desc: '뽑기 100번',                   goal: () => [state.pulls, 100],       reward: { shards: 10 } },
  { id: 'pull1000',  name: '뽑기 장인',   desc: '뽑기 1000번',                  goal: () => [state.pulls, 1000],      reward: { shards: 60 } },
  { id: 'dex10',     name: '수집가',      desc: '무기 10종 모으기',             goal: () => [kinds(), 10],            reward: { coins: 5 } },
  { id: 'dexall',    name: '도감 완성',   desc: `무기 ${WEAPONS.length}종 모두 모으기`, goal: () => [kinds(), WEAPONS.length], reward: { shards: 120 } },
  { id: 'word50',    name: '단어 새싹',   desc: '단어 50개 맞히기',             goal: () => [state.correct, 50],      reward: { coins: 5 } },
  { id: 'word500',   name: '단어 박사',   desc: '단어 500개 맞히기',            goal: () => [state.correct, 500],     reward: { coins: 30 } },
  { id: 'streak20',  name: '집중력 대장', desc: '단어 20문제 연속으로 맞히기',  goal: () => [state.bestStreak || 0, 20], reward: { coins: 10 } },
  { id: 'wave10',    name: '전사',        desc: '전투에서 웨이브 10 가기',      goal: () => [state.best?.wave || 0, 10], reward: { shards: 20 } },
  { id: 'wave25',    name: '영웅의 길',   desc: '전투에서 웨이브 25 가기',      goal: () => [state.best?.wave || 0, 25], reward: { shards: 60 } },
  { id: 'ultra',     name: '울트라 행운', desc: '울트라 무기 하나 얻기',        goal: () => [WEAPONS.filter(w => w.r === 'ultra' && state.inv[w.id]).length, 1], reward: { coins: 10 } },
  { id: 'machine',   name: '기계공',      desc: '뽑기 기계를 끝까지 업그레이드', goal: () => [state.level, MAX_LEVEL], reward: { shards: 40 } },
  { id: 'shopper',   name: '멋쟁이',      desc: '상점에서 꾸미기 3개 사기',      goal: () => [boughtCount(), 3],       reward: { coins: 5 } },
];
export const titleById = id => TITLES.find(t => t.id === id);
// 'done'(보상 받음) | 'ready'(받을 수 있음) | 'locked'
export function titleState(t) {
  if (state.titles?.[t.id]) return 'done';
  const [v, g] = t.goal();
  return v >= g ? 'ready' : 'locked';
}
export const readyCount = () => TITLES.filter(t => titleState(t) === 'ready').length;
export const rewardText = r => r.coins ? `코인 ${r.coins}개` : `조각 ${r.shards}개`;
export function claimTitle(id) {
  const t = titleById(id);
  if (!t || titleState(t) !== 'ready') return false;
  state.titles = { ...state.titles, [id]: true };
  state.coins += t.reward.coins || 0; state.shards += t.reward.shards || 0;
  if (!state.title) state.title = id; // 처음 받은 칭호는 바로 달아 줌
  save();
  return true;
}
export function setTitle(id) {
  if (id && !state.titles?.[id]) return;
  state.title = state.title === id ? null : id; save();
}
export const titleName = () => (state.title && state.titles?.[state.title] && titleById(state.title)?.name) || '';
