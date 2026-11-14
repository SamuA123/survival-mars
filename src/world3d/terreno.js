// Relieve del cráter Jezero (procedural). Compartido por el mundo y la caminata.
import * as THREE from 'three';

export const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function ruido(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z) { let s = 0, a = 1, f = 1; for (let i = 0; i < 4; i++) { s += a * ruido(x * f, z * f); a *= 0.5; f *= 2; } return s / 1.875; }

export const RADIO_PLATAFORMA = 24.5;

export function altura(x, z) {
  const r = Math.hypot(x, z);
  const plano = THREE.MathUtils.smoothstep(r, 22, 36);
  let h = (fbm(x * 0.05, z * 0.05) - 0.5) * 5 * plano + fbm(x * 0.3, z * 0.3) * 0.25;
  h += Math.exp(-((r - 85) ** 2) / (2 * 13 ** 2)) * 16 * (0.6 + 0.8 * fbm(x * 0.03 + 5, z * 0.03));
  return h;
}

// Altura donde se paran los personajes (la plataforma de la base es plana)
export const alturaSuelo = (x, z) => Math.hypot(x, z) < RADIO_PLATAFORMA ? 0.18 : altura(x, z);
