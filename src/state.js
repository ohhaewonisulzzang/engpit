// 저장 데이터 (브라우저 localStorage)
export const SAVE_KEY = 'engpit_save_v1';
export const DEFAULT = () => ({
  coins: 3, inv: {}, pulls: 0, correct: 0, wrong: 0, custom: [], missed: {},
  level: 1, // 뽑기 기계 레벨 (조각으로 업그레이드)
  shards: 0, // 분해하거나 전투에서 모은 조각
  luck: 0,   // 행운 단계 (높은 등급 확률 증가)
  equip: null, // 전투에 들고 가는 무기 id (null이면 처음 한 번 자동으로 채움)
  best: null,  // 전투 최고 기록 { wave, kills }
  galaxy: {},  // 해금한 갤럭시 파워 { 무기 id: true }
  gpOff: {},   // 해금했지만 벗어 둔 갤럭시 파워 { 무기 id: true }
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

