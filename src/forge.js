import { state, save } from './state.js';
import { SHARD_VALUE, LUCK_MAX, luckCost } from './config.js';
import { WEAPONS } from './three/weapons.js';

/* =========================================================
   분해와 행운
   - 희귀/초희귀는 1개(도감용)만 남기고 나머지를 분해해서 조각으로 바꿀 수 있다
   - 조각으로 행운을 올리면 모든 기계에서 좋은 등급 확률이 조금씩 오른다
   ========================================================= */
export const canDismantle = w => w.r in SHARD_VALUE;
export const spare = w => canDismantle(w) ? Math.max(0, (state.inv[w.id] || 0) - 1) : 0;
export const spareShards = () => WEAPONS.reduce((a, w) => a + spare(w) * (SHARD_VALUE[w.r] || 0), 0);

// n개 분해하고 얻은 조각 수를 돌려준다
export function dismantle(w, n = 1) {
  n = Math.min(n, spare(w));
  if (n <= 0) return 0;
  state.inv[w.id] -= n;
  const got = n * SHARD_VALUE[w.r];
  state.shards += got; save();
  return got;
}
export const dismantleAll = () => WEAPONS.reduce((a, w) => a + dismantle(w, spare(w)), 0);

export const luckMaxed = () => state.luck >= LUCK_MAX;
export const nextLuckCost = () => luckCost(state.luck);
export function buyLuck() {
  if (luckMaxed() || state.shards < nextLuckCost()) return false;
  state.shards -= nextLuckCost(); state.luck++; save();
  return true;
}
