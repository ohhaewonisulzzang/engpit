import { state, save } from './state.js';
import { MAX_LEVEL } from './config.js';
import { WEAPONS } from './three/weapons.js';
import { armLevel, MAX_ARM_LV } from './battle/data.js';

/* =========================================================
   칭호: 조건을 달성하면 저절로 얻고 보상(코인·조각)도 바로 들어온다
   얻은 칭호 하나를 프로필(로그인 탭)에서 대표 칭호로 단다
   ========================================================= */
const owned = () => WEAPONS.filter(w => state.inv[w.id]);
const ultras = () => owned().filter(w => w.r === 'ultra').length;
const wave = () => state.best?.wave || 0;
const maxed = () => WEAPONS.filter(w => state.inv[w.id] && armLevel(w.id) >= MAX_ARM_LV).length;
const galaxies = () => Object.values(state.galaxy || {}).filter(Boolean).length;

// now: 지금 값, goal: 목표, coins/shards: 보상
export const TITLES = [
  { id: 'pull1',    name: '첫 캡슐',        desc: '뽑기 1번',                 now: () => state.pulls,   goal: 1,   coins: 3 },
  { id: 'pull100',  name: '뽑기 중독',      desc: '뽑기 100번',               now: () => state.pulls,   goal: 100, shards: 60 },
  { id: 'pull500',  name: '캡슐 장인',      desc: '뽑기 500번',               now: () => state.pulls,   goal: 500, shards: 250 },
  { id: 'word50',   name: '단어 새싹',      desc: '단어 50개 맞히기',          now: () => state.correct, goal: 50,  coins: 10 },
  { id: 'word300',  name: '단어 박사',      desc: '단어 300개 맞히기',         now: () => state.correct, goal: 300, coins: 30 },
  { id: 'word1000', name: '걸어 다니는 사전', desc: '단어 1000개 맞히기',      now: () => state.correct, goal: 1000, coins: 80 },
  { id: 'dex20',    name: '수집가',         desc: '무기 20종 모으기',          now: () => owned().length, goal: 20, shards: 60 },
  { id: 'dexAll',   name: '도감 완성',      desc: `무기 ${WEAPONS.length}종 전부 모으기`, now: () => owned().length, goal: WEAPONS.length, shards: 800 },
  { id: 'ultra1',   name: '무지갯빛 행운',  desc: '울트라 무기 1종 모으기',    now: ultras, goal: 1, shards: 40 },
  { id: 'ultra5',   name: '울트라 컬렉터',  desc: '울트라 무기 5종 모으기',    now: ultras, goal: 5, shards: 200 },
  { id: 'wave10',   name: '생존자',         desc: '전투 웨이브 10 도달',       now: wave, goal: 10, shards: 60 },
  { id: 'wave30',   name: '전쟁 영웅',      desc: '전투 웨이브 30 도달',       now: wave, goal: 30, shards: 200 },
  { id: 'wave60',   name: '불멸',           desc: '전투 웨이브 60 도달',       now: wave, goal: 60, shards: 500 },
  { id: 'max1',     name: '한 우물',        desc: `무기 1종 전투 Lv.${MAX_ARM_LV}`, now: maxed, goal: 1, shards: 60 },
  { id: 'max5',     name: '무기고 관리인',  desc: `무기 5종 전투 Lv.${MAX_ARM_LV}`, now: maxed, goal: 5, shards: 250 },
  { id: 'galaxy1',  name: '별을 품은 자',   desc: '갤럭시 파워 1개 해금',      now: galaxies, goal: 1, shards: 40 },
  { id: 'champ',    name: '랭킹 1위',       desc: '한 달 전투 랭킹을 1위로 마치기 (로그인 필요)', now: () => (state.champ || []).length, goal: 1, coins: 100, shards: 300, gold: true },
  { id: 'machine',  name: '기계공',         desc: '모든 뽑기 기계 열기',       now: () => state.level, goal: MAX_LEVEL, shards: 100 },
];
// 코인 상점에서 사는 칭호 (shop.js). 조건 없이 사면 바로 얻는다
export const SHOP_TITLES = [
  { id: 's_cat',    name: '고양이 집사',     price: 40,  desc: '야옹' },
  { id: 's_rich',   name: '코인 부자',       price: 60,  desc: '코인이 넘쳐나요' },
  { id: 's_night',  name: '밤샘 공부러',     price: 80,  desc: '밤에도 단어 공부' },
  { id: 's_genius', name: '영어 천재',       price: 120, desc: '모르는 단어가 없어요' },
  { id: 's_lucky',  name: '행운의 주인공',   price: 150, desc: '오늘은 울트라가 나올 것 같아' },
  { id: 's_dragon', name: '드래곤 슬레이어', price: 200, desc: '보스도 두렵지 않아' },
  { id: 's_legend', name: '살아있는 전설',   price: 300, desc: '모두가 아는 그 이름' },
  { id: 's_king',   name: '단어의 왕',       price: 500, desc: '단어 나라의 임금님' },
];
export const TITLE = Object.fromEntries([...TITLES, ...SHOP_TITLES].map(t => [t.id, t]));

export const hasTitle = t => !!state.titles?.[t.id];
export const rewardText = t => [t.coins && `코인 ${t.coins}`, t.shards && `조각 ${t.shards}`].filter(Boolean).join(' · ');

// 새로 달성한 칭호를 얻고 보상을 넣는다. 대표 칭호가 없으면 바로 단다. 새로 얻은 칭호 목록을 돌려준다
export function checkTitles() {
  const got = TITLES.filter(t => !hasTitle(t) && t.now() >= t.goal);
  if (!got.length) return got;
  for (const t of got) {
    state.titles = { ...state.titles, [t.id]: true };
    state.coins += t.coins || 0; state.shards += t.shards || 0;
  }
  if (!state.title) state.title = got[0].id;
  save();
  return got;
}
export function wearTitle(id) {
  if (id && !state.titles?.[id]) return;
  state.title = state.title === id ? null : id; save();
}
