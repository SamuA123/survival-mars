// Registro de la misión: qué pasó cada sol, cada decisión y cada caminata.
// Lo usan el informe final (gráficas) y las insignias. Lógica pura, sin DOM.
import { foto } from './motor.js';

export function iniciarRegistro(S) {
  S.registro = { inicio: foto(S), sols: [], decisiones: [], evas: [] };
}

// Una emergencia: cuánto tardó en decidir y si se le acabó el tiempo
export function registrarDecision(S, evento, segundos, agotado, opcion = null) {
  S.registro?.decisiones.push({ sol: S.sol, evento, segundos, agotado, opcion });
}

// Estado al final de cada sol (después de simular)
export function registrarSol(S, evento, enTormenta) {
  S.registro?.sols.push({ sol: S.sol, ...foto(S), evento, apagon: S.energiaOk === false, tormenta: enTormenta });
}

// Una caminata espacial
export function registrarEVA(S, res, o2PorSeg) {
  S.registro?.evas.push({
    sol: S.sol, segundos: res.segundos, rad: res.rad, rescate: res.rescate,
    o2Final: Math.max(0, Math.round(100 - o2PorSeg * res.segundos)),
    items: { ...res.items },
  });
}
