// =====================================================================
//  🧱 MODO CONSTRUCCIÓN (tecla B o botón en el panel del hábitat)
//  El blindaje del hábitat se arma por secciones que GASTAN regolito de la base.
//  Cada sección reduce de verdad la radiación interior (dosis diaria y llamaradas):
//  la ventana muestra el antes → después de cada decisión. ESC cierra.
//  Se engancha solo (capa propia, estilos inyectados), como src/ui/ubicacion.js.
// =====================================================================
import { MISION } from '../sim/config.js';
import { construirSeccion, motivoNoConstruir, factorBlindaje, radiacionInterior, seccionesHechas, construirObra, motivoNoObra } from '../sim/motor.js';
import { beep } from './sonido.js';
import { esEN, onIdioma, setIdioma, t } from './i18n.js';

const L = (es, en) => esEN() ? en : es;
let ultimoMensaje = '';   // función o texto: se vuelve a generar al cambiar de idioma
// Mismo botón que la pantalla de inicio (modal-idioma + chip-btn)
export const botonIdioma = () => `<div class="modal-idioma"><button type="button" class="chip-btn" data-cambiar-idioma
  aria-label="${t('top.idioma.t')}">${esEN() ? '🌐 Español' : '🌐 English'}</button></div>`;
const SEC = () => MISION.construccion.secciones;
const OBRAS = () => MISION.construccion.obras || {};
// Pista corta: por qué cada sección protege distinto (fondo diario vs. llamaradas)
const pista = (id, s) => (s.proteccionLlamarada ?? 0) > s.proteccion
  ? L('Las partículas de las llamaradas llegan sobre todo desde arriba: el techo es el mejor escudo.',
      'Flare particles come mostly from above: the roof is the best shield.')
  : L('Los rayos cósmicos llegan de lado todos los días: las paredes frenan más la radiación de fondo.',
      'Cosmic rays come in from the sides every day: walls block more of the background radiation.');
const nombreSec = s => L(s.nombre, s.nombre_en);
// Cuánto protege una sección, como una barrita de 5 cuadros y una palabra (el % exacto queda en el title)
const nivelProteccion = p => Math.max(1, Math.min(5, Math.round(p / 0.08)));
const palabraNivel = n => n >= 4 ? L('mucho', 'a lot') : n === 3 ? L('bastante', 'quite a lot') : n === 2 ? L('algo', 'some') : L('poco', 'a little');
const medidor = (ic, nombre, p) => {
  const n = nivelProteccion(p);
  return `<div class="cons-prot" title="${L('Deja de entrar el', 'Blocks')} ${Math.round(p * 100)}%">
    <span class="cons-prot-n">${ic} ${nombre}</span>
    <span class="cons-medidor" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>
    <em>${palabraNivel(n)}</em></div>`;
};
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
  if (document.querySelector('.ubic-capa, .dos-capa')) return false;   // ubicación o selector de tripulación abiertos
  if (document.querySelector('#btnSol')?.disabled) return false;
  return true;
}

export function abrirConstruccion() {
  if (capa || !puedeAbrir()) return;
  capa = document.createElement('div');
  capa.className = 'cons-capa';
  capa.addEventListener('click', e => {
    // La capa tapa el botón ES/EN de arriba: esta ventana trae el suyo
    if (e.target.closest('[data-cambiar-idioma]')) return setIdioma(esEN() ? 'es' : 'en');
    if (e.target === capa || e.target.closest('.cons-cerrar')) return cerrarConstruccion();
    const b = e.target.closest('[data-construir]');
    if (b && !b.disabled) construir(b.dataset.construir);
    const o = e.target.closest('[data-obra]');
    if (o && !o.disabled) construirOtra(o.dataset.obra);
  });
  document.body.appendChild(capa);
  beep(660, 0.08);
  pintar();
}

export function cerrarConstruccion() {
  capa?.remove(); capa = null; ultimoMensaje = '';
}

// Botón ES/EN con la ventana abierta: se vuelve a pintar en el nuevo idioma (la partida no cambia)
onIdioma(() => { if (capa) pintar(ultimoMensaje); insertarBoton(); });

function construir(id) {
  const S = estado();
  const r = construirSeccion(S, id);
  if (!r.ok) { beep(220, 0.2, 'sawtooth'); return pintar(); }
  const s = SEC()[id];
  beep(990, 0.12, 'triangle');
  const msg = () => L(
    `✅ <b>${s.nombre}</b> construida (−${s.costo} 🟫). Radiación de cada sol: <b>${n2(r.antes.diaria)} → ${n2(r.despues.diaria)} mSv</b> · una llamarada ${LLAMARADA_EJEMPLO}: <b>${r.antes.llamarada} → ${r.despues.llamarada} mSv</b>.`,
    `✅ <b>${s.nombre_en}</b> built (−${s.costo} 🟫). Radiation each sol: <b>${n2(r.antes.diaria)} → ${n2(r.despues.diaria)} mSv</b> · a ${LLAMARADA_EJEMPLO} flare: <b>${r.antes.llamarada} → ${r.despues.llamarada} mSv</b>.`);
  // La bitácora guarda los dos idiomas: renderLog muestra texto_en en inglés
  const entra = Math.round(factorBlindaje(S) * 100);
  S.log.unshift({ sol: S.sol, tipo: 'tierra',
    texto: `🧱 Construiste: ${s.nombre} (−${s.costo} de regolito). Ahora entra el ${entra}% de la radiación.`,
    texto_en: `🧱 You built: ${s.nombre_en} (−${s.costo} regolith). Now ${entra}% of the radiation gets in.` });
  juego()?.refrescar?.();
  pintar(msg);
}

// Más obras con regolito (camas de cultivo, túnel, plataforma): no protegen de la radiación, ayudan de otra forma
function construirOtra(id) {
  const S = estado();
  const r = construirObra(S, id);
  if (!r.ok) { beep(220, 0.2, 'sawtooth'); return pintar(); }
  const o = OBRAS()[id];
  beep(990, 0.12, 'triangle');
  S.log.unshift({ sol: S.sol, tipo: 'tierra',
    texto: `🧱 Construiste: ${o.nombre} (−${o.costo} de regolito). ${o.efecto}`,
    texto_en: `🧱 You built: ${o.nombre_en} (−${o.costo} regolith). ${o.efecto_en}` });
  juego()?.refrescar?.();
  pintar(() => L(`✅ <b>${o.nombre}</b> construida (−${o.costo} 🟫). ${o.efecto}`, `✅ <b>${o.nombre_en}</b> built (−${o.costo} 🟫). ${o.efecto_en}`));
}

function tarjetasObras(S) {
  return Object.entries(OBRAS()).map(([id, o]) => {
    const motivo = motivoNoObra(S, id), faltan = o.costo - (S.regolito || 0);
    const boton = motivo === 'construida'
      ? `<span class="cons-hecha">✅ ${L('Construida', 'Built')}</span>`
      : `<button class="cons-btn" data-obra="${id}" ${motivo ? 'disabled' : ''}>
          ${motivo === 'faltaRegolito' ? L(`${faltan === 1 ? 'Te falta' : 'Te faltan'} ${faltan} de 🟫`, `You need ${faltan} more 🟫`) : L('🧱 Construir', '🧱 Build')}</button>`;
    return `<div class="cons-sec ${motivo === 'construida' ? 'hecha' : ''}" data-obra-tarjeta="${id}">
      <span class="cons-ic">${o.icono}</span>
      <div class="cons-txt"><b>${L(o.nombre, o.nombre_en)}</b>
        <small class="cons-costo">${L('Cuesta', 'Costs')} <b>🟫 ${o.costo} ${L('de regolito', 'regolith')}</b></small>
        <small class="cons-efecto">${L(o.efecto, o.efecto_en)}</small>
        <details class="mas"><summary>${L('¿Por qué?', 'Why?')}</summary>${L(o.pista, o.pista_en)}</details>
      </div>
      ${boton}
    </div>`;
  }).join('');
}

function pintar(mensajeArg = '') {
  if (!capa) return;
  ultimoMensaje = mensajeArg;
  const mensaje = typeof mensajeArg === 'function' ? mensajeArg() : mensajeArg;
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
          ${motivo === 'faltaRegolito' ? L(`${faltan === 1 ? 'Te falta' : 'Te faltan'} ${faltan} de 🟫`, `You need ${faltan} more 🟫`) : L('🧱 Construir', '🧱 Build')}</button>`;
    return `<div class="cons-sec ${motivo === 'construida' ? 'hecha' : ''}" data-sec="${id}">
      <span class="cons-ic">${s.icono}</span>
      <div class="cons-txt"><b>${nombreSec(s)}</b>
        <small class="cons-costo">${L('Cuesta', 'Costs')} <b>🟫 ${s.costo} ${L('de regolito', 'regolith')}</b></small>
        <div class="cons-protege"><small>${L('Protege de:', 'Protects from:')}</small>
          ${medidor('🌌', L('Radiación de cada día', 'Everyday radiation'), s.proteccion)}
          ${medidor('💥', L('Llamaradas solares', 'Solar flares'), s.proteccionLlamarada ?? s.proteccion)}</div>
        <details class="mas"><summary>${L('¿Por qué?', 'Why?')}</summary>${pista(id, s)}</details>
      </div>
      ${boton}
    </div>`;
  }).join('');

  capa.innerHTML = `
    <div class="cons-caja" role="dialog" aria-modal="true" aria-label="${L('Modo construcción', 'Build mode')}">
      <button class="cons-cerrar" aria-label="${L('Cerrar', 'Close')}">✕</button>
      ${botonIdioma()}
      <h2>🧱 ${L('Modo construcción', 'Build mode')}</h2>
      <p class="cons-intro">${L('Con el regolito que traes de afuera cubres el hábitat. Cada parte que construyes deja entrar menos radiación.', 'Use the regolith you bring back to cover the habitat. Every part you build lets in less radiation.')}</p>
      <div class="cons-estado">
        <div><span>🟫</span><b>${S.regolito || 0}</b><small>${L('regolito en la base', 'regolith in the base')}</small></div>
        <div><span>🧱</span><b>${hechas}/${total}</b><small>${L('secciones', 'sections')}</small></div>
        <div class="${pct > 70 ? 'alto' : pct > 50 ? 'medio' : 'bajo'}"><span>☢️</span><b>${pct}%</b><small>${L('de la radiación entra', 'of the radiation gets in')}</small></div>
        <div><span>📅</span><b>${n2(ahora.diaria)}</b><small>${L('mSv por sol adentro', 'mSv per sol inside')}</small></div>
      </div>
      <div class="cons-barra" title="${L('Radiación que entra al hábitat', 'Radiation getting into the habitat')}"><div style="width:${pct}%"></div></div>
      ${mensaje ? `<div class="cons-msg">${mensaje}</div>` : ''}
      <div class="cons-lista">${tarjetas}</div>
      ${Object.keys(OBRAS()).length ? `<h3 class="cons-sub">🏗️ ${L('Más obras con regolito', 'More things to build with regolith')}</h3>
      <p class="cons-intro">${L('Usan el mismo regolito que el blindaje. ¿Qué construyes primero?', 'They use the same regolith as the shield. What do you build first?')}</p>
      <div class="cons-lista">${tarjetasObras(S)}</div>` : ''}
      <p class="cons-pie">${hechas === total
        ? L('🏆 ¡Blindaje completo! Solo entra el 40% de la radiación.', '🏆 Shield complete! Only 40% of the radiation gets in.')
        : L('¿Te falta regolito? Sal a caminar a buscarlo.', 'Need more regolith? Go on a spacewalk to collect it.')}
        <br><small>${L('Números simplificados del juego.', 'Simplified game numbers.')}</small></p>
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
    <small>${L('Blindaje', 'Shield')} ${seccionesHechas(S)}/${Object.keys(SEC()).length} · ${L('Obras', 'Buildings')} ${Object.keys(OBRAS()).filter(id => S.obras?.[id]).length}/${Object.keys(OBRAS()).length} · 🟫 ${S.regolito || 0} ${L('de regolito', 'regolith')} · ${L(
      `☢️ entra ${Math.round(factorBlindaje(S) * 100)}% · ☀️ ${Math.round(factorBlindaje(S, 'llamarada') * 100)}% en llamaradas`,
      `☢️ ${Math.round(factorBlindaje(S) * 100)}% gets in · ☀️ ${Math.round(factorBlindaje(S, 'llamarada') * 100)}% in flares`)}</small>`;
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
  .cons-pista { opacity: .8; font-style: italic; }
  .cons-btn { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 900; font-size: 15px; color: #fff; cursor: pointer;
    background: linear-gradient(180deg, #f07a45, #c9481f); box-shadow: 0 3px 0 #7d2a10; min-width: 110px; }
  .cons-btn:disabled { background: #b9a59a; box-shadow: none; cursor: not-allowed; }
  .cons-hecha { font-weight: 900; color: #2e7d32; }
  .cons-pie { font-size: 13px; margin: 10px 0 0; }
  .cons-sub { margin: 14px 0 4px; font-size: 17px; }
  .cons-costo, .cons-efecto { display: block; font-size: 13px; margin-top: 2px; }
  .cons-protege { margin-top: 4px; }
  .cons-protege > small { font-size: 12px; opacity: .75; }
  .cons-prot { display: grid; grid-template-columns: minmax(150px, auto) auto 1fr; align-items: center; gap: 8px; font-size: 13px; }
  .cons-medidor { display: inline-flex; gap: 2px; }
  .cons-medidor i { width: 12px; height: 10px; border-radius: 2px; background: rgba(160,82,45,.2); }
  .cons-medidor i.on { background: #2e7d32; }
  .cons-prot em { font-style: normal; font-weight: 700; font-size: 12px; }
  .cons-formula { font-weight: 700; font-size: 15px; }
  .cons-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
  .cons-chips > span { background: rgba(160,82,45,.14); border-radius: 999px; padding: 2px 8px; font-size: 13px; font-weight: 700; }
  .cons-txt .mas { font-size: 12px; margin-top: 2px; }
  .btn-construccion kbd { font: inherit; font-size: 11px; border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; opacity: .8; }
  @media (max-width: 560px) {
    .cons-estado { grid-template-columns: 1fr 1fr; }
    .cons-sec { grid-template-columns: 32px 1fr; }
    .cons-sec > :last-child { grid-column: 1 / -1; width: 100%; }
  }`;
document.head.appendChild(css);
