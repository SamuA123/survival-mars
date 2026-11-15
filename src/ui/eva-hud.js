// HUD de la caminata espacial: oxígeno del traje, radiación, objetos, flecha a la base, joystick.
// Panel de radiación y mochila (ideas del grupo): nivel actual, exposición, tiempo afuera, protección; recoger/soltar/depositar.
import { TIPOS, MOCHILA_MAX, PUERTA } from '../world3d/eva.js';
import { beep } from './sonido.js';
import { MISION } from '../sim/config.js';
import { dificultadActual } from '../sim/dificultad.js';
const L = (es, en) => esEN() ? en : es;
import { t, tr, onIdioma, esEN } from './i18n.js';

let raiz = null, avisoTimer = null, ultimoBeep = 0, planEVA = null, planAvisado = false;
let ultimoAviso = null, ultimaTarjeta = null;

// plan = { tipo, cantidad, cumplido } del Plan del sol (o null si no llegó)
export function mostrarHUDEVA(control, plan = null) {
  planEVA = plan && !plan.cumplido ? plan : null;
  planAvisado = false;
  ultimoPanel = '';
  document.body.classList.add('modo-eva');
  raiz = document.createElement('div');
  raiz.id = 'evaHud';
  // Solo tres cosas en pantalla, lo que el niño necesita mientras camina:
  // ¿cuánto aire me queda? · ¿qué tan peligroso está afuera? · ¿qué llevo en la mochila?
  // Los números (mSv, exposición, tiempo afuera) se ven en el resumen al volver y en los tooltips.
  raiz.innerHTML = `
    <div class="eva-vineta" id="evaVineta" aria-hidden="true"></div>
    <div class="eva-top eva-simple">
      <div class="eva-barra" id="evaAire">
        <span class="eva-ic">🫁</span><div class="barra"><div id="evaO2"></div></div><b id="evaO2n"></b></div>
      <div class="eva-fila">
        <span class="eva-rad" id="evaRadNivel" aria-live="polite"></span>
        <span class="eva-items" id="evaMochila"></span>
      </div>
    </div>
    <div class="eva-aviso" id="evaAviso"></div>
    <div class="eva-tarjeta" id="evaTarjeta" role="status" aria-live="polite" aria-atomic="true"></div>
    <div class="eva-base" id="evaBase"><span class="eva-flecha" id="evaFlecha">➤</span> 🏠 <b id="evaDist">0</b> m</div>
    <div class="eva-ayuda" id="evaAyuda">${ayudaTeclas()}</div>
    <div class="eva-botones">
      <button id="evaRecoger" class="eva-btn oculto"></button>
      <button id="evaSoltar" class="eva-btn eva-btn-sec oculto"></button>
      <button id="evaLimpiar" class="eva-btn oculto">${t('eva.limpiar')}<span class="tecla"> (E)</span></button>
      <button id="evaEntrar" class="eva-btn oculto">${t('eva.entrar')}<span class="tecla"> (E)</span></button>
    </div>
    <div class="joystick" id="joy"><div class="joy-palo" id="joyPalo"></div></div>
    <div class="eva-mapa" id="evaMapa" title="${tituloMapa()}"><canvas id="evaMapaCanvas"></canvas></div>`;
  document.body.appendChild(raiz);
  raiz.querySelector('#evaEntrar').onclick = () => control.accion();
  raiz.querySelector('#evaLimpiar').onclick = () => control.accion();
  raiz.querySelector('#evaRecoger').onclick = () => control.recoger();
  raiz.querySelector('#evaSoltar').onclick = () => control.soltar();
  activarJoystick(control);
  controlMapa = control;
  addEventListener('keydown', alMoverse);
  mostrarAyuda();
}

// ---------------------------------------------------------------------
//  🗺️ MINIMAPA (abajo a la derecha). Girado como la cámara: "arriba" en el mapa = la tecla W.
//  Muestra la base, la puerta, lo que queda por recoger y al astronauta con su dirección.
// ---------------------------------------------------------------------
const RADIO_MUNDO = 78;
// El rango decide: Cadete ve todo el mapa; Comandante, solo lo que alcanza el radar del traje
const radarActual = () => (dificultadActual === 'cadete' ? 0 : MISION.eva.radarMapa || 0);
const tituloMapa = () => (radarActual()
  ? L(`Radar del traje: ves lo que está a menos de ${MISION.eva.radarMapa} m. Arriba es hacia donde caminas con W.`, `Suit radar: you see what is closer than ${MISION.eva.radarMapa} m. Up is where W walks.`)
  : L('Mapa: arriba es hacia donde caminas con W.', 'Map: up is where W walks.'));            // un poco más que lo que se puede caminar (76 en world3d/eva.js)
let controlMapa = null, ultimoMapa = 0;
function dibujarMapa() {
  const c = controlMapa, cv = raiz?.querySelector('#evaMapaCanvas');
  if (!c?.jugador || !cv) return;
  const ahora = performance.now();
  if (ahora - ultimoMapa < 66) return;   // ~15 veces por segundo alcanza
  ultimoMapa = ahora;
  const lado = cv.parentElement.clientWidth || 160, dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(lado * dpr)) { cv.width = cv.height = Math.round(lado * dpr); cv.style.width = cv.style.height = lado + 'px'; }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, lado, lado);
  const m = lado / 2, esc = (m - 6) / RADIO_MUNDO;
  // Dirección de la cámara en el suelo: ese es el "arriba" del mapa
  const cam = c.m.camera.position, obj = c.m.controls.target;
  let fx = obj.x - cam.x, fz = obj.z - cam.z;
  const lf = Math.hypot(fx, fz) || 1; fx /= lf; fz /= lf;
  const aPantalla = (x, z) => [m + (-x * fz + z * fx) * esc, m - (x * fx + z * fz) * esc];
  // Fondo: suelo de Marte y borde de lo que se puede caminar
  g.beginPath(); g.arc(m, m, m - 2, 0, Math.PI * 2);
  g.fillStyle = 'rgba(122, 52, 24, .82)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = '#2b1408'; g.stroke();
  g.beginPath(); g.arc(m, m, 76 * esc, 0, Math.PI * 2);
  g.setLineDash([4, 4]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255, 244, 227, .45)'; g.stroke(); g.setLineDash([]);
  // Base y puerta
  const [bx, by] = aPantalla(0, 0), [px, py] = aPantalla(PUERTA.x, PUERTA.z);
  g.beginPath(); g.arc(bx, by, 7 * esc + 4, 0, Math.PI * 2); g.fillStyle = '#fff4e3'; g.fill();
  g.lineWidth = 2; g.strokeStyle = '#2b1408'; g.stroke();
  g.beginPath(); g.arc(px, py, 3.5, 0, Math.PI * 2); g.fillStyle = '#33c2d6'; g.fill(); g.stroke();
  // Radar del traje (Comandante): solo se ven los objetos a menos de radarMapa metros. Cadete ve todo.
  const p = c.jugador.position, radar = radarActual();
  if (radar) {
    const [rx, ry] = aPantalla(p.x, p.z);
    const grad = g.createRadialGradient(rx, ry, 0, rx, ry, radar * esc);
    grad.addColorStop(0, 'rgba(51, 194, 214, .30)'); grad.addColorStop(1, 'rgba(51, 194, 214, .08)');
    g.save(); g.beginPath(); g.arc(m, m, m - 3, 0, Math.PI * 2); g.clip();
    g.beginPath(); g.arc(rx, ry, radar * esc, 0, Math.PI * 2); g.fillStyle = grad; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(155, 231, 255, .8)'; g.stroke();
    // Barrido que gira, como una pantalla de radar
    const a = (ahora / 900) % (Math.PI * 2);
    g.beginPath(); g.moveTo(rx, ry); g.arc(rx, ry, radar * esc, a - 0.5, a); g.closePath();
    g.fillStyle = 'rgba(155, 231, 255, .22)'; g.fill();
    g.restore();
  }
  // Objetos que quedan: el mismo ícono que en el resto del juego, sobre su color
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '11px system-ui, "Segoe UI Emoji", sans-serif';
  for (const o of c.objetos || []) {
    if (!o.g.parent) continue;
    if (radar && Math.hypot(o.g.position.x - p.x, o.g.position.z - p.z) > radar) continue;
    const [x, y] = aPantalla(o.g.position.x, o.g.position.z), T = TIPOS[o.tipo];
    g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fillStyle = T?.color || '#fff'; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = '#2b1408'; g.stroke();
    g.fillText(T?.icono || '', x, y + 0.5);
  }
  // Astronauta: flecha que apunta hacia donde camina
  const ry = c.jugador.rotation.y;
  const [ax, ay] = aPantalla(p.x, p.z);
  const dx = Math.sin(ry), dz = Math.cos(ry);
  const ang = Math.atan2(-(dx * fx + dz * fz), (-dx * fz + dz * fx));
  g.save(); g.translate(ax, ay); g.rotate(ang);
  g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, 6); g.lineTo(-3, 0); g.lineTo(-6, -6); g.closePath();
  g.fillStyle = '#ffd54a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#2b1408'; g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------
//  Teclas de la caminata dibujadas como teclas de verdad.
//  Se esconden mientras el jugador camina y vuelven si se queda quieto un rato.
// ---------------------------------------------------------------------
const MOVER = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
const QUIETO_MS = 3000;
let ayudaTimer = null;
const k = (x, cls = '') => `<kbd class="tk ${cls}">${x}</kbd>`;
function ayudaTeclas() {
  return `
    <div class="ay-tit">⌨️ ${L('Controles', 'Controls')}</div>
    <div class="ay-fila"><div class="ay-teclas"><div class="cruz">${k('W', 'arriba')}${k('A')}${k('S')}${k('D')}</div>
      <div class="cruz chica">${k('↑', 'arriba')}${k('←')}${k('↓')}${k('→')}</div></div><span>${L('Caminar', 'Walk')}</span></div>
    <div class="ay-fila"><div class="ay-teclas">${k('E', 'grande')}</div><span>${L('Recoger o entrar a la base', 'Pick up or go into the base')}</span></div>
    <div class="ay-fila"><div class="ay-teclas">${k('R', 'grande')}</div><span>${L('Soltar de la mochila', 'Drop from the backpack')}</span></div>
    <div class="ay-fila ay-buscar"><div class="ay-teclas">🟫 🪨 🧊</div><span>${L('Busca esto afuera', 'Look for these outside')}</span></div>`;
}
function mostrarAyuda() {
  clearTimeout(ayudaTimer);
  raiz?.querySelector('#evaAyuda')?.classList.remove('oculta');
}
function alMoverse(e) {
  if (!raiz || !MOVER.has(e.key.toLowerCase())) return;
  raiz.querySelector('#evaAyuda')?.classList.add('oculta');
  clearTimeout(ayudaTimer);
  ayudaTimer = setTimeout(mostrarAyuda, QUIETO_MS);
}

export function actualizarHUDEVA(e) {
  if (!raiz) return;
  dibujarMapa();
  const q = s => raiz.querySelector(s);
  const o2 = Math.ceil(e.o2);
  ultimoEstado = e;
  // Aire: barra + SEGUNDOS que quedan (más claro que un porcentaje para decidir si volver)
  const seg = Math.max(0, Math.floor(e.o2 / (MISION.eva.o2TrajePorSeg || 1.2)));
  const urgente = o2 < 35;
  q('#evaO2').style.width = o2 + '%';
  q('#evaO2').className = o2 < 25 ? 'peligro' : o2 < 50 ? 'medio' : '';
  q('#evaO2n').textContent = urgente ? L(`¡${seg} s! Vuelve`, `${seg} s! Go back`) : L(`${seg} s de aire`, `${seg} s of air`);
  q('#evaAire').classList.toggle('urgente', urgente);
  q('#evaAire').title = L(`Aire del traje: ${o2}%. Alcanza para unos ${seg} segundos.`, `Suit air: ${o2}%. Enough for about ${seg} seconds.`);
  q('#evaVineta').className = `eva-vineta ${o2 < 25 ? 'aire' : ''} ${e.llamarada ? 'llamarada' : ''}`;
  if (planEVA && !planAvisado && e.items[planEVA.tipo] >= planEVA.cantidad) {
    planAvisado = true;
    avisoEVA(() => t('eva.planAviso'), true);
    beep(1320, 0.15, 'triangle');
  }
  geiger(e);
  q('#evaDist').textContent = e.distBase;
  q('#evaFlecha').style.transform = `rotate(${e.angBase}rad)`;
  q('#evaBase').classList.toggle('urgente', o2 < 35 || e.llamarada);
  q('#evaEntrar').classList.toggle('oculto', !e.cercaPuerta);
  q('#evaLimpiar').classList.toggle('oculto', !e.cercaPaneles || !!e.cercano);
  pintarPanelRad(e);
  pintarMochila(e);
  ubicarBotones();
  // Avisos de oxígeno
  const ahora = performance.now();
  if (o2 < 25 && ahora - ultimoBeep > 900) { beep(o2 < 12 ? 1000 : 760, 0.08); ultimoBeep = ahora; }
  if (o2 < 30 && o2 > 28) avisoEVA(() => t('eva.pocoO2'));
}

// ---- Radiación: UN solo medidor de color (nivel del Sol real + llamarada). Los detalles van en el tooltip ----
const NIVELES = {
  baja: ['Baja', 'Low', 1], moderada: ['Media', 'Medium', 2], alta: ['Alta', 'High', 3], extrema: ['¡Peligro!', 'Danger!', 4],
};
let ultimoPanel = '', ultimoEstado = null;
function pintarPanelRad(e) {
  const el = raiz?.querySelector('#evaRadNivel');
  if (!el) return;
  const nivel = e.llamarada ? 'extrema' : (e.nivel || 'baja');
  const [es, en, n] = NIVELES[nivel];
  const rayas = Array.from({ length: 4 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  const html = `☢️ <span class="eva-medidor">${rayas}</span> <b>${L(es, en)}</b>`;
  el.className = `eva-rad n-${nivel}`;
  el.title = L(`Radiación afuera: ${es.toLowerCase()} (según el Sol real, NASA DONKI). En esta caminata: ${r1(e.rad)} mSv. Tripulación: ${e.exposicion ?? 0} % del límite.`,
    `Radiation outside: ${en.toLowerCase()} (from the real Sun, NASA DONKI). This walk: ${r1(e.rad)} mSv. Crew: ${e.exposicion ?? 0}% of the limit.`);
  if (html !== ultimoPanel) { el.innerHTML = html; ultimoPanel = html; }
}
const r1 = v => String(Math.round((v || 0) * 10) / 10).replace('.', esEN() ? '.' : ',');

// Contador Geiger: clics más seguidos cuanto más radiación hay. Se oye el peligro sin leer nada.
let ultimoClic = 0;
function geiger(e) {
  const nivel = e.llamarada ? 'extrema' : (e.nivel || 'baja');
  const media = { baja: 1400, moderada: 700, alta: 300, extrema: 110 }[nivel];   // ms promedio entre clics
  const ahora = performance.now();
  if (ahora - ultimoClic > media * (0.4 + Math.random() * 1.2)) { beep(1800 + Math.random() * 600, 0.012, 'square'); ultimoClic = ahora; }
}

// Los botones de acción no deben tapar el panel: si el panel está abajo, se ponen justo encima.
function ubicarBotones() {
  const bot = raiz?.querySelector('.eva-botones'), top = raiz?.querySelector('.eva-top');
  if (!bot || !top) return;
  const r = top.getBoundingClientRect();
  const abajo = r.height && r.top > innerHeight * 0.4;
  bot.style.bottom = abajo ? `${Math.round(innerHeight - r.top + 10)}px` : '';
}

// ---- Mochila: recoger (E/Q), soltar (R) y depositar al entrar ----
function pintarMochila(e) {
  const rec = raiz.querySelector('#evaRecoger'), sol = raiz.querySelector('#evaSoltar'), ent = raiz.querySelector('#evaEntrar');
  if (e.cercano) {
    const o = TIPOS[e.cercano];
    rec.innerHTML = e.mochilaLlena
      ? `🎒 ${L('Mochila llena', 'Backpack full')}<span class="tecla"> (R ${L('suelta', 'drop')})</span>`
      : `✋ ${L('Recoger', 'Pick up')} ${o.icono} ${tr(o.nombre)}<span class="tecla"> (E)</span>`;
    rec.classList.toggle('lleno', e.mochilaLlena);
  }
  rec.classList.toggle('oculto', !e.cercano);
  sol.innerHTML = `↩️ ${L('Soltar', 'Drop')}<span class="tecla"> (R)</span>`;
  sol.classList.toggle('oculto', !e.carga || e.cercaPuerta);
  if (e.cercaPuerta) ent.innerHTML = e.carga
    ? `📦 ${L(`Depositar ${e.carga} y entrar`, `Drop off ${e.carga} and go in`)}<span class="tecla"> (E)</span>`
    : `${t('eva.entrar')}<span class="tecla"> (E)</span>`;
  // Mochila: un hueco por objeto. El pedido de la Tierra se marca con 📋 y se pone verde al cumplirse.
  const max = e.mochilaMax || MOCHILA_MAX;
  const dentro = Object.entries(e.items).flatMap(([k, c]) => Array(c).fill(TIPOS[k].icono));
  const huecos = Array.from({ length: max }, (_, i) => `<i class="${dentro[i] ? 'on' : ''}">${dentro[i] || ''}</i>`).join('');
  let pedido = '';
  if (planEVA) {
    const o = TIPOS[planEVA.tipo], c = Math.min(e.items[planEVA.tipo] || 0, planEVA.cantidad), listo = c >= planEVA.cantidad;
    pedido = `<span class="eva-pedido ${listo ? 'listo' : ''}" title="${L('Pedido de la Tierra (opcional)', 'Request from Earth (optional)')}">📋 ${o.icono} ${listo ? '✅' : `${c}/${planEVA.cantidad}`}</span>`;
  }
  const html = `🎒 <span class="eva-huecos ${e.mochilaLlena ? 'llena' : ''}">${huecos}</span>${pedido}`;
  const m = raiz.querySelector('#evaMochila');
  m.title = L(`Mochila: ${e.carga} de ${max}. Lo que llevas se guarda al entrar a la base.`, `Backpack: ${e.carga} of ${max}. What you carry is stored when you go into the base.`);
  if (m.innerHTML !== html) m.innerHTML = html;
}

// txt puede venir de src/world3d (en español): se traduce con tr()
export function avisoEVA(txt, bueno = false) {
  if (!raiz) return;
  ultimoAviso = txt;
  const el = raiz.querySelector('#evaAviso');
  el.textContent = tr(typeof txt === 'function' ? txt() : txt); el.classList.add('visible');
  el.classList.toggle('bueno', bueno);
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { el.classList.remove('visible'); posicionarRecogida(); }, 3500);
  posicionarRecogida();   // si ya hay un "+1" en pantalla, se aparta del aviso
}

// Aviso breve: la explicación completa queda disponible en Inventario.
let tarjetaTimer = null;
function pintarRecogida() {
  if (!raiz || !ultimaTarjeta) return;
  const { tipo } = ultimaTarjeta, o = TIPOS[tipo], v = MISION.eva.valores;
  const uso = tipo === 'roca' ? L(`+${v.roca} ciencia al volver`, `+${v.roca} science when you return`)
    : tipo === 'hielo' ? L(`hasta +${v.hielo} oxígeno al volver`, `up to +${v.hielo} oxygen when you return`)
    : L('+1 de regolito para construir al volver', '+1 regolith for building when you return');
  const el = raiz.querySelector('#evaTarjeta');
  el.style.setProperty('--c', o.color);
  el.innerHTML = `<b>${o.icono} +1 ${tr(o.nombre)}</b><small>${uso}</small>`;
  posicionarRecogida();
}

export function tarjetaObjeto(tipo) {
  if (!raiz || !TIPOS[tipo]) return;
  ultimaTarjeta = { tipo };
  const el = raiz.querySelector('#evaTarjeta');
  el.classList.add('visible');
  pintarRecogida();
  clearTimeout(tarjetaTimer);
  tarjetaTimer = setTimeout(() => el.classList.remove('visible'), 2500);
}

// Busca una zona libre de indicadores y controles, también al girar el teléfono.
function posicionarRecogida() {
  const el = raiz?.querySelector('#evaTarjeta');
  if (!el?.classList.contains('visible')) return;
  const ancho = el.offsetWidth, alto = el.offsetHeight, margen = 12;
  const ocupados = [...document.querySelectorAll('.hud-top, .eva-top, .eva-base, .eva-botones, .joystick, .botones-top, .eva-ayuda, .eva-mapa, .eva-aviso.visible')]
    .filter(n => getComputedStyle(n).visibility !== 'hidden')
    .map(n => n.getBoundingClientRect()).filter(r => r.width && r.height)
    .map(r => ({ left: r.left - 30, right: r.right + 30, top: r.top - 10, bottom: r.bottom + 10 }));   // margen extra: el aviso todavía está creciendo
  // Toda la columna derecha primero; si no cabe, la izquierda. Nunca el centro: ahí van los avisos importantes.
  const xs = [innerWidth - ancho - margen, margen];
  for (const x of xs) {
    for (let y = 76; y + alto <= innerHeight - margen; y += 12) {
      if (x < 0 || ocupados.some(r => x < r.right + 8 && x + ancho > r.left - 8 && y < r.bottom + 8 && y + alto > r.top - 8)) continue;
      Object.assign(el.style, { left: x + 'px', top: y + 'px', bottom: 'auto' });
      el.classList.toggle('derecha', x > innerWidth / 2);
      el.style.visibility = 'visible';
      return;
    }
  }
  // En una pantalla excepcionalmente pequeña prevalece la lectura del HUD.
  el.style.visibility = 'hidden';
}
addEventListener('resize', posicionarRecogida);

export function ocultarHUDEVA() {
  document.body.classList.remove('modo-eva');
  raiz?.remove(); raiz = null; controlMapa = null;
  ultimoAviso = null; ultimaTarjeta = null;
  clearTimeout(avisoTimer); clearTimeout(tarjetaTimer); clearTimeout(ayudaTimer);
  removeEventListener('keydown', alMoverse);
}

onIdioma(() => {
  if (!raiz) return;
  raiz.querySelector('#evaAyuda').innerHTML = ayudaTeclas();
  raiz.querySelector('#evaMapa').title = tituloMapa();
  raiz.querySelector('#evaEntrar').innerHTML = `${t('eva.entrar')}<span class="tecla"> (E)</span>`;
  raiz.querySelector('#evaLimpiar').innerHTML = `${t('eva.limpiar')}<span class="tecla"> (E)</span>`;
  ultimoPanel = '';
  if (ultimoEstado) actualizarHUDEVA(ultimoEstado);
  if (ultimoAviso) raiz.querySelector('#evaAviso').textContent = tr(typeof ultimoAviso === 'function' ? ultimoAviso() : ultimoAviso);
  if (ultimaTarjeta) pintarRecogida();
});

// Estilos del panel de radiación y la mochila (inyectados aquí para no tocar styles.css)
if (!document.querySelector('style[data-eva-rad]')) {
  const css = document.createElement('style');
  css.dataset.evaRad = '1';
  css.textContent = `
    .eva-top.eva-simple { display: flex; flex-direction: column; align-items: stretch; gap: 8px; width: min(420px, calc(100% - 20px)); }
    .eva-simple .eva-barra { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; font-size: 15px; }
    .eva-simple .eva-ic { font-size: 22px; }
    .eva-simple .eva-barra .barra { height: 18px; }
    .eva-simple .eva-barra b { min-width: 92px; text-align: right; white-space: nowrap; }
    .eva-simple .eva-barra.urgente b { color: var(--rojo, #e53935); animation: latido .7s infinite; }
    .eva-fila { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .eva-rad { display: inline-flex; align-items: center; gap: 6px; font-size: 15px; cursor: help; padding: 2px 10px; border: 2px solid var(--tinta, #2b1408); border-radius: 999px; background: #fff; }
    .eva-medidor { display: inline-flex; gap: 2px; }
    .eva-medidor i { width: 8px; height: 16px; border: 2px solid var(--tinta, #2b1408); border-radius: 3px; background: #fff; }
    .n-baja .eva-medidor i.on { background: var(--verde, #2e9a4a); }    .n-baja b { color: var(--verde, #2e9a4a); }
    .n-moderada .eva-medidor i.on { background: #e0a400; }               .n-moderada b { color: #b07a00; }
    .n-alta .eva-medidor i.on { background: var(--marte, #e2582c); }     .n-alta b { color: var(--marte, #e2582c); }
    .eva-rad.n-extrema { background: var(--rojo, #e53935); color: #fff; animation: latido .6s infinite; }
    .n-extrema .eva-medidor i.on { background: #fff; }                   .n-extrema b { color: #fff; }
    .eva-simple .eva-items { display: inline-flex; align-items: center; gap: 6px; font-size: 18px; cursor: help; }
    .eva-huecos { display: inline-flex; gap: 3px; }
    .eva-huecos i { width: 30px; height: 30px; display: grid; place-items: center; font-style: normal; font-size: 17px; border: 2px dashed var(--tinta-suave, #7a5440); border-radius: 8px; background: #fff; }
    .eva-huecos i.on { border-style: solid; border-color: var(--tinta, #2b1408); background: #fff3cf; }
    .eva-huecos.llena i { border-color: var(--rojo, #e53935); }
    .eva-pedido { font-size: 14px; font-weight: 700; padding: 2px 8px; border: 2px solid #0b5f8a; border-radius: 999px; background: #e4f6ff; color: #0b5f8a; }
    .eva-pedido.listo { border-color: var(--verde, #2e9a4a); background: #ddf5d3; color: var(--verde, #2e9a4a); }
    .eva-vineta { position: fixed; inset: 0; pointer-events: none; transition: box-shadow .4s; }
    .eva-vineta.aire { box-shadow: inset 0 0 90px 30px rgba(229,57,53,.55); animation: latido 1s infinite; }
    .eva-vineta.llamarada { box-shadow: inset 0 0 120px 40px rgba(255,197,49,.6); }
    .eva-vineta.aire.llamarada { box-shadow: inset 0 0 120px 40px rgba(229,57,53,.6); }
    .eva-btn.eva-btn-sec { filter: saturate(.4); }
    .eva-btn.lleno { background: var(--rojo, #e53935); }
    @media (max-width: 760px) { .eva-simple .eva-barra b { min-width: 70px; font-size: 13px; } .eva-huecos i { width: 24px; height: 24px; font-size: 14px; } .eva-rad { font-size: 13px; } }
    /* Celular horizontal: dejar libres los botones de arriba a la derecha */
    @media (max-height: 500px) and (orientation: landscape) {
      body.modo-eva .eva-top.eva-simple { width: min(340px, 40vw); gap: 4px; }
      .eva-huecos i { width: 22px; height: 22px; font-size: 13px; }
    }`;
  document.head.appendChild(css);
}

function activarJoystick(control) {
  const joy = raiz.querySelector('#joy'), palo = raiz.querySelector('#joyPalo');
  let id = null, cx = 0, cy = 0;
  const R = 45;
  joy.addEventListener('pointerdown', e => {
    id = e.pointerId; try { joy.setPointerCapture(id); } catch { /* algunos navegadores */ }
    const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    mover(e);
  });
  const mover = e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    palo.style.transform = `translate(${dx}px, ${dy}px)`;
    control.joy.x = dx / R; control.joy.y = -dy / R;
  };
  joy.addEventListener('pointermove', mover);
  const soltar = e => { if (e.pointerId !== id) return; id = null; palo.style.transform = ''; control.joy.x = control.joy.y = 0; };
  joy.addEventListener('pointerup', soltar);
  joy.addEventListener('pointercancel', soltar);
}
