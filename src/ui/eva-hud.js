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
  raiz.innerHTML = `
    <div class="eva-top">
      <div class="eva-tit" data-i18n="eva.tit">${t('eva.tit')}</div>
      <div class="eva-barra" title="${t('eva.o2.t')}">
        <span data-i18n="eva.o2">${t('eva.o2')}</span><div class="barra"><div id="evaO2"></div></div><b id="evaO2n">100%</b></div>
      <div class="eva-barra rad" title="${t('eva.rad.t')}">
        <span data-i18n="eva.rad">${t('eva.rad')}</span><b id="evaRad">0 mSv</b></div>
      <div class="eva-items">${Object.entries(TIPOS).map(([k, o]) => `<span class="eva-item ${planEVA?.tipo === k ? 'objetivo' : ''}" title="${tr(o.uso)}">${o.icono} ${tr(o.nombre)}: <b id="evaIt-${k}">0</b>${planEVA?.tipo === k ? `<small>/${planEVA.cantidad} 📋</small>` : ''}</span>`).join('')}</div>
      ${planEVA ? `<div class="eva-plan" id="evaPlan">${t('eva.plan', { c: planEVA.cantidad, i: TIPOS[planEVA.tipo].icono, n: tr(TIPOS[planEVA.tipo].nombre) })} <small>${t('plan.opcional')}</small></div>` : ''}
      <div class="eva-radpanel" id="evaRadPanel" aria-live="polite"></div>
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
  q('#evaO2').style.width = o2 + '%';
  q('#evaO2').className = o2 < 25 ? 'peligro' : o2 < 50 ? 'medio' : '';
  q('#evaO2n').textContent = o2 + '%';
  q('#evaRad').textContent = (Math.round(e.rad * 10) / 10) + ' mSv' + (e.llamarada ? ' ⚠️' : '');
  q('.eva-barra.rad').classList.toggle('peligro', e.llamarada);
  for (const k in e.items) { const el = q('#evaIt-' + k); if (el) el.textContent = e.items[k]; }
  if (planEVA && !planAvisado && e.items[planEVA.tipo] >= planEVA.cantidad) {
    planAvisado = true;
    q('#evaPlan').innerHTML = t('eva.planListo');
    q('#evaPlan').classList.add('listo');
    avisoEVA(() => t('eva.planAviso'), true);
    beep(1320, 0.15, 'triangle');
  }
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

// ---- Panel de radiación: nivel actual (DONKI / llamarada), exposición, tiempo afuera y protección ----
const NIVELES = {
  baja: ['BAJA', 'LOW'], moderada: ['MODERADA', 'MODERATE'], alta: ['ALTA', 'HIGH'], extrema: ['EXTREMA', 'EXTREME'],
};
const reloj = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let ultimoPanel = '';
function pintarPanelRad(e) {
  const el = raiz?.querySelector('#evaRadPanel');
  if (!el || !e.nivel) return;
  const [es, en] = NIVELES[e.nivel];
  // % de radiación que entra al hábitat (secciones de blindaje construidas con el modo B)
  const habitat = Math.round((e.entraHabitat ?? (1 - Math.min(e.blindaje || 0, 3) / 3 * 0.6)) * 100);
  const html = `
    <span class="rp rp-nivel n-${e.nivel}" title="${L('Según la actividad real del Sol (NASA DONKI) y las llamaradas', 'Based on real solar activity (NASA DONKI) and flares')}">☢️ ${L('Radiación actual', 'Current radiation')}: <b>${L(es, en)}</b></span>
    <span class="rp ${e.exposicion >= 70 ? 'peligro' : ''}" title="${L('Radiación acumulada de la tripulación, respecto del límite de la misión', 'Crew radiation so far, compared with the mission limit')}">👨‍🚀 ${L('Exposición', 'Exposure')}: <b>${e.exposicion}%</b></span>
    <span class="rp">⏱️ ${L('Afuera', 'Outside')}: <b>${reloj(e.t)}</b></span>
    <span class="rp rp-prot" title="${L(`Dentro del hábitat llega el ${habitat}% de la radiación`, `Inside the habitat, ${habitat}% of the radiation gets in`)}">🛡️ ${L('Aquí: sin protección', 'Here: no protection')} · ${L('hábitat', 'habitat')} ${habitat < 100 ? `−${100 - habitat}%` : L('sin blindaje', 'no shield')}</span>`;
  if (html !== ultimoPanel) { el.innerHTML = html; ultimoPanel = html; }
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
  const tit = raiz.querySelector('.eva-mochila') || (() => {
    const d = document.createElement('div'); d.className = 'eva-mochila';
    raiz.querySelector('.eva-items').before(d); return d;
  })();
  tit.innerHTML = `🎒 ${L('Mochila', 'Backpack')} <b>${e.carga}/${e.mochilaMax || MOCHILA_MAX}</b> <small>${L('se deposita al entrar a la base', 'dropped off when you go into the base')}</small>`;
  tit.classList.toggle('llena', !!e.mochilaLlena);
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
  raiz.querySelector('.eva-barra').title = t('eva.o2.t');
  raiz.querySelector('.eva-barra.rad').title = t('eva.rad.t');
  raiz.querySelector('#evaEntrar').innerHTML = `${t('eva.entrar')}<span class="tecla"> (E)</span>`;
  raiz.querySelector('#evaLimpiar').innerHTML = `${t('eva.limpiar')}<span class="tecla"> (E)</span>`;
  raiz.querySelectorAll('.eva-item').forEach((el, i) => {
    const [k, o] = Object.entries(TIPOS)[i];
    const valor = raiz.querySelector('#evaIt-' + k).textContent;
    el.title = tr(o.uso);
    el.innerHTML = `${o.icono} ${tr(o.nombre)}: <b id="evaIt-${k}">${valor}</b>${planEVA?.tipo === k ? `<small>/${planEVA.cantidad} 📋</small>` : ''}`;
  });
  const plan = raiz.querySelector('#evaPlan');
  if (plan) plan.innerHTML = planAvisado ? t('eva.planListo') : `${t('eva.plan', { c: planEVA.cantidad, i: TIPOS[planEVA.tipo].icono, n: tr(TIPOS[planEVA.tipo].nombre) })} <small>${t('plan.opcional')}</small>`;
  if (ultimoAviso) raiz.querySelector('#evaAviso').textContent = tr(typeof ultimoAviso === 'function' ? ultimoAviso() : ultimoAviso);
  if (ultimaTarjeta) pintarRecogida();
});

// Estilos del panel de radiación y la mochila (inyectados aquí para no tocar styles.css)
if (!document.querySelector('style[data-eva-rad]')) {
  const css = document.createElement('style');
  css.dataset.evaRad = '1';
  css.textContent = `
    .eva-radpanel { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .eva-radpanel .rp { background: var(--papel2, #f6e2c6); color: var(--tinta, #2b1408); border: 2px solid var(--tinta, #2b1408);
      border-radius: 999px; padding: 2px 10px; font-size: 13px; white-space: nowrap; }
    .eva-radpanel .rp b { font-weight: 700; }
    .eva-radpanel .n-baja b { color: var(--verde, #2e9a4a); }
    .eva-radpanel .n-moderada b { color: #b07a00; }
    .eva-radpanel .n-alta b { color: var(--marte, #e2582c); }
    .eva-radpanel .n-extrema { background: var(--rojo, #e53935); color: #fff; animation: latido .7s infinite; }
    .eva-radpanel .n-extrema b { color: #fff; }
    .eva-radpanel .rp.peligro { border-color: var(--rojo, #e53935); color: var(--rojo, #e53935); }
    .eva-mochila { grid-column: 1 / -1; font-size: 14px; }
    .eva-mochila small { opacity: .75; margin-left: 6px; }
    .eva-mochila.llena b { color: var(--rojo, #e53935); }
    .eva-btn.eva-btn-sec { filter: saturate(.4); }
    .eva-btn.lleno { background: var(--rojo, #e53935); }
    @media (max-width: 760px) { .eva-radpanel .rp { font-size: 11px; padding: 1px 7px; } .eva-mochila small { display: none; } }`;
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
