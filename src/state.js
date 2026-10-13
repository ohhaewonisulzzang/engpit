// 저장 데이터 (브라우저 localStorage)
// 슈퍼계정·관리 계정으로 로그인하면 따로 저장해서, 같은 브라우저의 일반 진행 상황과 섞이지 않게 한다
export const SLOT_KEY = 'engpit_slot';
const slot = (() => { try { return localStorage.getItem(SLOT_KEY); } catch (e) { return null; } })();
export const SLOT = slot; // 'super_<id>' | 'ctl_<id>' | null
export const SUPER = !!slot?.startsWith('super_');
export const SAVE_KEY = slot ? 'engpit_save_' + slot : 'engpit_save_v1';
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
  ctlRev: 0,   // 관리 계정: 대시보드에서 바꾼 값을 몇 번째까지 적용했는지 (control.js)
});
export const state = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.coins === 'number') return Object.assign(DEFAULT(), s);
  } catch (e) {}
  return DEFAULT();
})();
export function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }

// 랭킹 시즌: 한국 시간 기준 한 달 ("2026-10")
export const monthKey = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 7);

