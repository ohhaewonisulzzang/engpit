/* =========================================================
   경쟁전(실시간 1대1 넉아웃) 규칙
   ========================================================= */
// 밴픽
export const BANS = 2;                       // 한 사람이 밴하는 무기 수
export const PICKS = 3;                      // 한 사람이 고르는 무기 수
export const BUDGET = 5;                     // 고른 무기 비용 합 상한
export const COST = { rare: 0, super: 0, hero: 1, legend: 2, ultra: 3 };
export const BAN_TIME = 25, PICK_TIME = 20;  // 초
// 먼저 고르는 사람(0)과 나중 사람(1)의 순서: 1-2-2-1
export const PICK_ORDER = [0, 1, 1, 0, 0, 1];

// 대결
export const ROUNDS_TO_WIN = 2;              // 3판 2선승
export const PVP_HP = 1600;
export const PVP_DMG = .5;                   // 일반 전투보다 피해를 줄여서 오래 싸우게
export const SPEED = 170;
export const DASH = { cd: 3.5, time: .18, speed: 900 };
export const COUNTDOWN = 3, ROUND_TIME = 90, BREAK_TIME = 3;
export const POISON = { start: 40, full: 70, minScale: .3, dps: .06 }; // 독 안개: 40초부터 70초까지 30% 크기로 줄어듦, 초당 최대 체력 6%

// 경기장 (가운데 기준 좌우 대칭) 과 벽
export const ARENA = { w: 1200, h: 760 };
export const WALLS = [
  { x: 560, y: 320, w: 80, h: 120 },
  { x: 290, y: 150, w: 140, h: 40 }, { x: 770, y: 570, w: 140, h: 40 },
  { x: 770, y: 150, w: 140, h: 40 }, { x: 290, y: 570, w: 140, h: 40 },
  { x: 170, y: 345, w: 40, h: 70 }, { x: 990, y: 345, w: 40, h: 70 },
];
export const SPAWN = [{ x: 100, y: 380 }, { x: 1100, y: 380 }];

// 티어 (시즌 = 한 달)
export const TIERS = [
  { name: '브론즈', min: 0,    color: '#c98a4a' },
  { name: '실버',   min: 200,  color: '#c9d3dc' },
  { name: '골드',   min: 450,  color: '#ffc83d' },
  { name: '다이아', min: 750,  color: '#6ad8ff' },
  { name: '마스터', min: 1100, color: '#ff5ab0' },
];
export const tierOf = pts => [...TIERS].reverse().find(t => pts >= t.min);
export const nextTier = pts => TIERS.find(t => t.min > pts) || null;
