// =====================================================================
//  ⌨️ TECLADO PARA TODAS LAS VENTANAS
//  Esc = cerrar o seguir · Enter = botón principal · 1-4 = elegir opción.
//  En una emergencia, Esc NO elige por el jugador: hay que decidir (1, 2… o clic).
//  Las capas con teclas propias (construcción, tripulación, ubicación) se respetan.
//  Al abrirse una ventana, el foco va a la primera opción o al botón principal,
//  así Tab y Enter funcionan sin ratón.
// =====================================================================
const $ = s => document.querySelector(s);
const visible = el => !!el && el.getClientRects().length > 0;
const clic = el => { if (el && !el.disabled) { el.click(); return true; } return false; };
const enCampo = e => e.target?.closest?.('input, textarea, select, [contenteditable]');

// Botones que cierran o continúan, en orden de preferencia (nunca "otra misión" ni los de inicio)
const SALIDA = '#btnSeguir, #btnSig, #btnEvaOk, #btnCerrarInv, #btnCerrarTarea, #btnCerrarDatos';
const modalAbierto = () => !$('#modal')?.classList.contains('oculto');
const caja = () => $('#modalCaja');

function teclaModal(e) {
  const c = caja();
  const n = Number(e.key);
  if (n >= 1 && n <= 9 && !enCampo(e)) {
    return clic(c.querySelector(`.opcion[data-op="${n - 1}"]:not(:disabled)`));
  }
  if (e.key === 'Escape') return clic(c.querySelector(SALIDA));
  if (e.key === 'Enter') {
    // Enter sobre un botón o enlace ya hace lo suyo
    if (e.target?.closest?.('button, a, summary') && e.target !== document.body) return false;
    if (e.target?.id === 'inNombre') return clic(c.querySelector('#btnAprender'));
    return clic(c.querySelector(SALIDA));
  }
  return false;
}

function teclaTutorial(e) {
  const g = $('.tuto-globo');
  if (!visible(g)) return false;
  if (e.key === 'Escape') return clic(g.querySelector('.tuto-saltar'));
  if (e.key === 'Enter' || e.key === 'ArrowRight') return clic(g.querySelector('.tuto-sig'));
  return false;
}

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // Capas con sus propias teclas: solo se agregan los números para elegir astronauta
  const tripu = $('.dos-capa');
  if (tripu) {
    const n = Number(e.key);
    if (n >= 1 && n <= 9) { const b = tripu.querySelectorAll('[data-astro]')[n - 1]; if (b) { e.preventDefault(); b.click(); } }
    return;
  }
  if ($('.cons-capa, .ubic-capa')) return;
  const cont = $('.cont-capa');
  if (cont) {
    if (e.key === 'Escape') { e.preventDefault(); clic(cont.querySelector('.cont-btn.si')); }
    return;
  }
  const alerta = $('#alertaSolar.visible');
  if (alerta && (e.key === 'Escape' || (e.key === 'Enter' && !modalAbierto()))) { e.preventDefault(); clic(alerta.querySelector('.as-ok')); return; }
  let hecho = false;
  if (modalAbierto()) hecho = teclaModal(e);
  else hecho = teclaTutorial(e);
  if (hecho) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);

// Foco automático cuando cambia el contenido de la ventana
let ultimo = null;
function enfocar() {
  if (!modalAbierto()) { ultimo = null; return; }
  const c = caja();
  if (c.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
  const destino = c.querySelector('.opcion:not(:disabled)') || c.querySelector(SALIDA);
  if (destino && destino !== ultimo) { ultimo = destino; destino.focus({ preventScroll: true }); }
}
const obs = new MutationObserver(() => setTimeout(enfocar, 0));
const iniciar = () => { const c = caja(); if (c) obs.observe(c, { childList: true }); };
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', iniciar); else iniciar();

// Pistas visibles de las teclas (solo con teclado físico: en táctil no se muestran)
const css = document.createElement('style');
css.textContent = `
  /* Teclas escritas en los botones. Se ocultan solo en pantallas táctiles sin ratón (celular, tablet). */
  kbd.tecla { display: inline-block; margin-left: 8px; padding: 2px 6px; border: 2px solid currentColor; border-radius: 6px;
    font: 800 12px/1.1 system-ui, sans-serif; vertical-align: middle; opacity: .85; background: rgba(255, 255, 255, .18); }
  .opcion kbd.tecla { display: inline-grid; place-items: center; min-width: 24px; height: 24px; margin: 0 8px 0 0; padding: 0 5px; font-size: 14px; }
  .dos-card kbd.tecla.dos-num { position: absolute; top: 8px; right: 10px; margin: 0; min-width: 26px; height: 26px; display: grid; place-items: center;
    padding: 0; font-size: 15px; background: #fff; color: var(--tinta, #2b1408); border-color: var(--tinta, #2b1408); box-shadow: 0 2px 0 var(--tinta, #2b1408); opacity: 1; }
  @media (hover: none) and (pointer: coarse) { kbd.tecla { display: none !important; } }
  #modal button:focus-visible, .opcion:focus-visible { outline: 4px solid #33c2d6; outline-offset: 2px; }`;
document.head.appendChild(css);
