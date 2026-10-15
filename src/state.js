// 저장 데이터 (브라우저 localStorage)
// 슈퍼계정으로 로그인하면 따로 저장해서, 같은 브라우저의 일반 진행 상황과 섞이지 않게 한다
export const SLOT_KEY = 'engpit_slot';
// 되돌리기 복구 (한 번만): 상점·관리 계정·서버 저장 업데이트(2026-10, 되돌림) 동안 진행은 'engpit_save_u_<id>'·'engpit_save_ctl_<id>'에
// 있었을 수 있고, 전투 레벨은 무기 개수 대신 armUp에 따로 있었다. 진행이 가장 많은 저장을 'engpit_save_v1'로 되돌려 놓고
// armUp을 다시 무기 개수로 바꾼다 (같은 무기 n개 = 전투 Lv.n)
(() => {
  try {
    if (localStorage.getItem('engpit_restore_62b')) return;
    const sl = localStorage.getItem(SLOT_KEY);
    if (sl && !sl.startsWith('super_')) localStorage.removeItem(SLOT_KEY);
    const score = s => [Object.values(s.inv || {}).filter(n => n > 0).length, s.level || 1, Object.values(s.armUp || {}).reduce((a, b) => a + (+b || 0), 0), s.pulls || 0];
    const more = (a, b) => { const x = score(a), y = score(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
    const keys = Object.keys(localStorage).filter(k => k.startsWith('engpit_save_u_') || k.startsWith('engpit_save_ctl_'));
    let best = null;
    for (const k of ['engpit_save_v1', ...keys]) { // 진행이 같으면 나중에 쓴 계정 저장 쪽
      const s = JSON.parse(localStorage.getItem(k));
      if (s && typeof s.coins === 'number' && (!best || !more(best, s))) best = s;
    }
    if (best) {
      delete best.cloudRev; delete best.cloudDirty;
      for (const [id, up] of Object.entries(best.armUp || {})) if (best.inv?.[id]) best.inv[id] = Math.max(best.inv[id], 1 + (+up || 0));
      localStorage.setItem('engpit_save_v1', JSON.stringify(best));
    }
    localStorage.setItem('engpit_restore_62b', '1');
  } catch (e) {}
})();
const slot = (() => { try { return localStorage.getItem(SLOT_KEY); } catch (e) { return null; } })();
export const SUPER = !!slot;
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
  pity: { legend: 0, ultra: 0 }, // 천장: 그 등급 이상이 안 나온 채로 뽑은 횟수
  owned: {},   // 상점에서 산 꾸미기 { 아이템 id: true }
  wear: { skin: 'basic', theme: 'basic', sfx: 'basic' }, // 지금 쓰는 꾸미기
  titles: {},  // 보상을 받은 칭호 { 칭호 id: true }
  title: null, // 이름 옆에 보이는 대표 칭호 id
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

