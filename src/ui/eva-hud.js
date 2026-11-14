// HUD de la caminata espacial: oxígeno del traje, radiación, objetos, flecha a la base, joystick.
import { TIPOS } from '../world3d/eva.js';
import { beep } from './sonido.js';

let raiz = null, avisoTimer = null, ultimoBeep = 0;

export function mostrarHUDEVA(control) {
  document.body.classList.add('modo-eva');
  raiz = document.createElement('div');
  raiz.id = 'evaHud';
  raiz.innerHTML = `
    <div class="eva-top">
      <div class="eva-tit">🧑‍🚀 Caminata espacial</div>
      <div class="eva-barra" title="Oxígeno que queda en el tanque del traje">
        <span>🫁 Oxígeno del traje</span><div class="barra"><div id="evaO2"></div></div><b id="evaO2n">100%</b></div>
      <div class="eva-barra rad" title="Radiación recibida en esta caminata">
        <span>☢️ Radiación</span><b id="evaRad">0 mSv</b></div>
      <div class="eva-items">${Object.entries(TIPOS).map(([k, t]) => `<span class="eva-item" title="${t.uso}">${t.icono} ${t.nombre}: <b id="evaIt-${k}">0</b></span>`).join('')}</div>
    </div>
    <div class="eva-aviso" id="evaAviso"></div>
    <div class="eva-tarjeta" id="evaTarjeta"></div>
    <div class="eva-base" id="evaBase"><span class="eva-flecha" id="evaFlecha">➤</span> 🏠 <b id="evaDist">0</b> m</div>
    <div class="eva-ayuda">⌨️ <b>WASD</b> o <b>flechas</b> para caminar · Busca 🟫 regolito, 🪨 rocas marcianas y 🧊 hielo de agua · <b>E</b> para entrar</div>
    <div class="eva-botones">
      <button id="evaLimpiar" class="eva-btn oculto">🧹 Limpiar paneles (E)</button>
      <button id="evaEntrar" class="eva-btn oculto">🏠 Entrar a la base (E)</button>
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
  for (const k in e.items) q('#evaIt-' + k).textContent = e.items[k];
  q('#evaDist').textContent = e.distBase;
  q('#evaFlecha').style.transform = `rotate(${e.angBase}rad)`;
  q('#evaBase').classList.toggle('urgente', o2 < 35 || e.llamarada);
  q('#evaEntrar').classList.toggle('oculto', !e.cercaPuerta);
  q('#evaLimpiar').classList.toggle('oculto', !e.cercaPaneles);
  // Avisos de oxígeno
  const ahora = performance.now();
  if (o2 < 25 && ahora - ultimoBeep > 900) { beep(o2 < 12 ? 1000 : 760, 0.08); ultimoBeep = ahora; }
  if (o2 < 30 && o2 > 28) avisoEVA('⚠️ ¡Queda poco oxígeno en el traje! Vuelve a la base 🏠');
}

export function avisoEVA(txt) {
  if (!raiz) return;
  const el = raiz.querySelector('#evaAviso');
  el.textContent = txt; el.classList.add('visible');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}

// Tarjeta al recoger: qué es (dato real) y para qué sirve. La 1ª vez de cada tipo, completa.
const vistos = new Set();
let tarjetaTimer = null;
export function tarjetaObjeto(tipo) {
  if (!raiz) return;
  const t = TIPOS[tipo], primera = !vistos.has(tipo);
  vistos.add(tipo);
  const el = raiz.querySelector('#evaTarjeta');
  el.style.setProperty('--c', t.color);
  el.innerHTML = `<div class="tj-cab"><span class="tj-ic">${t.icono}</span><div><small>¡Recogiste!</small><b>${t.nombre}</b></div></div>
    ${primera ? `<p>${t.que}</p>` : ''}<p class="tj-uso">✅ ${t.uso}</p>`;
  el.classList.add('visible');
  clearTimeout(tarjetaTimer);
  tarjetaTimer = setTimeout(() => el.classList.remove('visible'), primera ? 7000 : 3000);
}

export function ocultarHUDEVA() {
  document.body.classList.remove('modo-eva');
  raiz?.remove(); raiz = null;
}

function activarJoystick(control) {
  const joy = raiz.querySelector('#joy'), palo = raiz.querySelector('#joyPalo');
  let id = null, cx = 0, cy = 0;
  const R = 45;
  joy.addEventListener('pointerdown', e => {
    id = e.pointerId; joy.setPointerCapture(id);
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
