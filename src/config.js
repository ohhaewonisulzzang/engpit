import { state } from './state.js';

// 테스트 모드(코인 무한, 테스트용 버튼): 개발 서버(npm run dev)에서만 켜지고 배포판에서는 꺼짐
export const TEST_MODE = import.meta.env.DEV;

// 등급 (낮은 등급 → 높은 등급)
export const RARITIES = [
  { key: 'rare',   name: '희귀',     color: '#9aa38f', hex: 0x9aa38f, banner: '희귀' },
  { key: 'super',  name: '초희귀',   color: '#4aa3ff', hex: 0x4aa3ff, banner: '초희귀!' },
  { key: 'hero',   name: '영웅',     color: '#b45cff', hex: 0xb45cff, banner: '영웅!!' },
  { key: 'legend', name: '레전더리', color: '#ffb020', hex: 0xffb020, banner: '레전더리' },
  { key: 'ultra',  name: '울트라',   color: '#ff3d8b', hex: 0xff3d8b, banner: '울트라' },
];
export const RAR = Object.fromEntries(RARITIES.map((r, i) => [r.key, { ...r, rank: i }]));

// 뽑기 기계 레벨. 조각으로 업그레이드하고, 기계가 좋아질수록 높은 등급이 더 잘 나온다
// (희귀 확률은 oddsNow에서 나머지로 계산되므로 합계는 항상 100)
export const LEVELS = [
  { name: '기본 머신',   color: '#ffc83d', cost: 20,  odds: { ultra: .5,  legend: 2.5, hero: 9,  super: 28 } },
  { name: '블루 머신',   color: '#5cc8ff', cost: 45,  odds: { ultra: .8,  legend: 3.5, hero: 11, super: 30 } },
  { name: '로열 머신',   color: '#c77dff', cost: 80,  odds: { ultra: 1.2, legend: 5,   hero: 14, super: 31 } },
  { name: '골드 머신',   color: '#ffd860', cost: 130, odds: { ultra: 1.8, legend: 7,   hero: 17, super: 32 } },
  { name: '코스믹 머신', color: '#ff7ad9',            odds: { ultra: 2.5, legend: 9,   hero: 20, super: 33 } },
];
export const MAX_LEVEL = LEVELS.length;
export const lvl = () => LEVELS[Math.min(state.level, MAX_LEVEL) - 1];
export const machineCost = () => lvl().cost; // 다음 기계로 가는 데 드는 조각

// 분해와 행운: 남는 희귀/초희귀를 분해하거나 전투에서 적을 잡으면 조각이 나오고, 조각으로 행운을 올리면
// 높은 등급 확률이 조금씩 오른다 (오른 만큼 희귀 확률이 줄어듦)
export const SHARD_VALUE = { rare: 1, super: 2 };           // 1개 분해할 때 나오는 조각
export const LUCK_MAX = 10;
export const LUCK_BOOST = { ultra: .08, legend: .06, hero: .05, super: .03 }; // 행운 1단계당 배율
export const luckCost = luck => 4 + luck * 3;                 // 다음 행운 단계 가격

export function oddsNow() {
  const base = lvl().odds, L = state.luck || 0, o = {};
  let sum = 0;
  for (const k of ['ultra', 'legend', 'hero', 'super']) { o[k] = base[k] * (1 + LUCK_BOOST[k] * L); sum += o[k]; }
  o.rare = 100 - sum;
  return o;
}
export const chanceOf = key => oddsNow()[key];
export const pct = v => +v.toFixed(v < 1 ? 3 : 2);
