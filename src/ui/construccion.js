// =====================================================================
//  🧱 MODO CONSTRUCCIÓN (tecla B o botón en el panel del hábitat)
//  El blindaje del hábitat se arma por secciones que GASTAN regolito de la base.
//  Cada sección reduce de verdad la radiación interior (dosis diaria y llamaradas):
//  la ventana muestra el antes → después de cada decisión. ESC cierra.
//  Se engancha solo (capa propia, estilos inyectados), como src/ui/ubicacion.js.
// =====================================================================
import { MISION } from '../sim/config.js';
import { construirSeccion, motivoNoConstruir, factorBlindaje, radiacionInterior, seccionesHechas } from '../sim/motor.js';
import { beep } from './sonido.js';

const L = (es, en) => document.documentElement.lang === 'en' ? en : es;
const SEC = () => MISION.construccion.secciones;
const nombreSec = s => L(s.nombre, s.nombre_en);
const n2 = v => (Math.round(v * 100) / 100).toLocaleString(L('es', 'en'), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const juego = () => window.juego;
const estado = () => juego()?.S;
const LLAMARADA_EJEMPLO = 'X1.0';

let capa = null;

// Se puede abrir solo en la base: sin caminata, sin otra ventana abierta y sin un sol en curso
function puedeAbrir() {
  const S = estado();
  if (!S || S.enEVA) return false;
  if (!document.querySelector('#modal')?.classList.contains('oculto')) return false;
  if (document.querySelector('.ubic-capa')) return false;
  if (document.querySelector('#btnSol')?.disabled) return false;
  return true;
}

export function abrirConstruccion() {
  if (capa || !puedeAbrir()) return;
  capa = document.createElement('div');
  capa.className = 'cons-capa';
  capa.addEventListener('click', e => {
    if (e.target === capa || e.target.closest('.cons-cerrar')) return cerrarConstruccion();
    const b = e.target.closest('[data-construir]');
    if (b && !b.disabled) construir(b.dataset.construir);
  });
  document.body.appendChild(capa);
  beep(660, 0.08);
  pintar();
}

export function cerrarConstruccion() {
  capa?.remove(); capa = null;
}

function construir(id) {
  const S = estado();
  const r = construirSeccion(S, id);
  if (!r.ok) { beep(220, 0.2, 'sawtooth'); return pintar(); }
  const s = SEC()[id];
  beep(990, 0.12, 'triangle');
  const msg = L(
    `✅ <b>${s.nombre}</b> construida (−${s.costo} 🟫). Radiación de cada sol: <b>${n2(r.antes.diaria)} → ${n2(r.despues.diaria)} mSv</b> · una llamarada ${LLAMARADA_EJEMPLO}: <b>${r.antes.llamarada} → ${r.despues.llamarada} mSv</b>.`,
    `✅ <b>${s.nombre_en}</b> built (−${s.costo} 🟫). Radiation each sol: <b>${n2(r.antes.diaria)} → ${n2(r.despues.diaria)} mSv</b> · a ${LLAMARADA_EJEMPLO} flare: <b>${r.antes.llamarada} → ${r.despues.llamarada} mSv</b>.`);
  S.log.unshift({ sol: S.sol, tipo: 'tierra', texto: L(
    `🧱 Construiste: ${s.nombre} (−${s.costo} bolsas de regolito). Ahora entra el ${Math.round(factorBlindaje(S) * 100)}% de la radiación.`,
    `🧱 You built: ${s.nombre_en} (−${s.costo} bags of regolith). Now ${Math.round(factorBlindaje(S) * 100)}% of the radiation gets in.`) });
  juego()?.refrescar?.();
  pintar(msg);
}

function pintar(mensaje = '') {
  if (!capa) return;
  const S = estado();
  const ahora = radiacionInterior(S, LLAMARADA_EJEMPLO);
  const pct = Math.round(factorBlindaje(S) * 100);
  const total = Object.keys(SEC()).length, hechas = seccionesHechas(S);
  const tarjetas = Object.entries(SEC()).map(([id, s]) => {
    const motivo = motivoNoConstruir(S, id);
    // Cómo quedaría la radiación si se construye esta sección (antes → después)
    const prueba = { ...S, secciones: { ...S.secciones, [id]: true } };
    const despues = radiacionInterior(prueba, LLAMARADA_EJEMPLO);
    const faltan = s.costo - (S.regolito || 0);
    const boton = motivo === 'construida'
      ? `<span class="cons-hecha">✅ ${L('Construida', 'Built')}</span>`
      : `<button class="cons-btn" data-construir="${id}" ${motivo ? 'disabled' : ''}>
          ${motivo === 'faltaRegolito' ? L(`Faltan ${faltan} 🟫`, `${faltan} more 🟫 needed`) : L('🧱 Construir', '🧱 Build')}</button>`;
    return `<div class="cons-sec ${motivo === 'construida' ? 'hecha' : ''}" data-sec="${id}">
      <span class="cons-ic">${s.icono}</span>
      <div class="cons-txt"><b>${nombreSec(s)}</b>
        <small>${L('Coste', 'Cost')}: <b>${s.costo} ${L('bolsas', 'bags')} 🟫</b> · ${L('Protección', 'Protection')} <b>+${Math.round(s.proteccion * 100)}%</b></small>
        ${motivo === 'construida' ? '' : `<small class="cons-prev">☢️ ${L('Cada sol', 'Each sol')}: ${n2(ahora.diaria)} → <b>${n2(despues.diaria)} mSv</b> · ${L('llamarada', 'flare')} ${LLAMARADA_EJEMPLO}: ${ahora.llamarada} → <b>${despues.llamarada} mSv</b></small>`}
      </div>
      ${boton}
    </div>`;
  }).join('');

  capa.innerHTML = `
    <div class="cons-caja" role="dialog" aria-modal="true" aria-label="${L('Modo construcción', 'Build mode')}">
      <button class="cons-cerrar" aria-label="${L('Cerrar', 'Close')}">✕</button>
      <h2>🧱 ${L('Modo construcción', 'Build mode')}</h2>
      <p class="cons-intro">${L(
        'Cubre el hábitat con <b>regolito</b> (la tierra suelta de Marte). Cada sección frena parte de la radiación que entra. Elige cuál construir: cada una gasta bolsas que juntaste en las caminatas.',
        'Cover the habitat with <b>regolith</b> (loose Martian soil). Each section blocks part of the radiation that gets in. Choose which one to build: each one uses bags you collected on spacewalks.')}</p>
      <div class="cons-estado">
        <div><span>🟫</span><b>${S.regolito || 0}</b><small>${L('bolsas en la base', 'bags in the base')}</small></div>
        <div><span>🧱</span><b>${hechas}/${total}</b><small>${L('secciones', 'sections')}</small></div>
        <div class="${pct > 70 ? 'alto' : pct > 50 ? 'medio' : 'bajo'}"><span>☢️</span><b>${pct}%</b><small>${L('de la radiación entra', 'of the radiation gets in')}</small></div>
        <div><span>📅</span><b>${n2(ahora.diaria)}</b><small>${L('mSv por sol adentro', 'mSv per sol inside')}</small></div>
      </div>
      <div class="cons-barra" title="${L('Radiación que entra al hábitat', 'Radiation getting into the habitat')}"><div style="width:${pct}%"></div></div>
      ${mensaje ? `<div class="cons-msg">${mensaje}</div>` : ''}
      <div class="cons-lista">${tarjetas}</div>
      <p class="cons-pie">${hechas === total
        ? L('🏆 ¡Blindaje completo! Solo entra el 40% de la radiación.', '🏆 Shield complete! Only 40% of the radiation gets in.')
        : L('🧑‍🚀 ¿Te falta regolito? Sal a explorar desde el Hábitat o el Rover: está cerca de la base (pero afuera gastas oxígeno y recibes radiación).',
            '🧑‍🚀 Need more regolith? Go exploring from the Habitat or the Rover: it is near the base (but outside you use oxygen and get radiation).')}
        <br><small>${L('Valores simplificados del juego: con todo el blindaje entra el 40% (regla educativa, no una medición).', 'Simplified game values: with the full shield 40% gets in (an educational rule, not a measurement).')}</small></p>
      <button class="btn-grande cons-cerrar">${L('Listo (Esc)', 'Done (Esc)')}</button>
    </div>`;
}

// ---------------------------------------------------------------------
//  Atajos: B abre/cierra · Esc cierra
// ---------------------------------------------------------------------
addEventListener('keydown', e => {
  if (e.target?.closest?.('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'Escape' && capa) { cerrarConstruccion(); return; }
  if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (capa) cerrarConstruccion(); else abrirConstruccion();
  }
});

// Botón en el panel del hábitat (para celular y para quien no use teclado)
function insertarBoton() {
  const S = estado();
  const vital = document.querySelector('#panel .sis[data-foco="vital"]');
  if (!S || !vital) return;
  let b = vital.querySelector('.btn-construccion');
  if (!b) {
    b = document.createElement('button');
    b.className = 'accion btn-construccion';
    b.type = 'button';
    b.addEventListener('click', e => { e.stopPropagation(); abrirConstruccion(); });
    vital.appendChild(b);
  }
  const html = `<span>🧱 ${L('Modo construcción', 'Build mode')} <kbd>B</kbd></span>
    <small>${L('Blindaje', 'Shield')} ${seccionesHechas(S)}/${Object.keys(SEC()).length} · 🟫 ${S.regolito || 0} ${L('bolsas', 'bags')} · ☢️ ${Math.round(factorBlindaje(S) * 100)}% ${L('entra', 'gets in')}</small>`;
  if (b.innerHTML !== html) b.innerHTML = html;
}
let pendiente = false;
new MutationObserver(() => {
  if (pendiente) return;
  pendiente = true;
  setTimeout(() => { pendiente = false; insertarBoton(); }, 80);
}).observe(document.body, { childList: true, subtree: true });

// Estilos propios
const css = document.createElement('style');
css.textContent = `
  .cons-capa { position: fixed; inset: 0; z-index: 30; background: rgba(10,4,2,.55); display: grid; place-items: center; padding: 12px; }
  .cons-caja { position: relative; width: min(640px, 100%); max-height: 92vh; overflow-y: auto; background: var(--panel, #fff7ef);
    color: var(--texto, #2b140c); border-radius: 20px; padding: 18px; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
  .cons-caja h2 { margin: 0 0 6px; }
  .cons-cerrar:not(.btn-grande) { position: absolute; top: 10px; right: 12px; border: 0; background: none; font-size: 20px; cursor: pointer; color: inherit; }
  .cons-intro { margin: 0 0 10px; font-size: 14px; }
  .cons-estado { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .cons-estado div { background: rgba(160,82,45,.12); border-radius: 12px; padding: 8px 4px; text-align: center; }
  .cons-estado span { display: block; font-size: 22px; }
  .cons-estado b { display: block; font-size: 18px; }
  .cons-estado small { font-size: 11px; opacity: .8; }
  .cons-estado .alto b { color: #c62828; } .cons-estado .medio b { color: #b26a00; } .cons-estado .bajo b { color: #2e7d32; }
  .cons-barra { height: 10px; border-radius: 999px; background: rgba(46,125,50,.25); overflow: hidden; margin: 10px 0; }
  .cons-barra div { height: 100%; background: linear-gradient(90deg, #f0a030, #d84315); transition: width .5s; }
  .cons-msg { background: rgba(46,125,50,.14); border-left: 5px solid #2e7d32; border-radius: 10px; padding: 8px 10px; font-size: 14px; margin-bottom: 8px; }
  .cons-lista { display: grid; gap: 8px; }
  .cons-sec { display: grid; grid-template-columns: 40px 1fr auto; gap: 10px; align-items: center; border: 2px solid rgba(160,82,45,.35);
    border-radius: 14px; padding: 8px 10px; }
  .cons-sec.hecha { border-color: #2e7d32; background: rgba(46,125,50,.08); }
  .cons-ic { font-size: 26px; text-align: center; }
  .cons-txt small { display: block; font-size: 12px; margin-top: 2px; }
  .cons-prev { color: #8a4b12; }
  .cons-btn { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 900; font-size: 15px; color: #fff; cursor: pointer;
    background: linear-gradient(180deg, #f07a45, #c9481f); box-shadow: 0 3px 0 #7d2a10; min-width: 110px; }
  .cons-btn:disabled { background: #b9a59a; box-shadow: none; cursor: not-allowed; }
  .cons-hecha { font-weight: 900; color: #2e7d32; }
  .cons-pie { font-size: 13px; margin: 10px 0 0; }
  .btn-construccion kbd { font: inherit; font-size: 11px; border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; opacity: .8; }
  @media (max-width: 560px) {
    .cons-estado { grid-template-columns: 1fr 1fr; }
    .cons-sec { grid-template-columns: 32px 1fr; }
    .cons-sec > :last-child { grid-column: 1 / -1; width: 100%; }
  }`;
document.head.appendChild(css);
