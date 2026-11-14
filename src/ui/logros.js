// Insignias: se ganan jugando y se guardan entre partidas (rejugabilidad).
// Cada una premia una estrategia distinta, y perder también enseña.
import { MISION } from '../sim/config.js';

const CLAVE = 'survivalMars.logros';

const suma = (lista, f) => lista.reduce((a, x) => a + f(x), 0);
const reg = S => S.registro || { sols: [], decisiones: [], evas: [] };

export const LOGROS = [
  { id: 'cumplida', icono: '🏁', nombre: 'Misión cumplida', desc: `Sobrevive los ${MISION.maxSol} sols.`,
    ok: (S, fin) => fin.gano },
  { id: 'cientifico', icono: '🔬', nombre: 'Científica/o de Marte', desc: `Consigue ${MISION.metaCiencia} puntos de ciencia.`,
    ok: S => S.ciencia >= MISION.metaCiencia },
  { id: 'protegidos', icono: '🛡️', nombre: 'Tripulación protegida', desc: `Gana con menos de ${MISION.radLimite / 2} mSv de radiación.`,
    ok: (S, fin) => fin.gano && S.rad < MISION.radLimite / 2 },
  { id: 'blindaje', icono: '🧱', nombre: 'Escudo de regolito', desc: 'Completa el blindaje del hábitat (3/3).',
    ok: S => S.blindaje >= 3 },
  { id: 'tormenta', icono: '🌪️', nombre: 'Domador/a de tormentas', desc: 'Pasa la tormenta de polvo sin ningún apagón.',
    ok: S => { const t = reg(S).sols.filter(s => s.tormenta); return t.length >= 3 && t.every(s => !s.apagon); } },
  { id: 'sinApagon', icono: '🔋', nombre: 'Cero apagones', desc: 'Gana sin tener ni un solo apagón.',
    ok: (S, fin) => fin.gano && reg(S).sols.every(s => !s.apagon) },
  { id: 'reflejos', icono: '⚡', nombre: 'Reflejos de astronauta', desc: 'Decide una emergencia en 3 segundos o menos.',
    ok: S => reg(S).decisiones.some(d => !d.agotado && d.segundos != null && d.segundos <= 3) },
  { id: 'explorador', icono: '🧑‍🚀', nombre: 'Exploradora/or', desc: 'Haz 3 caminatas espaciales en una misión.',
    ok: S => reg(S).evas.filter(e => !e.rescate).length >= 3 },
  { id: 'porUnPelo', icono: '😅', nombre: 'Por un pelo', desc: 'Vuelve de una caminata con 10% de oxígeno o menos.',
    ok: S => reg(S).evas.some(e => !e.rescate && e.o2Final <= 10) },
  { id: 'aire', icono: '🧊', nombre: 'Fábrica de aire', desc: 'Recoge 5 bloques de hielo de agua en una misión.',
    ok: S => suma(reg(S).evas, e => e.items?.hielo || 0) >= 5 },
  { id: 'geologo', icono: '🪨', nombre: 'Geóloga/o', desc: 'Recoge 6 rocas marcianas en una misión.',
    ok: S => suma(reg(S).evas, e => e.items?.roca || 0) >= 6 },
  { id: 'paciencia', icono: '📡', nombre: 'Paciencia marciana', desc: 'Pide ayuda a la Tierra y descubre el retraso de la señal.',
    ok: S => !!reg(S).pidioAyuda },
  { id: 'curioso', icono: '💡', nombre: 'Mente curiosa', desc: 'Descubre 12 datos de "¿Sabías que…?".',
    ok: S => S.aprendidos.length >= 12 },
  { id: 'error', icono: '🎓', nombre: 'Aprender del error', desc: 'Pierde una misión. ¡Los astronautas también entrenan fallando!',
    ok: (S, fin) => !fin.gano },
];

export function logrosGuardados() {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE) || '[]')); } catch { return new Set(); }
}

// Revisa la partida terminada, guarda las insignias nuevas y las devuelve
export function evaluarLogros(S, fin) {
  const guardados = logrosGuardados();
  const nuevos = LOGROS.filter(l => !guardados.has(l.id) && safe(() => l.ok(S, fin))).map(l => l.id);
  nuevos.forEach(id => guardados.add(id));
  try { localStorage.setItem(CLAVE, JSON.stringify([...guardados])); } catch { /* sin almacenamiento */ }
  return nuevos;
}

function safe(f) { try { return !!f(); } catch { return false; } }

export function logrosHTML(nuevos = []) {
  const tengo = logrosGuardados();
  const lista = LOGROS.map(l => {
    const ok = tengo.has(l.id), nuevo = nuevos.includes(l.id);
    return `<div class="logro ${ok ? 'ok' : 'bloq'} ${nuevo ? 'nuevo' : ''}" title="${l.desc}">
      <span class="lg-ic">${ok ? l.icono : '🔒'}</span>
      <b>${l.nombre}</b><small>${l.desc}</small>${nuevo ? '<em>¡NUEVA!</em>' : ''}</div>`;
  }).join('');
  return `<h3>🏅 Insignias (${tengo.size}/${LOGROS.length})${nuevos.length ? ` · ¡${nuevos.length} nueva${nuevos.length > 1 ? 's' : ''}!` : ''}</h3>
    <div class="logros">${lista}</div>`;
}
