// 그래픽 설정 (프로필에서 바꾼다, ui/profile.js)
// 기기마다 성능이 달라서 계정 저장(state.js)과 따로 이 브라우저의 localStorage에만 둔다
// - res: 렌더링 해상도 (low 0.75배 · mid 1배 · high 기기 해상도, 최대 2배)
// - quality: 그래픽 품질 (low는 파티클·바닥 장식·그림자를 줄이고 뽑기 화면 그림자를 끈다)
// - hitbox: 전투에서 플레이어·적·탄의 판정 원 보이기
// - vfx: 파티클·폭발·번개·고리·궤적·빛 번짐·화면 흔들림 같은 이펙트 전부 (뽑기 화면 파티클 포함)
const KEY = 'engpit_settings';
export const SETTINGS_DEFAULT = { res: 'high', quality: 'high', hitbox: false, vfx: true };
export const settings = { ...SETTINGS_DEFAULT };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}

const hooks = new Set();
export const onSettings = f => { hooks.add(f); f(settings); };
export function setSetting(k, v) {
  settings[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {}
  hooks.forEach(f => f(settings));
}

// 화면 픽셀 배율
export const pixelRatio = () => ({ low: .75, mid: 1 }[settings.res] ?? Math.min(devicePixelRatio, 2));
// 파티클 개수 배율
export const partK = () => ({ low: .35, mid: .65 }[settings.quality] ?? 1);
