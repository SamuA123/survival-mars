// HUD de la caminata espacial: oxígeno del traje, radiación, objetos, flecha a la base, joystick.
import { TIPOS } from '../world3d/eva.js';
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
    </div>
    <div class="eva-aviso" id="evaAviso"></div>
    <div class="eva-tarjeta" id="evaTarjeta" role="status" aria-live="polite" aria-atomic="true"></div>
    <div class="eva-base" id="evaBase"><span class="eva-flecha" id="evaFlecha">➤</span> 🏠 <b id="evaDist">0</b> m</div>
    <div class="eva-ayuda" data-i18n-html="eva.ayuda">${t('eva.ayuda')}</div>
    <div class="eva-botones">
      <button id="evaLimpiar" class="eva-btn oculto">${t('eva.limpiar')}<span class="tecla"> (E)</span></button>
      <button id="evaEntrar" class="eva-btn oculto">${t('eva.entrar')}<span class="tecla"> (E)</span></button>
    </div>
    <div class="joystick" id="joy"><div class="joy-palo" id="joyPalo"></div></div>`;
  document.body.appendChild(raiz);
  raiz.querySelector('#evaEntrar').onclick = () => control.accion();
  raiz.querySelector('#evaLimpiar').onclick = () => control.accion();
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
  q('#evaLimpiar').classList.toggle('oculto', !e.cercaPaneles);
  // Avisos de oxígeno
  const ahora = performance.now();
  if (o2 < 25 && ahora - ultimoBeep > 900) { beep(o2 < 12 ? 1000 : 760, 0.08); ultimoBeep = ahora; }
  if (o2 < 30 && o2 > 28) avisoEVA(() => t('eva.pocoO2'));
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
