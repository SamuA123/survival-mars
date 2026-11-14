// Pitidos simples con WebAudio (sin archivos de audio).
let actx = null;
export const audio = { on: true };
export function beep(f = 660, d = 0.08, tipo = 'square') {
  if (!audio.on) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = tipo; o.frequency.value = f; g.gain.value = 0.05;
    o.connect(g); g.connect(actx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.stop(actx.currentTime + d + 0.02);
  } catch { /* sin audio */ }
}
