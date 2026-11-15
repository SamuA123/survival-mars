// =====================================================================
//  GUARDADO — la partida sobrevive a una recarga o a cerrar la pestaña.
//  Se guarda al empezar cada sol y al volver de una caminata (nunca a mitad
//  de una emergencia ni de una caminata). Solo en el navegador del jugador.
// =====================================================================
const CLAVE = 'survivalMars.partida';
const VERSION = 1;   // subirla si cambia la forma de S de manera incompatible

// Almacenamiento inyectable (para las pruebas en Node); por defecto, localStorage
let almacen = null;
const store = () => almacen ?? (typeof localStorage !== 'undefined' ? localStorage : null);
export function usarAlmacen(a) { almacen = a; }

export function guardarPartida(S, dificultad) {
  if (!S || S.demo || S.enEVA) return false;
  try {
    store()?.setItem(CLAVE, JSON.stringify({ v: VERSION, dificultad, fecha: Date.now(), S }));
    return true;
  } catch { return false; }   // sin almacenamiento o lleno: el juego sigue igual
}

// Devuelve { S, dificultad, fecha } o null si no hay partida válida
export function cargarPartida() {
  try {
    const crudo = store()?.getItem(CLAVE);
    if (!crudo) return null;
    const g = JSON.parse(crudo);
    const S = g?.S;
    if (g?.v !== VERSION || !S || typeof S.sol !== 'number' || !Array.isArray(S.tripulacion)) return null;
    S.enEVA = false;   // nunca se reanuda dentro de una caminata
    return { S, dificultad: g.dificultad, fecha: g.fecha };
  } catch { return null; }
}

export function borrarPartida() {
  try { store()?.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}
