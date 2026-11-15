// =====================================================================
//  ☀️ ALERTA SOLAR (idea del grupo): estado del Sol siempre visible y vigilancia de NASA DONKI.
//  - Indicador: "☀️ Actividad solar normal · Riesgo BAJO" o "🚨 ALERTA SOLAR" si hubo llamaradas M/X
//    en los últimos 3 días (según los datos reales cargados).
//  - Cada 10 minutos consulta DONKI (sin caché). Si aparece una llamarada NUEVA: alerta en pantalla
//    y SUBE el riesgo del juego (CLIMA.riesgo → más llamaradas y más dosis en la caminata).
//  - Desacoplado del juego: si DONKI no responde, no pasa nada y se sigue jugando.
//  - ?alerta=1 dispara un SIMULACRO (para la demo), siempre identificado como simulacro.
//  Se inserta solo: basta con importarlo desde main.js.
// =====================================================================
import { CLIMA, setClima } from '../sim/motor.js';
import { consultarRecientes, riesgoDe, fuerza } from '../data/donki.js';
import { beep } from './sonido.js';
import { esEN, onIdioma } from './i18n.js';

const L = (es, en) => esEN() ? en : es;
let ultimaAlerta = null;           // { f, esSimulacro } para repintar al cambiar de idioma
const PARAMS = new URLSearchParams(location.search);
const DEMO = PARAMS.get('demo') === '1';
const CADA_MIN = 10;
const vistas = new Set();          // llamaradas ya conocidas (clase + fecha)
let simulacro = null;              // { clase } si se pidió ?alerta=1

const clave = f => `${f.clase}@${f.fecha}`;
const diasDesde = fecha => (Date.now() - Date.parse(fecha + 'T12:00:00Z')) / 864e5;
const recientesFuertes = () => (CLIMA.real ? (CLIMA.flares || []) : [])
  .filter(f => 'MX'.includes(f.clase[0]) && diasDesde(f.fecha) <= 3);

// ---------------------------------------------------------------- indicador
function nivelRiesgo() {
  const r = CLIMA.riesgo ?? 1;
  return r < 0.9 ? ['BAJO', 'LOW', 'bajo'] : r < 1.4 ? ['MEDIO', 'MEDIUM', 'medio'] : ['ALTO', 'HIGH', 'alto'];
}

function pintarIndicador() {
  // Un simulacro activo mantiene el riesgo alto aunque DONKI termine de cargar después
  if (simulacro?.activo && (CLIMA.riesgo ?? 0) < 1.5) setClima({ riesgo: 1.5 });
  let el = document.querySelector('#solEstado');
  if (!el) {
    el = document.createElement('button');
    el.id = 'solEstado'; el.type = 'button';
    el.addEventListener('click', () => document.querySelector('#btnDatos')?.click());   // abre "¿Qué es real?"
    document.body.appendChild(el);
  }
  const [es, en, cls] = nivelRiesgo();
  const fuertes = recientesFuertes();
  const alerta = simulacro || fuertes.length > 0;
  const fuente = CLIMA.real ? 'NASA DONKI' : L('archivo histórico NASA', 'NASA historical archive');
  el.className = `sol-estado r-${cls} ${alerta ? 'alerta' : ''}`;
  el.title = L(`Estado del Sol según ${fuente}. Toca para ver los datos reales.`, `Sun status from ${fuente}. Tap to see the real data.`);
  el.innerHTML = alerta
    ? `🚨 <b>${L('ALERTA SOLAR', 'SOLAR ALERT')}</b>${simulacro ? ` <small>(${L('simulacro', 'drill')})</small>` : ''} · ☢️ ${L('Riesgo', 'Risk')} <b>${L(es, en)}</b>`
    : `☀️ ${L('Actividad solar normal', 'Normal solar activity')} · ☢️ ${L('Riesgo', 'Risk')} <b>${L(es, en)}</b>`;
  ubicar(el);
}

// Debajo del tablero de recursos (o arriba a la izquierda si no hay tablero)
function ubicar(el) {
  const tab = document.querySelector('.tablero, .hud-top');
  const r = tab?.getBoundingClientRect();
  el.style.top = (r && r.height ? Math.round(r.bottom + 8) : 12) + 'px';
  el.style.left = (r && r.width ? Math.round(r.left) : 12) + 'px';
  el.style.display = document.body.classList.contains('modo-eva') ? 'none' : '';
}

// ---------------------------------------------------------------- alerta
function alertar(f, esSimulacro = false) {
  let b = document.querySelector('#alertaSolar');
  if (!b) { b = document.createElement('div'); b.id = 'alertaSolar'; b.setAttribute('role', 'alert'); document.body.appendChild(b); }
  ultimaAlerta = { f, esSimulacro };
  pintarAlerta(b, f, esSimulacro);
  b.classList.add('visible');
  clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('visible'), 12000);
  beep(330, 0.25, 'sawtooth'); setTimeout(() => beep(330, 0.25, 'sawtooth'), 300);
  try { window.juego?.mundo?.efecto('llamarada'); } catch { /* solo visual */ }
}

// Solo el contenido (sin sonido ni efecto): lo usa también el botón ES/EN
function pintarAlerta(b, f, esSimulacro) {
  const hora = f.hora ? ` · ${f.hora} UTC` : '';
  b.innerHTML = `
    <div class="as-cab">🚨 ${L('ALERTA SOLAR', 'SOLAR ALERT')}${esSimulacro ? ` <small>${L('SIMULACRO', 'DRILL')}</small>` : ''}</div>
    <p>${esSimulacro
      ? L(`Simulacro: así se vería una llamarada clase <b>${f.clase}</b> detectada por NASA DONKI.`, `Drill: this is how a class <b>${f.clase}</b> flare detected by NASA DONKI would look.`)
      : L(`NASA DONKI detectó una llamarada clase <b>${f.clase}</b> (${f.fecha}${hora}).`, `NASA DONKI detected a class <b>${f.clase}</b> flare (${f.fecha}${hora}).`)}
      ${L('El riesgo de radiación aumentó: los astronautas que estén afuera reciben más dosis.', 'Radiation risk went up: astronauts outside get a higher dose.')}</p>
    <p class="as-dec">${L('¿Siguen trabajando o vuelven al refugio?', 'Keep working, or go back to the shelter?')}</p>
    <button type="button" class="as-ok">${L('Entendido', 'Got it')}</button>`;
  b.querySelector('.as-ok').onclick = () => b.classList.remove('visible');
}

onIdioma(() => {
  pintarIndicador();
  const b = document.querySelector('#alertaSolar');
  if (b && ultimaAlerta) pintarAlerta(b, ultimaAlerta.f, ultimaAlerta.esSimulacro);
});

// Sube el riesgo del juego con las llamaradas nuevas (regla del juego: la misma fórmula de DONKI)
function sumarLlamaradas(nuevas) {
  const flares = [...nuevas, ...(CLIMA.real ? CLIMA.flares || [] : [])];
  const { riesgo, nX, nM } = riesgoDe(flares);
  setClima({ flares, riesgo: Math.max(riesgo, CLIMA.riesgo ?? 0), nX, nM });
  try { window.juego?.refrescar?.(); } catch { /* opcional */ }
}

// ---------------------------------------------------------------- vigilancia
async function vigilar() {
  if (DEMO || !navigator.onLine) return;
  const lista = await consultarRecientes(2).catch(() => null);
  if (!lista) return;                                  // DONKI no responde: el juego sigue igual
  // "Nueva" = no estaba en la carga inicial de 30 días ni en una vigilancia anterior
  (CLIMA.real ? CLIMA.flares || [] : []).forEach(f => vistas.add(clave(f)));
  const nuevas = lista.filter(f => !vistas.has(clave(f)));
  nuevas.forEach(f => vistas.add(clave(f)));
  if (!CLIMA.real) return;                             // sin datos base reales, solo registramos
  const fuertes = nuevas.filter(f => 'MX'.includes(f.clase[0])).sort((a, b) => fuerza(b.clase) - fuerza(a.clase));
  if (!fuertes.length) return;
  sumarLlamaradas(nuevas);
  alertar(fuertes[0]);
  pintarIndicador();
}

function iniciar() {
  (CLIMA.flares || []).forEach(f => vistas.add(clave(f)));
  if (PARAMS.get('alerta') === '1') {
    simulacro = { clase: 'M5.0', fecha: new Date().toISOString().slice(0, 10) };
    setTimeout(() => { simulacro.activo = true; alertar(simulacro, true); pintarIndicador(); }, 4000);
  }
  pintarIndicador();
  setInterval(pintarIndicador, 1500);                  // sigue los cambios de idioma, caminata y datos
  setTimeout(() => { vigilar(); setInterval(vigilar, CADA_MIN * 60e3); }, 60e3);
}

const css = document.createElement('style');
css.textContent = `
  .sol-estado { position: fixed; z-index: 3; border: 2px solid var(--tinta, #2b1408); background: var(--papel, #fff4e3); color: var(--tinta, #2b1408);
    border-radius: 999px; padding: 4px 12px; font: inherit; font-size: 13px; box-shadow: var(--sombra, 3px 3px 0 #2b1408); cursor: pointer; }
  .sol-estado.r-bajo b { color: var(--verde, #2e9a4a); }
  .sol-estado.r-medio b { color: #b07a00; }
  .sol-estado.r-alto b { color: var(--marte, #e2582c); }
  .sol-estado.alerta { background: var(--rojo, #e53935); color: #fff; animation: latido .9s infinite; }
  .sol-estado.alerta b { color: #fff; }
  /* Vive pegado al tablero de recursos: si el tablero se oculta o una consola lo tapa, se oculta con él */
  body.en-consola .sol-estado { display: none !important; }
  #alertaSolar { position: fixed; z-index: 25; left: 50%; top: 18%; transform: translate(-50%, -20px); opacity: 0; pointer-events: none;
    width: min(440px, calc(100% - 24px)); background: var(--papel, #fff4e3); color: var(--tinta, #2b1408); border: 3px solid var(--rojo, #e53935);
    border-radius: 18px; padding: 14px 16px; box-shadow: var(--sombra, 4px 4px 0 #2b1408); transition: all .3s; }
  #alertaSolar.visible { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
  #alertaSolar .as-cab { font-family: var(--titulo, inherit); font-size: 22px; color: var(--rojo, #e53935); }
  #alertaSolar .as-cab small { font-size: 12px; background: var(--tinta, #2b1408); color: #fff; border-radius: 6px; padding: 1px 6px; margin-left: 6px; vertical-align: middle; }
  #alertaSolar p { margin: 8px 0; font-size: 15px; }
  #alertaSolar .as-dec { font-weight: 700; }
  #alertaSolar .as-ok { border: 2px solid var(--tinta, #2b1408); background: var(--marte, #e2582c); color: #fff; border-radius: 12px; padding: 8px 16px; font: inherit; font-weight: 700; }
  @media (max-width: 760px) { .sol-estado { font-size: 11px; padding: 3px 8px; } }`;
document.head.appendChild(css);

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', iniciar); else iniciar();
