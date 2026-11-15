// =====================================================================
//  🧱 MISIÓN GUIADA DE CONSTRUCCIÓN (opcional, después del tutorial o desde ❓)
//  salir a caminar → recoger 3 bolsas de regolito → volver (se depositan) →
//  abrir construcción (B o botón) → construir la Pared norte → ver cómo bajó la radiación.
//
//  El paso NO es una lista fija: se deduce del estado del juego en cada momento.
//  Así sigue funcionando si el niño hace las cosas en otro orden, si lo rescatan en la
//  caminata o si hoy no se puede salir (la misión espera al sol siguiente).
//  Es un módulo propio: main.js no lo cierra al salir a caminar (el tutorial sí se cierra).
//  Usa solo window.juego (S, mundo) y el DOM; no toca la simulación.
// =====================================================================
import { MISION } from '../sim/config.js';
import { motivoNoEVA, radiacionInterior } from '../sim/motor.js';
import { beep } from './sonido.js';
import { t, tr, esEN, onIdioma } from './i18n.js';

const L = (es, en) => esEN() ? en : es;
const CLAVE = 'survivalMars.misionConstruccion';
const juego = () => window.juego;
const n2 = v => (Math.round(v * 100) / 100).toLocaleString(esEN() ? 'en' : 'es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const visible = sel => { const el = document.querySelector(sel); return el && el.offsetParent !== null && !el.classList.contains('oculto') ? el : null; };
const modalAbierto = () => !document.querySelector('#modal')?.classList.contains('oculto');

export function misionHecha() { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } }
function marcarHecha() { try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ } }

let activa = null;    // la misión en curso (solo una a la vez)

// ---------------------------------------------------------------------
//  Pasos: cada uno con texto ES/EN y el elemento a señalar
// ---------------------------------------------------------------------
const PASOS = {
  intro: {
    texto: m => L(`🧱 <b>Misión: ¡proteger el hábitat!</b> La radiación del espacio atraviesa las paredes. Vamos a juntar <b>${m.costo} bolsas de regolito</b> (la tierra suelta de Marte) y construir la <b>${m.nombre()}</b>.`,
      `🧱 <b>Mission: protect the habitat!</b> Space radiation gets through the walls. Let's collect <b>${m.costo} bags of regolith</b> (loose Martian soil) and build the <b>${m.nombre()}</b>.`),
    boton: () => L('¡Vamos! ▶', "Let's go! ▶"),
  },
  esperar: {
    objetivo: () => '#btnSol',
    texto: m => L(`⏳ Hoy no se puede salir: ${tr(m.motivo)}. Termina el sol 🌙 y vuelve a intentarlo: la misión te espera.`,
      `⏳ You can't go out today: ${tr(m.motivo)}. End the sol 🌙 and try again: the mission will wait for you.`),
  },
  abrirRover: {
    objetivo: () => '.etiqueta[data-edificio="rover"]', abrir: 'rover',
    texto: () => L('🚙 Toca el <b>Rover</b> para salir a explorar.', '🚙 Tap the <b>Rover</b> to go exploring.'),
  },
  pulsarEva: {
    objetivo: () => '[data-accion="eva"]',
    texto: () => L('🧑‍🚀 Pulsa <b>«¡Salir a explorar!»</b>.', '🧑‍🚀 Press <b>"Go exploring!"</b>.'),
  },
  elegir: {
    objetivo: () => '.dos-ok',
    texto: () => L('👩‍🚀 Elige quién sale (mira su dosímetro) y pulsa el botón grande.', '👩‍🚀 Choose who goes out (check their dosimeter) and press the big button.'),
  },
  recoger: {
    objetivo: () => visible('#evaRecoger') ? '#evaRecoger' : null,
    texto: m => L(`🟫 Busca los <b>montoncitos naranjas</b> de regolito cerca de la base. Camina hasta uno (teclas WASD / flechas o el joystick) y pulsa <b>✋ Recoger</b> (o E). Llevas <b>${m.llevas}/${m.costo}</b>.`,
      `🟫 Look for the <b>orange piles</b> of regolith near the base. Walk to one (WASD / arrow keys or the joystick) and press <b>✋ Pick up</b> (or E). You have <b>${m.llevas}/${m.costo}</b>.`),
  },
  volver: {
    objetivo: () => visible('#evaEntrar') ? '#evaEntrar' : '#evaBase',
    texto: m => L(`🏠 ¡Ya tienes ${m.llevas}! Sigue la <b>flecha</b> hasta la puerta de la base y pulsa <b>Entrar</b> (o E). Las bolsas se guardan en la base.`,
      `🏠 You have ${m.llevas}! Follow the <b>arrow</b> to the base door and press <b>Go in</b> (or E). The bags are stored in the base.`),
  },
  abrirB: {
    objetivo: () => visible('.btn-construccion') ? '.btn-construccion' : '.etiqueta[data-edificio="habitat"]', abrir: 'habitat',
    texto: m => L(`🧱 ¡Tienes <b>${m.enBase} bolsas</b> en la base! Abre el <b>modo construcción</b>: pulsa la tecla <b>B</b> o el botón 🧱 del Hábitat.`,
      `🧱 You have <b>${m.enBase} bags</b> in the base! Open <b>build mode</b>: press the <b>B</b> key or the 🧱 button in the Habitat.`),
  },
  construir: {
    objetivo: m => `.cons-sec[data-sec="${m.id}"] .cons-btn`,
    texto: m => L(`👉 Pulsa <b>«Construir»</b> en la <b>${m.nombre()}</b>. Mira el antes → después de la radiación.`,
      `👉 Press <b>"Build"</b> on the <b>${m.nombre()}</b>. Look at the radiation before → after.`),
  },
  final: {
    objetivo: () => visible('.cons-msg') ? '.cons-msg' : null,
    texto: m => L(`🎉 ¡Construiste la <b>${m.nombre()}</b>! La radiación de cada sol dentro del hábitat bajó de <b>${n2(m.antes)} a ${n2(m.despues)} mSv</b>. Cada sección protege un poco más a la tripulación.`,
      `🎉 You built the <b>${m.nombre()}</b>! Radiation inside the habitat each sol went down from <b>${n2(m.antes)} to ${n2(m.despues)} mSv</b>. Each section protects the crew a little more.`),
    boton: () => L('¡Entendido! 🏆', 'Got it! 🏆'),
  },
};

// Qué paso toca según el estado actual del juego
function pasoActual(m) {
  const S = juego()?.S;
  if (!S) return 'intro';
  if (m.fase === 'intro') return 'intro';
  if (m.fase === 'final' || S.secciones?.[m.id]) {
    if (m.fase !== 'final') {   // recién construida: calcular el antes → después
      m.fase = 'final';
      m.despues = radiacionInterior(S).diaria;
      m.antes = radiacionInterior({ ...S, secciones: { ...S.secciones, [m.id]: false } }).diaria;
      beep(1320, 0.15, 'triangle');
    }
    return 'final';
  }
  if (document.querySelector('.cons-capa')) return 'construir';
  m.enBase = S.regolito || 0;
  if (m.enBase >= m.costo) return 'abrirB';
  if (S.enEVA) {
    m.llevas = juego()?.mundo?.eva?.items?.regolito || 0;
    return m.enBase + m.llevas >= m.costo ? 'volver' : 'recoger';
  }
  if (document.querySelector('.dos-caja')) return 'elegir';
  m.motivo = motivoNoEVA(S);
  if (m.motivo) return 'esperar';
  if (visible('[data-accion="eva"]')) return 'pulsarEva';
  return 'abrirRover';
}

// ---------------------------------------------------------------------
//  Globo y foco (mismos estilos que el tutorial, pero por encima de las ventanas)
// ---------------------------------------------------------------------
export function iniciarMisionConstruccion() {
  if (activa) return activa;
  const S = juego()?.S;
  const secs = MISION.construccion?.secciones || {};
  // La Pared norte; si ya está hecha, la primera sección que falte
  const id = !S?.secciones?.norte && secs.norte ? 'norte' : Object.keys(secs).find(k => !S?.secciones?.[k]);
  if (!S || !id) return null;
  const s = secs[id];
  const m = { id, costo: s.costo, nombre: () => (esEN() ? s.nombre_en : s.nombre), fase: 'intro', llevas: 0, enBase: 0 };

  const globo = document.createElement('div');
  globo.className = 'tuto-globo mc-globo';
  globo.setAttribute('role', 'status'); globo.setAttribute('aria-live', 'polite');
  const foco = document.createElement('div');
  foco.className = 'tuto-foco mc-foco';
  document.body.append(foco, globo);

  let paso = null, html = '';
  const dibujar = () => {
    const P = PASOS[paso];
    const nuevo = `<div class="tuto-txt">${P.texto(m)}</div>
      <div class="tuto-pie"><button class="tuto-saltar" data-mc="saltar">${paso === 'final' ? '' : L('Saltar misión', 'Skip mission')}</button>
      <span>🧱 ${L('Misión', 'Mission')}</span>
      ${P.abrir ? `<button class="tuto-abrir" data-sel="${P.abrir}">${L('Abrir', 'Open')} ${t('ed.' + P.abrir)}</button>` : ''}
      ${P.boton ? `<button class="tuto-sig" data-mc="ok">${P.boton()}</button>` : ''}</div>`;
    if (nuevo !== html) { globo.innerHTML = nuevo; html = nuevo; }
  };
  globo.addEventListener('click', e => {
    const b = e.target.closest('[data-mc]');
    if (!b) return;
    if (b.dataset.mc === 'saltar') return terminar(false);
    if (paso === 'intro') { m.fase = 'jugar'; beep(820, 0.06); tick(); }
    else if (paso === 'final') terminar(true);
  });

  function colocar() {
    const P = PASOS[paso];
    const sel = P.objetivo?.(m);
    const el = sel && document.querySelector(sel);
    const enEVA = document.body.classList.contains('modo-eva');
    if (!el || !el.getClientRects().length) {
      foco.style.display = 'none';
      // En la caminata, a la izquierda y debajo del tablero de recursos (el panel del traje ocupa el centro)
      // En celular el panel del traje sube arriba: el globo va ENCIMA del tablero de la base (afuera importa menos
      // que el oxígeno del traje) para no tapar el traje, el joystick ni los botones.
      const tab = document.querySelector('.tablero')?.getBoundingClientRect();
      const angosta = innerWidth < 760;
      const topEVA = !tab?.height ? 140 : angosta ? tab.top : tab.bottom + 10;
      Object.assign(globo.style, enEVA
        ? { left: angosta ? '8px' : '12px', top: Math.round(topEVA) + 'px', transform: 'none' }
        : { left: '50%', top: '96px', transform: 'translateX(-50%)' });
      return;
    }
    const r = el.getBoundingClientRect();
    foco.style.display = 'block';
    Object.assign(foco.style, { left: r.left - 8 + 'px', top: r.top - 8 + 'px', width: r.width + 16 + 'px', height: r.height + 16 + 'px' });
    const gw = globo.offsetWidth, gh = globo.offsetHeight;
    let top = r.bottom + 16;
    if (top + gh > innerHeight - 10) top = r.top - gh - 16;
    const left = Math.min(Math.max(10, r.left + r.width / 2 - gw / 2), innerWidth - gw - 10);
    Object.assign(globo.style, { left: left + 'px', top: Math.max(10, top) + 'px', transform: 'none' });
  }

  function tick() {
    // Mientras hay una ventana del juego (resumen del sol, emergencia…), la misión espera escondida
    const oculto = modalAbierto();
    globo.style.display = foco.style.display = oculto ? 'none' : '';
    if (oculto) return;
    const p = pasoActual(m);
    if (p !== paso) { paso = p; html = ''; if (p !== 'intro') beep(880, 0.05); }
    dibujar();
    colocar();
  }

  function terminar(completada) {
    clearInterval(timer);
    dejarIdioma();
    globo.remove(); foco.remove();
    if (completada) marcarHecha();
    activa = null;
  }

  const timer = setInterval(tick, 200);
  const dejarIdioma = onIdioma(() => { html = ''; tick(); });
  tick();
  activa = { terminar, activa: () => globo.isConnected };
  return activa;
}

// ---------------------------------------------------------------------
//  Ofrecer la misión al terminar el tutorial (espera a que el juego esté libre)
// ---------------------------------------------------------------------
export function ofrecerMisionConstruccion() {
  if (activa || document.querySelector('.mc-oferta')) return;
  const espera = setInterval(() => {
    const libre = juego()?.S && !modalAbierto() && !document.querySelector('#btnSol')?.disabled
      && !document.querySelector('.tuto-globo:not(.mc-globo)') && !juego().S.enEVA;
    if (!libre) return;
    clearInterval(espera);
    const o = document.createElement('div');
    o.className = 'tuto-globo mc-globo mc-oferta';
    const pintar = () => {
      o.innerHTML = `<div class="tuto-txt">${L('🧱 ¿Aprendemos a <b>construir el blindaje</b>? Juntarás regolito afuera y protegerás el hábitat de la radiación (5 pasos).',
        '🧱 Shall we learn to <b>build the shield</b>? You will collect regolith outside and protect the habitat from radiation (5 steps).')}</div>
        <div class="tuto-pie"><button class="tuto-saltar" data-o="no">${L('Más tarde (❓)', 'Later (❓)')}</button>
        <button class="tuto-sig" data-o="si">${L('¡Sí, vamos!', 'Yes, let’s go!')}</button></div>`;
    };
    pintar();
    const dejar = onIdioma(pintar);
    Object.assign(o.style, { left: '50%', top: '96px', transform: 'translateX(-50%)' });
    o.addEventListener('click', e => {
      const b = e.target.closest('[data-o]');
      if (!b) return;
      dejar(); o.remove();
      if (b.dataset.o === 'si') iniciarMisionConstruccion();
    });
    document.body.appendChild(o);
    beep(820, 0.06);
  }, 400);
}

// ---------------------------------------------------------------------
//  🎒 Botón Inventario de la barra superior (index.html → #btnInventario)
// ---------------------------------------------------------------------
async function abrirInventario() {
  const S = juego()?.S;
  // No encima de otra ventana, de la caminata ni de un sol en curso
  if (!S || S.enEVA || modalAbierto() || document.querySelector('#btnSol')?.disabled
    || document.querySelector('.cons-capa, .dos-capa')) { beep(220, 0.12, 'sawtooth'); return; }
  const { panelInventario } = await import('./modales.js');
  beep(760, 0.05);
  panelInventario(S);
}
function conectarInventario() {
  const b = document.querySelector('#btnInventario');
  if (b && !b.dataset.conectado) { b.dataset.conectado = '1'; b.addEventListener('click', abrirInventario); }
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', conectarInventario); else conectarInventario();

// Por encima de la ventana de construcción (z 30) y del selector de tripulación
const css = document.createElement('style');
css.textContent = `
  .mc-globo { z-index: 46; }
  .mc-foco { z-index: 45; }
  .mc-globo .tuto-saltar:empty { display: none; }
  body.modo-eva .mc-foco { box-shadow: none; }   /* en la caminata no oscurecer el terreno: hay que buscar regolito */
  @media (max-width: 760px) { .mc-globo { width: min(320px, calc(100% - 20px)); font-size: 14px; } }`;
document.head.appendChild(css);
