import { state, save } from './state.js';
import { FREE } from './config.js';
import { tone, SFX } from './sound.js';
import { SHOP_TITLES } from './titles.js';
import { scene, floor } from './three/scene.js';

/* =========================================================
   코인 상점: 코인으로 꾸미기 아이템을 산다 (ui/store.js가 화면)
   - skin: 전투 캐릭터 색과 장식      - theme: 전투 바닥 + 뽑기 화면 배경색
   - sfx: 단어 테스트 정답/오답 소리   - title: 대표 칭호로 달 수 있는 칭호 (titles.js의 SHOP_TITLES)
   - 가격이 0인 기본 아이템은 처음부터 가지고 있다
   ========================================================= */
const TAU = Math.PI * 2;

// top: 캡슐 윗부분, band: 가운데 띠, body: 아랫부분, deco: 장식
export const SKINS = [
  { id: 'basic',   name: '기본 캡슐',   price: 0,   top: '#e8364f', band: '#b8203a', body: '#f3efe6', desc: '처음부터 함께한 빨간 캡슐' },
  { id: 'ocean',   name: '바다 캡슐',   price: 30,  top: '#4aa3ff', band: '#2a6fc0', body: '#f3efe6', desc: '시원한 파란색' },
  { id: 'forest',  name: '숲 캡슐',     price: 30,  top: '#4fd18b', band: '#2a9a5c', body: '#f3efe6', desc: '싱그러운 초록색' },
  { id: 'cool',    name: '선글라스',    price: 80,  top: '#ff8a3d', band: '#c45a10', body: '#f3efe6', deco: 'shades', desc: '눈부신 전장도 문제없어' },
  { id: 'ninja',   name: '닌자',        price: 120, top: '#2a2d36', band: '#e8364f', body: '#3a3e4a', eye: '#f3efe6', deco: 'tails', desc: '바람에 날리는 머리띠' },
  { id: 'gold',    name: '황금 캡슐',   price: 200, top: '#ffc83d', band: '#d99a10', body: '#fff3c4', deco: 'shine', desc: '반짝반짝 빛나는 황금' },
  { id: 'king',    name: '임금님',      price: 300, top: '#b45cff', band: '#ffc83d', body: '#f3efe6', deco: 'crown', desc: '금관을 쓴 캡슐' },
  { id: 'angel',   name: '천사',        price: 400, top: '#ffffff', band: '#ffe9a8', body: '#fff7e6', deco: 'halo', desc: '머리 위에 빛나는 고리' },
  { id: 'rainbow', name: '무지개',      price: 600, top: 'rainbow', band: '#ffffff', body: '#f3efe6', deco: 'shine', desc: '색이 계속 바뀌는 전설의 캡슐' },
];

// a·b: 바닥 바둑판 두 색, spot·grass·spark: 바닥 장식, scene·floor: 뽑기 화면 배경과 바닥
export const THEMES = [
  { id: 'basic',  name: '청록 들판', price: 0,   a: '#0c3337', b: '#0b2f33', spot: '#134a50', grass: '#1d6458', spark: '#ffc83d33', scene: 0x0b2f33, floor: 0x103c41, desc: '기본 배경' },
  { id: 'desert', name: '사막',      price: 50,  a: '#c9a46a', b: '#c29c60', spot: '#a8844f', grass: '#7f8f4a', spark: '#fff2c055', scene: 0x3a2a18, floor: 0x6b5230, desc: '뜨거운 모래 언덕' },
  { id: 'snow',   name: '설원',      price: 80,  a: '#dfe9f1', b: '#d5e1ec', spot: '#b9cad8', grass: '#9fb7c9', spark: '#ffffff88', scene: 0x1d2b3a, floor: 0x8ea4b8, desc: '하얀 눈밭' },
  { id: 'sakura', name: '벚꽃길',    price: 120, a: '#f6d6de', b: '#f1ccd6', spot: '#e8a9ba', grass: '#7fae6a', spark: '#ff7fa566', scene: 0x3a1f2a, floor: 0x7a4a5a, desc: '꽃잎이 흩날리는 길' },
  { id: 'lava',   name: '용암 지대', price: 180, a: '#2a1414', b: '#241010', spot: '#5a1a10', grass: '#ff5a1f', spark: '#ffb02066', scene: 0x1a0806, floor: 0x2a100c, desc: '발밑이 뜨거워요' },
  { id: 'space',  name: '우주',      price: 250, a: '#0b0b1e', b: '#0e0e24', spot: '#25255a', grass: '#5c4bd1', spark: '#ffffff66', scene: 0x05051a, floor: 0x12123a, desc: '별이 반짝이는 우주 공간' },
];

// ok: 정답 소리, no: 오답 소리 (기본은 코인 소리와 원래 오답 소리)
export const SOUNDS = [
  { id: 'basic', name: '기본',     price: 0,  desc: '코인 소리와 낮은 부저',
    ok: () => SFX.coin(), no: () => SFX.wrong() },
  { id: 'retro', name: '8비트',    price: 20, desc: '옛날 게임기 소리',
    ok: () => [660, 880, 1320].forEach((f, i) => tone(f, .08, 'square', .06, i * .06)),
    no: () => { tone(300, .12, 'square', .07); tone(150, .25, 'square', .07, .12); } },
  { id: 'xylo',  name: '실로폰',   price: 30, desc: '맑고 통통 튀는 소리',
    ok: () => [1047, 1319, 1568].forEach((f, i) => tone(f, .35, 'triangle', .12, i * .07)),
    no: () => { tone(392, .3, 'triangle', .12); tone(330, .4, 'triangle', .12, .15); } },
  { id: 'meow',  name: '야옹',     price: 40, desc: '고양이처럼 야옹',
    ok: () => { tone(600, .15, 'sine', .12, 0, 1100); tone(1100, .25, 'sine', .1, .15, 700); },
    no: () => tone(520, .45, 'sine', .1, 0, 240) },
  { id: 'laser', name: '레이저',   price: 50, desc: '우주 전투 효과음',
    ok: () => { tone(400, .18, 'sawtooth', .05, 0, 2000); tone(800, .18, 'sawtooth', .04, .1, 2400); },
    no: () => tone(800, .45, 'sawtooth', .06, 0, 80) },
  { id: 'fanfare', name: '팡파레', price: 80, desc: '정답마다 축하 나팔, 틀리면 뿌우우',
    ok: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? .5 : .14, 'triangle', .12, i * .08)),
    no: () => [311, 294, 277, 262].forEach((f, i) => tone(f, i === 3 ? .6 : .25, 'sawtooth', .06, i * .22)) },
];

export const CATS = [
  { key: 'skin',  name: '캐릭터 스킨', list: SKINS },
  { key: 'theme', name: '배경 테마',   list: THEMES },
  { key: 'sfx',   name: '효과음',      list: SOUNDS },
  { key: 'title', name: '칭호',        list: SHOP_TITLES },
];
const byId = (list, id) => list.find(x => x.id === id) || list[0];
export const curSkin = () => byId(SKINS, state.skin);
export const curTheme = () => byId(THEMES, state.theme);
export const curSound = () => byId(SOUNDS, state.sfx);

// 가진 것 / 쓰는 중
export const owns = (cat, it) => !it.price || (cat === 'title' ? !!state.titles?.[it.id] : !!state.shop?.[cat + ':' + it.id]);
const CUR = { skin: curSkin, theme: curTheme, sfx: curSound };
export const using = (cat, it) => cat === 'title' ? state.title === it.id : CUR[cat]().id === it.id;
export const canBuy = it => FREE || state.coins >= it.price;

// 사면 바로 쓴다. 성공하면 true
export function buy(cat, it) {
  if (owns(cat, it) || !canBuy(it)) return false;
  if (!FREE) state.coins -= it.price;
  if (cat === 'title') state.titles = { ...state.titles, [it.id]: true };
  else state.shop = { ...state.shop, [cat + ':' + it.id]: true };
  use(cat, it);
  return true;
}
export function use(cat, it) {
  if (!owns(cat, it)) return;
  if (cat === 'skin') state.skin = it.id;
  else if (cat === 'theme') { state.theme = it.id; applyTheme(); }
  else if (cat === 'sfx') state.sfx = it.id;
  else state.title = it.id;
  save();
}

// 단어 테스트 정답/오답 소리
export const quizSound = ok => (ok ? curSound().ok : curSound().no)();

// 뽑기 화면 배경색과 바닥색
export function applyTheme() {
  const th = curTheme();
  scene.background.setHex(th.scene); scene.fog.color.setHex(th.scene);
  floor.material.color.setHex(th.floor);
}

// 캐릭터 그리기 (전투와 상점 미리보기가 같이 씀). c의 원점이 캐릭터 가운데
export function paintHero(c, r, sk, { ox = 0, oy = 0, hurt = false, t = performance.now() / 1000 } = {}) {
  const circ = (x, y, rr, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); };
  if (sk.deco === 'halo') {
    c.strokeStyle = '#ffe36b'; c.lineWidth = 2.5; c.shadowColor = '#ffe36b'; c.shadowBlur = 8;
    c.beginPath(); c.ellipse(0, -r - 6 + Math.sin(t * 3), r * .65, r * .2, 0, 0, TAU); c.stroke(); c.shadowBlur = 0;
  }
  c.save(); c.rotate(-.42);
  circ(0, 0, r, hurt ? '#ffb3b3' : sk.body);
  c.fillStyle = sk.top === 'rainbow' ? `hsl(${(t * 90) % 360},90%,60%)` : sk.top;
  c.beginPath(); c.arc(0, 0, r, Math.PI, 0); c.closePath(); c.fill();
  c.fillStyle = sk.band; c.fillRect(-r, -1, r * 2, 3);
  if (sk.deco === 'tails') { // 머리띠 끈이 뒤로 날림
    c.strokeStyle = sk.band; c.lineWidth = 2.5; c.lineCap = 'round';
    const w = Math.sin(t * 8) * 2;
    c.beginPath(); c.moveTo(-r + 1, 0); c.quadraticCurveTo(-r - 6, -3 + w, -r - 12, 2 + w); c.stroke();
    c.beginPath(); c.moveTo(-r + 1, 1); c.quadraticCurveTo(-r - 5, 4 - w, -r - 10, 8 - w); c.stroke();
  }
  if (sk.deco === 'crown') {
    c.fillStyle = '#ffc83d'; c.strokeStyle = '#b8860b'; c.lineWidth = 1;
    const y = -r + 2, w = r * .75;
    c.beginPath(); c.moveTo(-w, y); c.lineTo(-w, y - 9); c.lineTo(-w / 2, y - 4); c.lineTo(0, y - 12); c.lineTo(w / 2, y - 4); c.lineTo(w, y - 9); c.lineTo(w, y); c.closePath(); c.fill(); c.stroke();
    circ(0, y - 12, 1.8, '#ff3d8b');
  }
  c.restore();
  circ(-4 + ox, 5 + oy, 2.2, sk.eye || '#14161c'); circ(4 + ox, 5 + oy, 2.2, sk.eye || '#14161c');
  if (sk.deco === 'shades') {
    c.fillStyle = '#14161c';
    c.beginPath(); c.roundRect(-8 + ox, 2 + oy, 7, 5, 2); c.roundRect(1 + ox, 2 + oy, 7, 5, 2); c.fill();
    c.fillRect(-1.5 + ox, 3 + oy, 3, 1.2);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-7 + ox, 3 + oy, 2, 1.2); c.fillRect(2 + ox, 3 + oy, 2, 1.2);
  }
  if (sk.deco === 'shine') { // 둘레를 도는 반짝이
    for (let i = 0; i < 2; i++) {
      const a = t * 2 + i * Math.PI, x = Math.cos(a) * (r + 6), y = Math.sin(a) * (r + 6) * .6 - 2, s = 3 + Math.sin(t * 6 + i) * 1.2;
      c.fillStyle = '#fff6c4';
      c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .35, y); c.lineTo(x, y + s); c.lineTo(x - s * .35, y); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x - s, y); c.lineTo(x, y + s * .35); c.lineTo(x + s, y); c.lineTo(x, y - s * .35); c.closePath(); c.fill();
    }
  }
}
