/* =========================================================
   전투 데이터: 무기 공격 방식, 적, 보스, 웨이브 효과
   ========================================================= */
export const MAX_EQUIP = 3;      // 전투에 들고 갈 수 있는 무기 수
export const WAVE_LEN = 40;      // 웨이브마다 보스가 나오기까지 버티는 시간(초)

// 같은 무기를 여러 개 가질수록 전투 레벨이 올라간다 (분해하면 내려감)
export const armLevel = n => Math.max(1, Math.min(n || 1, 10));
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
};

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
