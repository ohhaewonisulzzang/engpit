// 저장 데이터 (브라우저 localStorage)
export const SAVE_KEY = 'engpit_save_v1';
export const DEFAULT = () => ({
  coins: 3, inv: {}, pulls: 0, correct: 0, wrong: 0, custom: [], missed: {},
  level: 1, // 뽑기 기계 레벨
  got: [],  // 지금 기계에서 뽑은 무기 id 목록 (다 모으면 업그레이드)
  shards: 0, // 분해해서 모은 조각
  luck: 0,   // 행운 단계 (높은 등급 확률 증가)
});
export const state = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.coins === 'number') return Object.assign(DEFAULT(), s);
  } catch (e) {}
  return DEFAULT();
})();
export function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
