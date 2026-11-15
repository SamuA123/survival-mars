// HUD de la caminata espacial: oxígeno del traje, radiación, objetos, flecha a la base, joystick.
// Panel de radiación y mochila (ideas del grupo): nivel actual, exposición, tiempo afuera, protección; recoger/soltar/depositar.
import { TIPOS, MOCHILA_MAX } from '../world3d/eva.js';
import { beep } from './sonido.js';
import { MISION } from '../sim/config.js';
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
    <div class="eva-ayuda" data-i18n-html="eva.ayuda">${t('eva.ayuda')}</div>
    <div class="eva-botones">
      <button id="evaRecoger" class="eva-btn oculto"></button>
      <button id="evaSoltar" class="eva-btn eva-btn-sec oculto"></button>
      <button id="evaLimpiar" class="eva-btn oculto">${t('eva.limpiar')}<span class="tecla"> (E)</span></button>
      <button id="evaEntrar" class="eva-btn oculto">${t('eva.entrar')}<span class="tecla"> (E)</span></button>
    </div>
    <div class="joystick" id="joy"><div class="joy-palo" id="joyPalo"></div></div>`;
  document.body.appendChild(raiz);
  raiz.querySelector('#evaEntrar').onclick = () => control.accion();
  raiz.querySelector('#evaLimpiar').onclick = () => control.accion();
  raiz.querySelector('#evaRecoger').onclick = () => control.recoger();
  raiz.querySelector('#evaSoltar').onclick = () => control.soltar();
  activarJoystick(control);
}

export function actualizarHUDEVA(e) {
  if (!raiz) return;
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
  avisoTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}

// Aviso breve: la explicación completa queda disponible en Inventario.
let tarjetaTimer = null;
function pintarRecogida() {
  if (!raiz || !ultimaTarjeta) return;
  const { tipo } = ultimaTarjeta, o = TIPOS[tipo], v = MISION.eva.valores;
  const uso = tipo === 'roca' ? L(`+${v.roca} ciencia al volver`, `+${v.roca} science when you return`)
    : tipo === 'hielo' ? L(`hasta +${v.hielo} oxígeno al volver`, `up to +${v.hielo} oxygen when you return`)
    : L('1 bolsa para el blindaje al volver', '1 bag for shielding when you return');
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
  const ocupados = [...document.querySelectorAll('.hud-top, .eva-top, .eva-base, .eva-botones, .joystick, .botones-top, .eva-ayuda, .eva-aviso.visible')]
    .filter(n => getComputedStyle(n).visibility !== 'hidden')
    .map(n => n.getBoundingClientRect()).filter(r => r.width && r.height);
  const xs = [innerWidth - ancho - margen, margen, (innerWidth - ancho) / 2];
  for (let y = 76; y + alto <= innerHeight - margen; y += 12) {
    for (const x of xs) {
      if (x < 0 || ocupados.some(r => x < r.right + 8 && x + ancho > r.left - 8 && y < r.bottom + 8 && y + alto > r.top - 8)) continue;
      Object.assign(el.style, { left: x + 'px', top: y + 'px' });
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
  raiz?.remove(); raiz = null;
  ultimoAviso = null; ultimaTarjeta = null;
  clearTimeout(avisoTimer); clearTimeout(tarjetaTimer);
}

onIdioma(() => {
  if (!raiz) return;
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
    @media (max-width: 760px) { .eva-simple .eva-barra b { min-width: 70px; font-size: 13px; } .eva-huecos i { width: 24px; height: 24px; font-size: 14px; } .eva-rad { font-size: 13px; } }`;
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
