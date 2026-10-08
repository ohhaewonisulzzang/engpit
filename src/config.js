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

// 뽑기 기계 레벨. 지금 기계에서 무기를 전부 뽑으면 다음 기계로 업그레이드되고,
// 기계가 좋아질수록 높은 등급은 더 안 나온다 (확률 합계는 항상 100)
export const LEVELS = [
  { name: '기본 머신',   color: '#ffc83d', odds: { ultra: 1,   legend: 4,   hero: 12,  super: 28,    rare: 55 } },
  { name: '블루 머신',   color: '#5cc8ff', odds: { ultra: .6,  legend: 3,   hero: 9,   super: 27.4,  rare: 60 } },
  { name: '로열 머신',   color: '#c77dff', odds: { ultra: .3,  legend: 2,   hero: 7,   super: 25.7,  rare: 65 } },
  { name: '골드 머신',   color: '#ffd860', odds: { ultra: .15, legend: 1.2, hero: 5,   super: 23.65, rare: 70 } },
  { name: '코스믹 머신', color: '#ff7ad9', odds: { ultra: .05, legend: .6,  hero: 3.5, super: 20.85, rare: 75 } },
];
export const MAX_LEVEL = LEVELS.length;
export const lvl = () => LEVELS[Math.min(state.level, MAX_LEVEL) - 1];

// 분해와 행운: 남는 희귀/초희귀를 분해하면 조각이 나오고, 조각으로 행운을 올리면
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
