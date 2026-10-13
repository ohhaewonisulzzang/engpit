import { state, save } from './state.js';
import { SHARD_VALUE, LUCK_MAX, luckCost, MAX_LEVEL, machineCost, SHOP } from './config.js';
import { WEAPONS } from './three/weapons.js';
import { MAX_ARM_LV, MAX_EQUIP } from './battle/data.js';

/* =========================================================
   분해와 조각 업그레이드
   - 희귀/초희귀는 1개(도감용)만 남기고 나머지를 분해해서 조각으로 바꿀 수 있다
   - 영웅 이상은 전투 레벨이 최대를 넘어서 쓸모없는 개수만 분해할 수 있다
   - 조각 교환소에서 영웅 이상 무기를 확정으로 얻는다
   - 조각으로 행운을 올리면 모든 기계에서 좋은 등급 확률이 조금씩 오른다
   - 조각으로 뽑기 기계를 업그레이드하면 좋은 등급 확률이 크게 오른다
   ========================================================= */
export const canDismantle = w => w.r in SHARD_VALUE;
const LOW = { rare: 1, super: 1 };
export function spare(w) {
  const n = state.inv[w.id] || 0;
  if (LOW[w.r]) return Math.max(0, n - 1);
  return Math.max(0, Math.min(n - 1, n + (state.armUp?.[w.id] || 0) - MAX_ARM_LV));
}
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

export const machineMaxed = () => state.level >= MAX_LEVEL;
// 조각만 내고, 레벨은 뽑기 화면의 업그레이드 연출(upgradeMachine)에서 올린다
export function payMachine() {
  if (machineMaxed() || state.shards < machineCost()) return false;
  state.shards -= machineCost(); save();
  return true;
}

// 무기 하나를 얻는다 (뽑기와 교환소가 같이 씀). 처음 얻은 무기는 전투 장착 칸이 비어 있으면 바로 장착
export function grant(w) {
  const isNew = !state.inv[w.id];
  state.inv[w.id] = (state.inv[w.id] || 0) + 1;
  if (isNew && Array.isArray(state.equip) && state.equip.length < MAX_EQUIP) state.equip.push(w.id);
  return isNew;
}
// 지금 기계에서 나올 수 있는 그 등급 무기 (기계 전용 칼 포함)
export const poolOf = r => WEAPONS.filter(w => w.r === r && (!w.m || w.m <= state.level));
// 교환소: 안 가진 무기가 있으면 그중에서, 다 가졌으면 전투 레벨이 가장 낮은 무기 쪽에서 고른다
export function buyWeapon(r) {
  if (state.shards < SHOP[r]) return null;
  const pool = poolOf(r), fresh = pool.filter(w => !state.inv[w.id]);
  const lv = w => (state.inv[w.id] || 0) + (state.armUp?.[w.id] || 0);
  const low = Math.min(...pool.map(lv));
  const pick = fresh.length ? fresh : pool.filter(w => lv(w) === low);
  const w = pick[Math.floor(Math.random() * pick.length)];
  state.shards -= SHOP[r];
  const isNew = grant(w); save();
  return { w, isNew };
}
