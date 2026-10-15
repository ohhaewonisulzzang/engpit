// 저장 데이터 (브라우저 localStorage)
// 로그인하면 계정 저장 칸('engpit_save_u_<id>', 슈퍼계정 'super_<id>', 관리 계정 'ctl_<id>')에 저장하고 서버(cloud.js)와 맞춘다.
// 서버 것이 진짜이고 이건 기기에 둔 사본
// 로그인하지 않으면 'engpit_save_v1' (예전에는 로그인해도 이걸 써서 기기마다 진행이 따로 놀았음)
export const SLOT_KEY = 'engpit_slot';
const slot = (() => { try { return localStorage.getItem(SLOT_KEY); } catch (e) { return null; } })();
export const SLOT = slot; // 'u_<id>' | 'super_<id>' | 'ctl_<id>' | null
export const SUPER = !!slot?.startsWith('super_');
export const CLOUD = !!slot; // 로그인한 계정은 전부 서버 저장 (일반·슈퍼·관리 계정)
export const GUEST_KEY = 'engpit_save_v1';
export const SAVE_KEY = slot ? 'engpit_save_' + slot : GUEST_KEY;
export const DEFAULT = () => ({
  coins: 3, inv: {}, pulls: 0, correct: 0, wrong: 0, custom: [], missed: {},
  level: 1, // 뽑기 기계 레벨 (조각으로 업그레이드)
  shards: 0, // 분해하거나 전투에서 모은 조각
  luck: 0,   // 행운 단계 (높은 등급 확률 증가)
  equip: null, // 전투에 들고 가는 무기 id (null이면 처음 한 번 자동으로 채움)
  best: null,  // 전투 최고 기록 { wave, kills }
  galaxy: {},  // 해금한 갤럭시 파워 { 무기 id: true }
  gpOff: {},   // 해금했지만 벗어 둔 갤럭시 파워 { 무기 id: true }
  armUp: {},   // 조각으로 올린 전투 레벨 { 무기 id: 단계 }
  pity: { legend: 0, ultra: 0 }, // 그 등급 이상이 안 나온 채로 뽑은 횟수 (천장)
  titles: {},  // 보상을 받은 칭호 { 칭호 id: true }
  title: null, // 대표 칭호 id
  champ: [],   // 전투 랭킹을 1위로 마친 달 ['2026-10'] (칭호 '랭킹 1위')
  shop: {},    // 상점에서 산 것 { 'skin:gold': true } (칭호는 titles에)
  skin: 'basic', theme: 'basic', sfx: 'basic', // 쓰는 중인 캐릭터 스킨·배경 테마·정답 효과음 (shop.js)
  ctlRev: 0,   // 관리 계정: 대시보드에서 바꾼 값을 몇 번째까지 적용했는지 (control.js)
  cloudRev: 0, cloudDirty: false, // 일반 계정: 마지막으로 서버와 맞춘 저장 번호, 그 뒤에 바뀐 게 있는지 (cloud.js)
});
const load = k => { try { const s = JSON.parse(localStorage.getItem(k)); if (s && typeof s.coins === 'number') return s; } catch (e) {} return null; };
const cache = load(SAVE_KEY);
// 이 브라우저에서 일반 계정으로 처음 로그인: 로그인 안 한 저장(업데이트 전에는 로그인해도 이걸 씀)을 가져와 둔다
export const FROM_GUEST = !!slot?.startsWith('u_') && !cache && !!load(GUEST_KEY);
// 서버와 한 번도 맞춘 적 없는 진행 (위의 예전 저장, 업데이트 전 이 기기에만 있던 슈퍼·관리 계정 저장):
// 서버 것과 비교해서 진행이 많은 쪽이 남는다 (cloud.js의 migrateSave)
export const LEGACY = CLOUD && (cache ? !cache.cloudRev : FROM_GUEST);
export const state = Object.assign(DEFAULT(), cache || (FROM_GUEST && { ...load(GUEST_KEY), cloudRev: 0, cloudDirty: true }) || {});
// 저장할 때마다 부를 함수 (관리 계정이 바뀐 상태를 서버에 바로 올릴 때 씀, control.js)
const saveHooks = new Set();
export const onSave = f => saveHooks.add(f);
export const writeLocal = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} };
let locked = false;
export const lockSave = () => { locked = true; }; // 서버 저장으로 다시 불러오기 직전: 더는 안 씀
export function save() {
  if (locked) return;
  if (CLOUD) state.cloudDirty = true;
  writeLocal(); saveHooks.forEach(f => f());
}
// 서버에서 받은 저장으로 통째로 바꾼다 (화면이 뜨기 전에, 또는 바꾼 뒤 새로고침)
export function replaceState(data, rev) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, DEFAULT(), data, { cloudRev: rev, cloudDirty: false });
  writeLocal();
}

// 랭킹 시즌: 한국 시간 기준 한 달 ("2026-10")
export const monthKey = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 7);

