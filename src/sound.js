import { $ } from './dom.js';

/* =========================================================
   사운드 (WebAudio 신스)
   ========================================================= */
export let AC = null, muted = localStorage.getItem('engpit_mute') === '1';
export function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
export function tone(f, d = .15, type = 'sine', v = .12, delay = 0, f2 = null) {
  if (muted) return; const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + .03);
}
export const SFX = {
  tick: () => tone(1400, .035, 'square', .035),
  thud: () => tone(170, .2, 'sine', .3, 0, 55),
  pop: () => tone(300, .12, 'square', .08, 0, 900),
  coin: () => { tone(988, .08, 'square', .06); tone(1319, .3, 'square', .06, .08); },
  wrong: () => tone(190, .35, 'sawtooth', .08, 0, 100),
  up: k => { tone(500 + k * 250, .35, 'triangle', .14, 0, 1200 + k * 300); tone(1600, .2, 'sine', .06, .1); },
  charge: d => tone(200, d, 'sawtooth', .03, 0, 1400),
  fanfare(rank) {
    if (rank === 0) { [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? .6 : .25, 'sawtooth', .07, i * .22)); return; }
    const sets = [, [523, 659], [523, 659, 784], [523, 659, 784, 1047], [523, 659, 784, 1047, 1319, 1568, 2093]];
    const s = sets[rank]; s.forEach((f, i) => tone(f, i === s.length - 1 ? .9 : .3, 'triangle', .13, i * .09));
    if (rank >= 3) s.forEach((f, i) => tone(f / 2, .9, 'square', .03, i * .09));
  },
};
$('muteBtn').classList.toggle('muted', muted);
$('muteBtn').onclick = () => { muted = !muted; localStorage.setItem('engpit_mute', muted ? '1' : '0'); $('muteBtn').classList.toggle('muted', muted); };
