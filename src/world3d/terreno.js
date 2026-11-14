// Relieve de la meseta NE Syrtis, en el borde de la cuenca Isidis (procedural).
// Compartido por el mundo y la caminata.
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

// Mesas: colinas de cima plana, típicas del terreno en capas de NE Syrtis. [x, z, radio, alto]
const MESAS = [[-72, -42, 14, 9], [-40, -84, 18, 12], [-98, 12, 12, 7], [18, -98, 16, 10],
  [-30, 96, 13, 8], [-112, -70, 20, 14], [-70, 70, 12, 7]];

export function altura(x, z) {
  const r = Math.hypot(x, z);
  const plano = THREE.MathUtils.smoothstep(r, 22, 36);
  let h = (fbm(x * 0.05, z * 0.05) - 0.5) * 5 * plano + fbm(x * 0.3, z * 0.3) * 0.25;
  for (const [mx, mz, R, H] of MESAS) {
    const d = Math.hypot(x - mx, z - mz);
    h += H * (1 - THREE.MathUtils.smoothstep(d, R, R + 5)) * (0.92 + 0.16 * fbm(x * 0.1, z * 0.1));
  }
  // Borde de la cuenca Isidis: hacia el este el terreno baja a la llanura (Isidis Planitia)
  h -= THREE.MathUtils.smoothstep(x + z * 0.3, 55, 120) * 10;
  return h;
}

// Altura donde se paran los personajes (la plataforma de la base es plana)
export const alturaSuelo = (x, z) => Math.hypot(x, z) < RADIO_PLATAFORMA ? 0.18 : altura(x, z);
