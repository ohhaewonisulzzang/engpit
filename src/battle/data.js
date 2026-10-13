import { state } from '../state.js';

/* =========================================================
   전투 데이터: 무기 공격 방식, 적, 보스, 웨이브 효과
   ========================================================= */
export const MAX_EQUIP = 3;      // 전투에 들고 갈 수 있는 무기 수
export const WAVE_LEN = 40;      // 웨이브마다 보스가 나오기까지 버티는 시간(초)

// 전투 레벨 = 1 + 조각으로 올린 단계 (무기는 하나씩만 가진다)
export const MAX_ARM_LV = 11;
export const armLevel = id => Math.min(1 + (state.inv[id] ? state.armUp?.[id] || 0 : 0), MAX_ARM_LV);
// 조각으로 전투 레벨 1 올리기: 높은 등급일수록, 레벨이 높을수록 비싸다
export const armUpCost = w => ({ rare: 2, super: 3, hero: 5, legend: 8, ultra: 12 }[w.r]) * armLevel(w.id);
export function buyArmUp(w) {
  if (!state.inv[w.id] || armLevel(w.id) >= MAX_ARM_LV) return false;
  const cost = armUpCost(w);
  if (state.shards < cost) return false;
  state.shards -= cost;
  state.armUp = { ...state.armUp, [w.id]: (state.armUp?.[w.id] || 0) + 1 };
  return true;
}
export const lvMult = lv => 1 + .12 * (lv - 1);

// kind: swing(앞쪽 휘두르기) | spin(360도 베기) | shot(던지기) | orbit(주위를 돎) | nova(사방으로 발사)
//       thrust(일직선 찌르기) | bolt(주변 적에게 번개) | zone(블랙홀 장판)
// slow: 맞은 적이 잠깐 느려짐
export const KIND_NAME = { swing: '휘두르기', spin: '회전 베기', shot: '던지기', orbit: '주위를 돎', nova: '사방 발사', thrust: '찌르기', bolt: '번개', zone: '블랙홀' };
export const ARMS = {
  fists:       { kind: 'swing', dmg: 9,  cd: .5,  reach: 58,  arc: 130, knock: 110 },
  stick:       { kind: 'swing', dmg: 8,  cd: .85, reach: 72,  arc: 110, knock: 80 },
  ladle:       { kind: 'swing', dmg: 7,  cd: .6,  reach: 62,  arc: 130, knock: 200 },
  dagger:      { kind: 'shot',  dmg: 10, cd: .7,  speed: 460, pierce: 0, size: 40 },
  club:        { kind: 'spin',  dmg: 15, cd: 1.5, reach: 84,  knock: 170 },
  sling:       { kind: 'shot',  dmg: 12, cd: .65, speed: 400, pierce: 1, curve: -2.2, stone: true, size: 9 },
  pipe:        { kind: 'orbit', dmg: 11, count: 1, radius: 78,  spin: 3.2, size: 58 },
  longsword:   { kind: 'swing', dmg: 22, cd: .95, reach: 118, arc: 160, knock: 120 },
  axe:         { kind: 'shot',  dmg: 24, cd: 1.3, speed: 360, pierce: 99, boomerang: true, spinning: true, size: 56 },
  solaris:     { kind: 'orbit', dmg: 28, count: 3, radius: 100, spin: 3.6, size: 62 },
  dragonstaff: { kind: 'shot',  dmg: 30, cd: 1.0, speed: 320, pierce: 0, explode: 80, fire: true, size: 12 },
  cosmic:      { kind: 'nova',  dmg: 42, cd: 1.2, count: 8, speed: 520, size: 54 },
  voidreaper:  { kind: 'spin',  dmg: 50, cd: 1.6, reach: 170, pull: true },
  umbrella:    { kind: 'swing', dmg: 8,  cd: .75, reach: 66,  arc: 140, knock: 150 },
  brick:       { kind: 'shot',  dmg: 15, cd: 1.1, speed: 300, pierce: 0, spinning: true, size: 34 },
  frypan:      { kind: 'swing', dmg: 16, cd: 1.0, reach: 78,  arc: 150, knock: 300 },
  kunai:       { kind: 'shot',  dmg: 11, cd: .6,  speed: 520, pierce: 0, count: 2, size: 38 },
  spear:       { kind: 'thrust', dmg: 26, cd: .85, reach: 160, width: 20 },
  chakram:     { kind: 'orbit', dmg: 20, count: 2, radius: 92, spin: 4.2, size: 56, slow: true },
  thunder:     { kind: 'bolt',  dmg: 34, cd: 1.1, count: 3, range: 380, splash: 45 },
  frostbow:    { kind: 'shot',  dmg: 30, cd: .9,  speed: 620, pierce: 4, count: 3, arrow: true, slow: true, size: 10 },
  blackhole:   { kind: 'zone',  dmg: 20, cd: 3.2, radius: 115, life: 2.6 },
  // 추가 레전더리
  tidetrident:   { kind: 'thrust', dmg: 30, cd: .9,  reach: 170, width: 26, slow: true },
  phoenixbow:    { kind: 'shot',  dmg: 26, cd: .9,  speed: 560, pierce: 2, count: 2, arrow: true, size: 10 },
  stormblade:    { kind: 'swing', dmg: 30, cd: .8,  reach: 125, arc: 170, knock: 160 },
  moonsickle:    { kind: 'spin',  dmg: 32, cd: 1.2, reach: 125, knock: 120 },
  glacierhammer: { kind: 'spin',  dmg: 40, cd: 1.7, reach: 120, knock: 260, slow: true },
  serpentwhip:   { kind: 'thrust', dmg: 24, cd: .6, reach: 210, width: 14 },
  starshuriken:  { kind: 'shot',  dmg: 18, cd: .7,  speed: 560, pierce: 1, count: 3, spinning: true, size: 40 },
  runeorb:       { kind: 'orbit', dmg: 22, count: 4, radius: 95, spin: 4, size: 40 },
  thornshield:   { kind: 'swing', dmg: 26, cd: .9,  reach: 80, arc: 200, knock: 340 },
  meteorstaff:   { kind: 'bolt',  dmg: 36, cd: 1.3, count: 2, range: 400, splash: 65, col: '#ff8a3d' },
  windfan:       { kind: 'nova',  dmg: 22, cd: 1.0, count: 6, speed: 460, size: 44 },
  crimsonkatana: { kind: 'swing', dmg: 24, cd: .55, reach: 108, arc: 140, knock: 90 },
  earthgauntlet: { kind: 'swing', dmg: 38, cd: 1.0, reach: 72, arc: 130, knock: 400 },
  spiritlantern: { kind: 'zone',  dmg: 16, cd: 2.8, radius: 95, life: 2.4 },
  sunspear:      { kind: 'shot',  dmg: 40, cd: 1.2, speed: 640, pierce: 99, size: 64 },
  // 추가 울트라
  galaxybow:     { kind: 'shot',  dmg: 34, cd: .85, speed: 700, pierce: 5, count: 5, arrow: true, size: 10 },
  chronoblade:   { kind: 'swing', dmg: 48, cd: .8,  reach: 145, arc: 200, knock: 150, slow: true },
  nebulastaff:   { kind: 'zone',  dmg: 26, cd: 2.6, radius: 140, life: 3 },
  supernova:     { kind: 'nova',  dmg: 40, cd: 1.3, count: 12, speed: 560, size: 50 },
  abysstrident:  { kind: 'thrust', dmg: 60, cd: 1.0, reach: 230, width: 32 },
  zeusspear:     { kind: 'bolt',  dmg: 48, cd: 1.0, count: 4, range: 460, splash: 60 },
  dragonfang:    { kind: 'spin',  dmg: 58, cd: 1.4, reach: 165, knock: 220 },
  angelwing:     { kind: 'orbit', dmg: 30, count: 5, radius: 115, spin: 4.4, size: 54 },
  demonaxe:      { kind: 'shot',  dmg: 50, cd: 1.2, speed: 400, pierce: 99, boomerang: true, spinning: true, size: 72 },
  prismcannon:   { kind: 'shot',  dmg: 44, cd: .75, speed: 760, pierce: 2, count: 3, size: 30 },
  worldtree:     { kind: 'orbit', dmg: 36, count: 3, radius: 120, spin: 3, size: 56, slow: true },
  eclipse:       { kind: 'orbit', dmg: 46, count: 2, radius: 105, spin: 5, size: 72 },
  quasarhammer:  { kind: 'spin',  dmg: 70, cd: 1.8, reach: 180, knock: 300 },
  phantomdagger: { kind: 'shot',  dmg: 30, cd: .5,  speed: 640, pierce: 0, count: 4, size: 40 },
  genesis:       { kind: 'zone',  dmg: 30, cd: 3.0, radius: 160, life: 3.4 },
  // 기계 전용 칼
  bluewave:      { kind: 'swing', dmg: 24, cd: .75, reach: 110, arc: 160, knock: 140, slow: true },
  seadragon:     { kind: 'spin',  dmg: 36, cd: 1.2, reach: 135, knock: 180 },
  aquacalibur:   { kind: 'swing', dmg: 54, cd: .85, reach: 150, arc: 210, knock: 200, slow: true },
  royalguard:    { kind: 'thrust', dmg: 28, cd: .7, reach: 150, width: 22 },
  crownrapier:   { kind: 'thrust', dmg: 36, cd: .5, reach: 175, width: 18 },
  emperorblade:  { kind: 'swing', dmg: 60, cd: .9,  reach: 155, arc: 220, knock: 220 },
  goldscimitar:  { kind: 'swing', dmg: 26, cd: .6,  reach: 105, arc: 150, knock: 120 },
  midas:         { kind: 'spin',  dmg: 40, cd: 1.2, reach: 140, knock: 160 },
  eldorado:      { kind: 'shot',  dmg: 46, cd: .8,  speed: 600, pierce: 3, count: 3, size: 60 },
  meteorsword:   { kind: 'spin',  dmg: 30, cd: 1.1, reach: 120, knock: 200 },
  aurorablade:   { kind: 'swing', dmg: 40, cd: .7,  reach: 140, arc: 190, knock: 150 },
  infinity:      { kind: 'orbit', dmg: 50, count: 4, radius: 120, spin: 4.6, size: 70 },
};

/* ---------- 갤럭시 파워 ----------
   무기마다 하나씩 있는 특수 능력 (브롤스타즈의 스타파워 같은 것)
   전투 레벨이 GALAXY_LV 이상이면 조각으로 해금하고, 해금한 뒤에는 도감이나 전투 탭에서 착용/해제한다
   fx: burn(불·독 지속 피해) slow(둔화) leech(흡혈) crit(치명타) power(공격력) execute(약한 적 추가 피해)
       shield(주기적 보호막) swift(이동 속도) thorns(받은 피해 반사) stun(기절) regen(재생)
       reach(공격 범위) quick(공격 속도) multi(투사체·궤도 +1) */
export const GALAXY_LV = 11;
export const galaxyCost = r => ({ rare: 15, super: 25, hero: 40, legend: 60, ultra: 80 }[r]);
export const GALAXY = {
  stick:         { name: '이끼 가시',     fx: 'burn',    v: .3,  desc: '맞은 적이 2초 동안 독으로 공격력의 30% 피해를 더 받아요' },
  ladle:         { name: '뜨거운 국물',   fx: 'burn',    v: .4,  desc: '맞은 적이 2초 동안 화상으로 공격력의 40% 피해를 더 받아요' },
  dagger:        { name: '파상풍',        fx: 'slow',    v: 1,   desc: '맞은 적이 1.5초 동안 느려져요' },
  umbrella:      { name: '빗물 방패',     fx: 'shield',  v: .12, desc: '8초마다 최대 체력 12%만큼 보호막이 생겨요' },
  brick:         { name: '공사장 정신',   fx: 'stun',    v: .15, desc: '15% 확률로 맞은 적을 0.6초 기절시켜요' },
  club:          { name: '녹슨 못',       fx: 'burn',    v: .5,  desc: '맞은 적이 2초 동안 공격력의 50% 피해를 더 받아요' },
  sling:         { name: '연발 새총',     fx: 'multi',   v: 1,   desc: '돌멩이를 하나 더 쏴요' },
  pipe:          { name: '두 겹 테이프',  fx: 'shield',  v: .15, desc: '8초마다 최대 체력 15%만큼 보호막이 생겨요' },
  frypan:        { name: '프라이팬 반사', fx: 'thorns',  v: .3,  desc: '받은 피해의 30%를 때린 상대에게 돌려줘요' },
  kunai:         { name: '그림자 걸음',   fx: 'swift',   v: .15, desc: '이동 속도가 15% 빨라져요' },
  longsword:     { name: '기사의 맹세',   fx: 'power',   v: .2,  desc: '공격력이 20% 올라가요' },
  axe:           { name: '룬 각인',       fx: 'leech',   v: .12, desc: '준 피해의 12%만큼 체력을 회복해요' },
  spear:         { name: '근위대 돌격',   fx: 'reach',   v: .2,  desc: '공격 범위가 20% 넓어져요' },
  chakram:       { name: '절대 영도',     fx: 'stun',    v: .12, desc: '12% 확률로 맞은 적을 얼려서 0.6초 기절시켜요' },
  solaris:       { name: '정오의 태양',   fx: 'burn',    v: .6,  desc: '맞은 적이 2초 동안 공격력의 60% 피해를 더 받아요' },
  dragonstaff:   { name: '용의 숨결',     fx: 'reach',   v: .3,  desc: '폭발 범위가 30% 넓어져요' },
  thunder:       { name: '뇌신의 분노',   fx: 'multi',   v: 1,   desc: '번개가 하나 더 떨어져요' },
  frostbow:      { name: '빙결 화살',     fx: 'stun',    v: .15, desc: '15% 확률로 맞은 적을 0.6초 얼려요' },
  cosmic:        { name: '빅뱅',          fx: 'power',   v: .25, desc: '공격력이 25% 올라가요' },
  voidreaper:    { name: '영혼 수확',     fx: 'leech',   v: .15, desc: '준 피해의 15%만큼 체력을 회복해요' },
  blackhole:     { name: '중력 붕괴',     fx: 'reach',   v: .3,  desc: '블랙홀이 30% 커져요' },
  tidetrident:   { name: '소용돌이',      fx: 'slow',    v: 1,   desc: '맞은 적이 1.5초 동안 크게 느려져요' },
  phoenixbow:    { name: '불사조의 깃털', fx: 'burn',    v: .6,  desc: '맞은 적이 2초 동안 공격력의 60% 화상 피해를 더 받아요' },
  stormblade:    { name: '질풍',          fx: 'quick',   v: .2,  desc: '공격 속도가 20% 빨라져요' },
  moonsickle:    { name: '월식',          fx: 'leech',   v: .15, desc: '준 피해의 15%만큼 체력을 회복해요' },
  glacierhammer: { name: '영구 동토',     fx: 'stun',    v: .2,  desc: '20% 확률로 맞은 적을 0.6초 얼려요' },
  serpentwhip:   { name: '맹독',          fx: 'burn',    v: .8,  desc: '맞은 적이 2초 동안 공격력의 80% 독 피해를 더 받아요' },
  starshuriken:  { name: '유성우',        fx: 'multi',   v: 1,   desc: '수리검을 하나 더 던져요' },
  runeorb:       { name: '룬 확장',       fx: 'reach',   v: .25, desc: '구슬이 도는 범위가 25% 넓어져요' },
  thornshield:   { name: '가시 갑옷',     fx: 'thorns',  v: .5,  desc: '받은 피해의 50%를 때린 상대에게 돌려줘요' },
  meteorstaff:   { name: '대운석',        fx: 'power',   v: .25, desc: '공격력이 25% 올라가요' },
  windfan:       { name: '순풍',          fx: 'swift',   v: .2,  desc: '이동 속도가 20% 빨라져요' },
  crimsonkatana: { name: '일섬',          fx: 'crit',    v: .2,  desc: '치명타 확률이 20% 올라가요' },
  earthgauntlet: { name: '바위 피부',     fx: 'shield',  v: .2,  desc: '8초마다 최대 체력 20%만큼 보호막이 생겨요' },
  spiritlantern: { name: '혼령의 위로',   fx: 'regen',   v: 3,   desc: '1초마다 체력을 3 회복해요' },
  sunspear:      { name: '처형의 빛',     fx: 'execute', v: .5,  desc: '체력이 40% 아래인 적에게 피해 50% 추가' },
  galaxybow:     { name: '은하수',        fx: 'multi',   v: 2,   desc: '화살을 두 개 더 쏴요' },
  chronoblade:   { name: '시간 정지',     fx: 'stun',    v: .2,  desc: '20% 확률로 맞은 적의 시간을 0.6초 멈춰요' },
  nebulastaff:   { name: '성운 확장',     fx: 'reach',   v: .35, desc: '성운이 35% 커져요' },
  supernova:     { name: '극대 폭발',     fx: 'power',   v: .3,  desc: '공격력이 30% 올라가요' },
  abysstrident:  { name: '심연의 갈증',   fx: 'leech',   v: .2,  desc: '준 피해의 20%만큼 체력을 회복해요' },
  zeusspear:     { name: '연쇄 낙뢰',     fx: 'multi',   v: 2,   desc: '벼락이 두 개 더 떨어져요' },
  dragonfang:    { name: '용염',          fx: 'burn',    v: 1,   desc: '맞은 적이 2초 동안 공격력만큼 불 피해를 더 받아요' },
  angelwing:     { name: '축복',          fx: 'regen',   v: 5,   desc: '1초마다 체력을 5 회복해요' },
  demonaxe:      { name: '마왕의 처형',   fx: 'execute', v: .8,  desc: '체력이 40% 아래인 적에게 피해 80% 추가' },
  prismcannon:   { name: '굴절',          fx: 'crit',    v: .25, desc: '치명타 확률이 25% 올라가요' },
  worldtree:     { name: '생명의 껍질',   fx: 'shield',  v: .25, desc: '8초마다 최대 체력 25%만큼 보호막이 생겨요' },
  eclipse:       { name: '개기 일식',     fx: 'thorns',  v: .6,  desc: '받은 피해의 60%를 때린 상대에게 돌려줘요' },
  quasarhammer:  { name: '광속',          fx: 'quick',   v: .25, desc: '공격 속도가 25% 빨라져요' },
  phantomdagger: { name: '환영 분신',     fx: 'swift',   v: .25, desc: '이동 속도가 25% 빨라져요' },
  genesis:       { name: '창세',          fx: 'regen',   v: 6,   desc: '1초마다 체력을 6 회복해요' },
  bluewave:      { name: '밀물',          fx: 'slow',    v: 1,   desc: '맞은 적이 1.5초 동안 느려져요' },
  seadragon:     { name: '청룡의 포효',   fx: 'stun',    v: .18, desc: '18% 확률로 맞은 적을 0.6초 기절시켜요' },
  aquacalibur:   { name: '호수의 축복',   fx: 'leech',   v: .2,  desc: '준 피해의 20%만큼 체력을 회복해요' },
  royalguard:    { name: '근위대의 방패', fx: 'shield',  v: .15, desc: '8초마다 최대 체력 15%만큼 보호막이 생겨요' },
  crownrapier:   { name: '왕관의 일격',   fx: 'crit',    v: .25, desc: '치명타 확률이 25% 올라가요' },
  emperorblade:  { name: '제국의 위엄',   fx: 'power',   v: .3,  desc: '공격력이 30% 올라가요' },
  goldscimitar:  { name: '사막의 바람',   fx: 'quick',   v: .2,  desc: '공격 속도가 20% 빨라져요' },
  midas:         { name: '황금의 손',     fx: 'execute', v: .6,  desc: '체력이 40% 아래인 적에게 피해 60% 추가' },
  eldorado:      { name: '황금 비',       fx: 'multi',   v: 2,   desc: '날아가는 칼이 두 자루 더 생겨요' },
  meteorsword:   { name: '불타는 운석',   fx: 'burn',    v: .6,  desc: '맞은 적이 2초 동안 공격력의 60% 불 피해를 더 받아요' },
  aurorablade:   { name: '극광',          fx: 'regen',   v: 4,   desc: '1초마다 체력을 4 회복해요' },
  infinity:      { name: '무한 확장',     fx: 'reach',   v: .3,  desc: '칼이 도는 범위가 30% 넓어져요' },
};
// 이 무기의 갤럭시 파워를 착용 중이면 돌려준다
export const galaxyOn = id => GALAXY[id] && state.galaxy?.[id] && !state.gpOff?.[id] ? GALAXY[id] : null;
// 상태: none(없음) locked(전투 레벨 부족) buy(해금 가능) off(해금했지만 벗음) on(착용 중)
export function galaxyState(w) {
  if (!GALAXY[w.id] || !state.inv[w.id]) return 'none';
  if (state.galaxy?.[w.id]) return state.gpOff?.[w.id] ? 'off' : 'on';
  return armLevel(w.id) >= GALAXY_LV ? 'buy' : 'locked';
}
// 해금하면 바로 착용된다
export function unlockGalaxy(w) {
  const cost = galaxyCost(w.r);
  if (galaxyState(w) !== 'buy' || state.shards < cost) return false;
  state.shards -= cost;
  state.galaxy = { ...state.galaxy, [w.id]: true };
  state.gpOff = { ...state.gpOff, [w.id]: false };
  return true;
}
export function toggleGalaxy(w) {
  const s = galaxyState(w); if (s !== 'on' && s !== 'off') return false;
  state.gpOff = { ...state.gpOff, [w.id]: s === 'on' };
  return true;
}

// 일반 적. from: 처음 나오는 웨이브, w: 나올 확률 가중치, drop: 조각을 떨어뜨릴 확률
export const ENEMIES = {
  slime:    { name: '슬라임',     hp: 14,  spd: 60,  dmg: 5,  r: 13, col: '#4fd18b', from: 1, w: 10, drop: .16 },
  bat:      { name: '박쥐',       hp: 8,   spd: 112, dmg: 3,  r: 10, col: '#b45cff', from: 1, w: 6,  drop: .12, zig: true },
  skeleton: { name: '해골',       hp: 30,  spd: 68,  dmg: 9,  r: 14, col: '#e9e4d4', from: 2, w: 6,  drop: .2 },
  ghost:    { name: '유령',       hp: 24,  spd: 78,  dmg: 8,  r: 14, col: '#bfe7ff', from: 3, w: 4,  drop: .2, wobble: true },
  archer:   { name: '고블린 궁수', hp: 22,  spd: 62,  dmg: 7,  r: 13, col: '#9bd14f', from: 3, w: 3,  drop: .22, ranged: true },
  bomber:   { name: '폭탄벌레',   hp: 16,  spd: 96,  dmg: 22, r: 12, col: '#3a3a48', from: 4, w: 3,  drop: .18, bomb: true },
  golem:    { name: '골렘',       hp: 140, spd: 36,  dmg: 16, r: 24, col: '#8a9aa0', from: 4, w: 2,  drop: .5,  heavy: true },
};

// 보스: 웨이브마다 순서대로 나오고, 5웨이브가 지나면 더 강해져서 다시 나온다
// 패턴: jump(점프 착지) dash(돌진) ring(원형 탄막) spread(부채꼴 탄막) summon(부하 소환) slam(땅 내려찍기)
export const BOSSES = [
  { name: '킹 슬라임',   look: 'slime',    col: '#4fd18b', hp: 300,  r: 46, spd: 48, dmg: 18, pats: ['jump', 'summon'] },
  { name: '해골 기사',   look: 'skeleton', col: '#e9e4d4', hp: 550,  r: 40, spd: 60, dmg: 20, pats: ['dash', 'spread'] },
  { name: '유령 여왕',   look: 'ghost',    col: '#bfe7ff', hp: 800, r: 42, spd: 55, dmg: 20, pats: ['ring', 'summon', 'spread'] },
  { name: '바위 골렘 왕', look: 'golem',    col: '#8a9aa0', hp: 1150, r: 56, spd: 38, dmg: 26, pats: ['slam', 'dash'] },
  { name: '화염 드래곤', look: 'dragon',   col: '#ff6a3d', hp: 1600, r: 52, spd: 58, dmg: 26, pats: ['spread', 'ring', 'dash'] },
];
export function bossFor(wave) {
  const b = BOSSES[(wave - 1) % BOSSES.length], round = Math.floor((wave - 1) / BOSSES.length);
  const k = (1 + round * 1.6) * (1 + (wave - 1) * .12);
  return { ...b, hp: Math.round(b.hp * k), dmg: Math.round(b.dmg * (1 + round * .5)), round };
}
export const waveHp = wave => 1 + .35 * (wave - 1);
export const waveDmg = wave => 1 + .12 * (wave - 1);

// 웨이브를 버티면 셋 중 하나를 고르는 효과
export const PERKS = [
  { id: 'atk',    ic: '⚔', name: '날카로운 칼날', desc: '공격력 +20%',            max: 8 },
  { id: 'haste',  ic: '↯', name: '빠른 손놀림',   desc: '공격 속도 +15%',         max: 6 },
  { id: 'speed',  ic: '»', name: '가벼운 신발',   desc: '이동 속도 +12%',         max: 5 },
  { id: 'hp',     ic: '♥', name: '튼튼한 몸',     desc: '최대 체력 +25, 체력 25 회복', max: 8 },
  { id: 'proj',   ic: '✦', name: '분신술',        desc: '던지기·궤도·번개 개수 +1', max: 4 },
  { id: 'area',   ic: '◎', name: '넓은 휘두르기', desc: '공격 범위 +15%',         max: 5 },
  { id: 'crit',   ic: '!', name: '급소 찌르기',   desc: '치명타 확률 +10% (피해 2배)', max: 5 },
  { id: 'armor',  ic: '▣', name: '두꺼운 갑옷',   desc: '받는 피해 -2',            max: 5 },
  { id: 'regen',  ic: '+', name: '재생',          desc: '1초마다 체력 1 회복',      max: 5 },
  { id: 'magnet', ic: '∪', name: '자석',          desc: '아이템 끌어오는 범위 +50%', max: 3 },
  { id: 'greed',  ic: '◆', name: '조각 사냥꾼',   desc: '조각 획득 +25%',          max: 4 },
  { id: 'heal',   ic: '✚', name: '응급 처치',     desc: '체력을 모두 회복',         max: 99 },
];
