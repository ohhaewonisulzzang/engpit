import { state, SUPER } from './state.js';

// 테스트 모드(코인 무한, 테스트용 버튼): 개발 서버(npm run dev)에서만 켜지고 배포판에서는 꺼짐
export const TEST_MODE = import.meta.env.DEV;
// 코인 무한: 테스트 모드이거나 슈퍼계정으로 로그인했을 때
export const FREE = TEST_MODE || SUPER;

// 월간 조각 랭킹 서버 (Supabase). 비어 있으면 랭킹 탭에서 "서버 설정 필요"라고 보여 준다
// anon 키는 브라우저에 공개돼도 되는 키라서 코드에 그대로 넣는다 (쓰기는 supabase/ranking.sql의 함수로만 가능)
export const RANKING = {
  url: 'https://gbqryhbmysnmnnachtrz.supabase.co', // 예: 'https://abcd1234.supabase.co'
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicXJ5aGJteXNubW5uYWNodHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjUwOTAsImV4cCI6MjEwNzMwMTA5MH0.xthss76UMUm82twQYmkTbY5wJcxO-XzHAI3BOOpeY6Q', // 프로젝트 설정 → API → anon public 키
};

// 등급 (낮은 등급 → 높은 등급)
export const RARITIES = [
  { key: 'rare',   name: '희귀',     color: '#9aa38f', hex: 0x9aa38f, banner: '희귀' },
  { key: 'super',  name: '초희귀',   color: '#4aa3ff', hex: 0x4aa3ff, banner: '초희귀!' },
  { key: 'hero',   name: '영웅',     color: '#b45cff', hex: 0xb45cff, banner: '영웅!!' },
  { key: 'legend', name: '레전더리', color: '#ffb020', hex: 0xffb020, banner: '레전더리' },
  { key: 'ultra',  name: '울트라',   color: '#ff3d8b', hex: 0xff3d8b, banner: '울트라' },
];
export const RAR = Object.fromEntries(RARITIES.map((r, i) => [r.key, { ...r, rank: i }]));

// 뽑기 기계 레벨. 조각으로 업그레이드하면 높은 등급 확률은 점점 낮아지지만,
// 기계 전용 칼(무기의 m)이 생긴다. 전용 칼은 m 레벨 이상의 기계에서 뽑힌다
// (희귀 확률은 oddsNow에서 나머지로 계산되므로 합계는 항상 100)
// 갤럭시 파워가 전투 Lv.11(같은 무기 11개)부터라서 높은 등급(영웅·레전더리·울트라)을 기계마다 합쳐서 3%p 올려 둠
export const LEVELS = [
  { name: '기본 머신',   color: '#ffc83d', cost: 20,  odds: { ultra: 1,   legend: 3.5, hero: 10.5, super: 28 } },
  { name: '블루 머신',   color: '#5cc8ff', cost: 45,  odds: { ultra: .92, legend: 3.2, hero: 9.5,  super: 26 } },
  { name: '로열 머신',   color: '#c77dff', cost: 80,  odds: { ultra: .85, legend: 2.9, hero: 8.5,  super: 24 } },
  { name: '골드 머신',   color: '#ffd860', cost: 130, odds: { ultra: .78, legend: 2.6, hero: 7.5,  super: 22 } },
  { name: '코스믹 머신', color: '#ff7ad9',            odds: { ultra: .7,  legend: 2.3, hero: 6.5,  super: 20 } },
];
export const MAX_LEVEL = LEVELS.length;
export const lvl = () => LEVELS[Math.min(state.level, MAX_LEVEL) - 1];
export const machineCost = () => lvl().cost; // 다음 기계로 가는 데 드는 조각
// 뽑힌 등급에 지금 기계로 뽑을 수 있는 전용 칼이 있으면 이 확률로 전용 칼이 나온다
export const EXCLUSIVE_CHANCE = .4;

// 분해와 행운: 남는 희귀/초희귀를 분해하거나 전투에서 적을 잡으면 조각이 나오고, 조각으로 행운을 올리면
// 높은 등급 확률이 조금씩 오른다 (오른 만큼 희귀 확률이 줄어듦)
export const SHARD_VALUE = { rare: 1, super: 2 };           // 1개 분해할 때 나오는 조각
export const LUCK_MAX = 10;
export const LUCK_BOOST = { ultra: .08, legend: .06, hero: .05, super: .03 }; // 행운 1단계당 배율
export const luckCost = luck => 4 + luck * 3;                 // 다음 행운 단계 가격

// 천장: 이 횟수째 뽑기까지 그 등급 이상이 한 번도 안 나오면 그 뽑기는 확정 (울트라가 레전더리보다 먼저)
export const PITY = { legend: 50, ultra: 150 };
// 한 번에 뽑기 횟수 (코인도 그만큼)
export const MULTI = [10, 100];
// 조각 교환소: 조각을 내고 그 등급 무기 하나를 확정으로 받는다
export const EXCHANGE = { hero: 50, legend: 140, ultra: 380 };

export function oddsNow() {
  const base = lvl().odds, L = state.luck || 0, o = {};
  let sum = 0;
  for (const k of ['ultra', 'legend', 'hero', 'super']) { o[k] = base[k] * (1 + LUCK_BOOST[k] * L); sum += o[k]; }
  o.rare = 100 - sum;
  return o;
}
export const chanceOf = key => oddsNow()[key];
export const pct = v => +v.toFixed(v < 1 ? 3 : 2);
