/* =========================================================
   이펙트 스프라이트 시트 (Lectio Drop, 파일은 public/assets/images)
   - 시트는 프레임이 가로 한 줄로 이어져 있다. fw·fh: 프레임 크기, n: 프레임 수
   - pixel: 픽셀 아트라서 확대할 때 흐려지지 않게 최근접(nearest)으로 그린다
   - 출처 표기가 필요한 에셋은 CREDITS.md에 적어 둠 (lightningCartoon: CC-BY 3.0)
   ========================================================= */
export const FX = {
  lightning:        { file: 'lightning-strike_strike.png',         fw: 64,  fh: 128, n: 10, fps: 10, loop: true,  pixel: true },  // 번개
  darkBolt:         { file: 'dark-bolt_strike.png',                fw: 64,  fh: 88,  n: 11, fps: 10, loop: true,  pixel: true },  // 어둠의 화살
  leafPoof:         { file: 'leaf-poof_explode.png',               fw: 30,  fh: 32,  n: 6,  fps: 18, loop: false, pixel: true },  // 나뭇잎 펑
  lightningCartoon: { file: 'lightning-strike-cartoon_strike.png', fw: 159, fh: 220, n: 8,  fps: 10, loop: true,  pixel: false }, // 번개 내리치기
  explosionPop:     { file: 'explosion-pop_explode.png',           fw: 48,  fh: 48,  n: 8,  fps: 18, loop: false, pixel: true },  // 펑 터짐
  arcaneBurst:      { file: 'arcane-lightning-burst_explode.png',  fw: 124, fh: 108, n: 7,  fps: 18, loop: false, pixel: false }, // 보라 번개 폭발
};

// 미리 불러 두기 (배포판은 경로 앞에 /engpit/ 가 붙으므로 BASE_URL을 쓴다)
for (const f of Object.values(FX)) {
  f.img = new Image();
  f.img.src = `${import.meta.env.BASE_URL}assets/images/${f.file}`;
}

// 이펙트가 시작된 지 t초 뒤의 프레임 번호. 한 번만 도는 이펙트는 끝나면 -1
export function fxFrame(key, t) {
  const f = FX[key], i = Math.floor(t * f.fps);
  return f.loop ? i % f.n : i < f.n ? i : -1;
}
export const fxDone = (key, t) => fxFrame(key, t) < 0;

// (x, y)를 가운데로 해서 t초째 프레임을 그린다. scale: 확대 배율
export function drawFx(ctx, key, t, x, y, scale = 1) {
  const f = FX[key], i = fxFrame(key, t);
  if (i < 0 || !f.img.complete || !f.img.naturalWidth) return;
  const w = f.fw * scale, h = f.fh * scale, smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = !f.pixel;
  ctx.drawImage(f.img, i * f.fw, 0, f.fw, f.fh, x - w / 2, y - h / 2, w, h);
  ctx.imageSmoothingEnabled = smooth;
}
