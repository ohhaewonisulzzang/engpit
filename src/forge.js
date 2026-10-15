import { state, save } from './state.js';
import { LUCK_MAX, luckCost, MAX_LEVEL, machineCost, SHOP } from './config.js';
import { WEAPONS } from './three/weapons.js';
import { MAX_EQUIP } from './battle/data.js';

/* =========================================================
   조각 쓰는 곳
   - 조각으로 행운을 올리면 모든 기계에서 좋은 등급 확률이 조금씩 오른다
   - 조각으로 뽑기 기계를 업그레이드하면 기계 전용 칼이 나오기 시작한다
   - 조각 교환소에서 아직 없는 영웅 이상 무기를 확정으로 얻는다
   ========================================================= */
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

// 무기 하나를 얻는다 (뽑기와 교환소가 같이 씀). 전투 장착 칸이 비어 있으면 바로 장착
export function grant(w) {
  state.inv[w.id] = 1;
  if (Array.isArray(state.equip) && state.equip.length < MAX_EQUIP && !state.equip.includes(w.id)) state.equip.push(w.id);
}
// 지금 기계에서 나올 수 있는 그 등급 무기 (기계 전용 칼 포함), 그중 아직 없는 무기
export const poolOf = r => WEAPONS.filter(w => w.r === r && (!w.m || w.m <= state.level));
export const freshOf = r => poolOf(r).filter(w => !state.inv[w.id]);
// 교환소: 아직 없는 무기 중에서 하나
export function buyWeapon(r) {
  const fresh = freshOf(r);
  if (!fresh.length || state.shards < SHOP[r]) return null;
  const w = fresh[Math.floor(Math.random() * fresh.length)];
  state.shards -= SHOP[r];
  grant(w); save();
  return w;
}
