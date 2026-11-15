// Explicit presentation mode. It does not change the normal mission settings.
import { MISION } from './config.js';
import { EVENTOS } from './motor.js';

export const esDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';

export function aplicarDemo() {
  if (!esDemo) return;
  Object.assign(MISION, {
    maxSol: 3, bateriaInicial: 14, metaCiencia: 8, conjuncion: [], guionFijo: true,
    guion: { 2: 'llamarada', 3: 'tormenta' },
    avisos: {
      1: ['Misión científica: exploren y hagan experimentos, pero sin arriesgar a la tripulación.'],
      2: ['La tormenta llega mañana. Ahorren energía.'],
    },
  });
  EVENTOS.llamarada.tiempo = 30;
  EVENTOS.tormenta.tiempo = 30;
}
