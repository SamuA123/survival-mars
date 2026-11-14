// =====================================================================
//  DIFICULTAD — ajusta MISION y los tiempos de las emergencias al empezar.
//  Cadete (7-9 años): misión corta, más tiempo para decidir, sin conjunción.
//  Comandante (10-12 años): la misión completa.
//  Se aplica ANTES de crearPartida() (la elige el jugador en la pantalla de inicio).
// =====================================================================
import { MISION } from './config.js';
import { EVENTOS } from './motor.js';

export const DIFICULTADES = {
  cadete: {
    nombre: 'Cadete', icono: '🧒', edad: '7 a 9 años',
    resumen: '10 sols · 15 segundos para decidir · sin apagón de comunicaciones',
    tiempoEmergencia: 15,
    mision: {
      maxSol: 10, bateriaInicial: 30, metaCiencia: 25, conjuncion: [],
      guion: { 2: 'llamarada', 4: 'reciclador', 6: 'tormenta', 9: 'remolino' },
      avisos: {
        1: ['¡Bienvenida, tripulación de cadetes! Cada mensaje tarda unos 12 minutos en llegar. En una emergencia, ustedes deciden.',
            'Misión científica: exploren y hagan experimentos, pero sin arriesgar a la tripulación.'],
        4: ['⚠️ El satélite MRO ve una gran tormenta de polvo. Llegará en 2 sols y durará 3. ¡Carguen las baterías!'],
        5: ['La tormenta llega mañana. Ahorren energía.'],
        9: ['La nave de relevo ya está en órbita. ¡Aguanten un sol más!'],
      },
    },
    eva: { o2TrajePorSeg: 0.9 },   // el traje dura ~110 s
  },
  comandante: {
    nombre: 'Comandante', icono: '🧑‍🚀', edad: '10 a 12 años',
    resumen: '15 sols · 10 segundos para decidir · conjunción solar',
    tiempoEmergencia: 10,
    mision: {}, eva: {},
  },
};

// Guardar los valores originales una sola vez para poder volver a ellos
const BASE = {
  mision: Object.fromEntries(['maxSol', 'bateriaInicial', 'metaCiencia', 'conjuncion', 'guion', 'avisos'].map(k => [k, MISION[k]])),
  eva: { o2TrajePorSeg: MISION.eva.o2TrajePorSeg },
  tiempos: Object.fromEntries(Object.entries(EVENTOS).map(([id, ev]) => [id, ev.tiempo])),
};

export let dificultadActual = 'comandante';

export function aplicarDificultad(id) {
  const D = DIFICULTADES[id] || DIFICULTADES.comandante;
  dificultadActual = DIFICULTADES[id] ? id : 'comandante';
  Object.assign(MISION, BASE.mision, D.mision);
  Object.assign(MISION.eva, BASE.eva, D.eva);
  for (const [evId, t] of Object.entries(BASE.tiempos)) {
    EVENTOS[evId].tiempo = t ? D.tiempoEmergencia : 0;   // los eventos sin prisa siguen sin prisa
  }
  return D;
}
