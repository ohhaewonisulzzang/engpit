import { state, save } from './state.js';
import { WEAPONS } from './three/weapons.js';
import { MAX_EQUIP } from './battle/data.js';

/* =========================================================
   메타: 가진 무기 3개 조합에 이름을 붙여 저장해 둔다. 만들기는 메타 탭(ui/meta.js), 고르기·장착은 전투 탭(ui/battle.js)
   - state.metas에 저장하므로 로그인하면 계정(서버) 저장에 같이 올라간다 (cloud.js)
   - 최대 MAX_METAS개
   ========================================================= */
export const MAX_METAS = 10;
export const NAME_MAX = 12;
const IDS = new Set(WEAPONS.map(w => w.id));

// 저장된 메타 (무기 id가 이상하면 빼고 읽음) [{ id, name, arms: [무기 id ×3] }]
export function metas() {
  if (!Array.isArray(state.metas)) state.metas = [];
  return state.metas.filter(m => m && Array.isArray(m.arms));
}
const sameSet = (a, b) => a.length === b.length && a.every(id => b.includes(id));
export const findMeta = id => metas().find(m => m.id === id);

// 새로 저장하거나(id 없음) 고친다. 돌려주는 값: 'ok' | 'full' | 'dup' | 'bad'
export function saveMeta(name, arms, id = null) {
  arms = [...new Set(arms)].filter(a => IDS.has(a) && state.inv[a]);
  if (arms.length !== MAX_EQUIP) return 'bad';
  const list = metas();
  if (!id && list.length >= MAX_METAS) return 'full';
  if (list.some(m => m.id !== id && sameSet(m.arms, arms))) return 'dup';
  name = String(name || '').trim().slice(0, NAME_MAX) || `메타 ${list.length + (id ? 0 : 1)}`;
  if (id) state.metas = list.map(m => m.id === id ? { ...m, name, arms } : m);
  else state.metas = [...list, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, arms }];
  save();
  return 'ok';
}
export function deleteMeta(id) {
  state.metas = metas().filter(m => m.id !== id); save();
}
// 장착: 그 메타의 무기 중 가진 것만 장착 칸에 넣는다. 못 넣은(없는) 무기 수를 돌려준다
export function equipMeta(id) {
  const m = findMeta(id); if (!m) return -1;
  state.equip = m.arms.filter(a => state.inv[a]).slice(0, MAX_EQUIP);
  save();
  return m.arms.length - state.equip.length;
}
export const isWorn = (m, eq) => sameSet(m.arms, eq);
