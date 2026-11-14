// HUD: tanques de recursos, ruta de la misión, panel del edificio, pronóstico de batería y bitácora.
// Principio: el niño ve FORMAS (cuánto se llena un tanque), no números. Los números van en el tooltip.
// Diseño de Jorge. Textos: t() interfaz, tr() textos de src/sim, txt() datos con *_en, L(es, en) textos nuevos.
import { MISION, SISTEMAS, RECURSOS } from '../sim/config.js';
import { ACCIONES, balance, preverSol, r1, clamp, enTormenta, enConjuncion } from '../sim/motor.js';
import { HALLAZGOS } from '../data/salud.js';
import { SITIO } from '../data/sitio.js';
import { t, tr, txt, esEN, campo } from './i18n.js';

const $ = s => document.querySelector(s);
const L = (es, en) => esEN() ? en : es;
const nombreEd = id => t('ed.' + id);
const infoEd = id => t('ed.' + id + '.i', { meta: MISION.metaCiencia });

// Información de cada edificio (los textos visibles salen de i18n: ed.<id> y ed.<id>.i)
export const EDIF = {
  habitat: { icono: '🏠', sistema: 'vital', acciones: ['eva', 'blindaje'] },
  invernadero: { icono: '🌱', sistema: 'invernadero', acciones: ['reparar'] },
  lab: { icono: '🔬', sistema: 'lab', acciones: [] },
  antena: { icono: '📡', sistema: 'radio', acciones: [] },
  paneles: { icono: '☀️', sistema: null, acciones: ['paneles', 'limpiar'] },
  bateria: { icono: '🔋', sistema: null, acciones: [] },
  reactor: { icono: '⚛️', sistema: null, acciones: [] },
  rover: { icono: '🚙', sistema: null, acciones: ['eva'] },
};
for (const id in EDIF) {
  Object.defineProperty(EDIF[id], 'nombre', { get: () => nombreEd(id), enumerable: true });
  Object.defineProperty(EDIF[id], 'info', { get: () => infoEd(id), enumerable: true });
}

// Tanques visibles. La tripulación se dibuja aparte (4 cascos).
const TANQUES = ['bateria', 'o2', 'comida', 'rad'];

export function renderRecursos(S) {
  renderRuta(S);
  const tanques = TANQUES.map(id => {
    const r = RECURSOS.find(x => x.id === id), max = r.max(), v = S[id];
    const pct = clamp(v / max * 100, 0, 100);
    const estado = r.inverso ? (pct > 70 ? 'peligro' : pct > 45 ? 'medio' : '') : (pct < 25 ? 'peligro' : pct < 50 ? 'medio' : '');
    const valor = `${r1(v)}${r.unidad === '%' ? '%' : ' ' + r.unidad}${r.inverso ? ' ' + L('de', 'of') + ' ' + max : ''}`;
    return `<div class="tanque t-${id} ${estado}" title="${tr(r.nombre)}: ${valor}. ${tr(r.ayuda)}">
      <div class="tq-vidrio"><div class="tq-liquido" style="height:${pct}%"></div>${r.inverso ? '<i class="tq-limite"></i>' : ''}</div>
      <span class="tq-ic">${r.icono}</span><small>${tr(r.nombre)}</small></div>`;
  }).join('');
  const cascos = Math.ceil(clamp(S.salud, 0, 100) / 25);
  const tripu = `<div class="tripulacion ${cascos <= 1 ? 'peligro' : ''}" title="${L('Tripulación', 'Crew')}: ${S.salud}%. ${L('Baja si falta oxígeno, comida o calor.', 'Goes down if oxygen, food or heat run short.')}">
      ${Array.from({ length: 4 }, (_, i) => `<span class="${i < cascos ? 'ok' : ''}">🧑‍🚀</span>`).join('')}</div>`;
  $('#recursos').innerHTML = tanques + tripu;

  const tags = [];
  if (enTormenta(S)) tags.push(t('tag.tormenta'));
  if (enConjuncion(S)) tags.push(t('tag.conj'));
  if (!S.paneles) tags.push(t('tag.plegados'));
  const elTags = $('#tags');
  if (elTags) elTags.innerHTML = tags.map(x => `<span>${x}</span>`).join('');
  renderPlan(S);
}

// Ruta de la misión: un casillero por sol. Los sucesos aparecen cuando Control de Misión los avisa.
function renderRuta(S) {
  const avisadoTormenta = S.sol >= 4, avisadaConj = S.sol >= 9;
  const celdas = Array.from({ length: MISION.maxSol }, (_, i) => {
    const n = i + 1;
    let marca = '';
    if (n === MISION.maxSol) marca = '🚀';
    else if (avisadoTormenta && MISION.tormenta.includes(n)) marca = '🌪️';
    else if (avisadaConj && MISION.conjuncion.includes(n)) marca = '🌞';
    const clase = n < S.sol ? 'hecho' : n === S.sol ? 'hoy' : '';
    return `<i class="${clase}" title="Sol ${n}">${marca}</i>`;
  }).join('');
  const ciencia = clamp(S.ciencia / MISION.metaCiencia * 100, 0, 100);
  $('#sol').innerHTML = `<div class="ruta-cab"><b>Sol ${S.sol}</b><small>${L('de', 'of')} ${MISION.maxSol}</small></div>
    <div class="ruta">${celdas}</div>
    <div class="meta-ciencia" title="${L(`Ciencia: ${S.ciencia} de ${MISION.metaCiencia} para la segunda estrella`, `Science: ${S.ciencia} of ${MISION.metaCiencia} for the second star`)}">
      🔬 <div class="barra"><div style="width:${ciencia}%"></div></div><b>${S.ciencia}/${MISION.metaCiencia}</b></div>`;
}

// Botón "Tarea del día": muestra el progreso de hoy; al tocarlo se abre la tarea completa (modales.panelTarea).
export function renderPlan(S) {
  const el = $('#btnTarea');
  if (!el) return;
  const p = S.plan;
  const hecho = p ? Math.min(S.inventario.hoy[p.tipo], p.cantidad) : 0;
  el.classList.toggle('sin', !p);
  el.classList.toggle('cumplido', !!p?.cumplido);
  el.innerHTML = `<small>${L('Tarea del día', 'Task of the day')}</small><b>${!p ? '—' : p.cumplido ? '✅' : `${MISION.eva.objetos[p.tipo].icono} ${hecho}/${p.cantidad}`}</b>`;
}

// Pronóstico de batería: celdas llenas = hoy; celdas rayadas = lo que gana (verde) o pierde (rojo) mañana.
export function renderEnergia(S) {
  const b = balance(S), CELDA = MISION.bateriaMax / 10;
  const hoy = Math.round(S.bateria / CELDA), manana = Math.round(b.manana / CELDA);
  const celdas = Array.from({ length: 10 }, (_, i) => {
    const c = i < Math.min(hoy, manana) ? 'llena' : i < manana ? 'gana' : i < hoy ? 'pierde' : '';
    return `<i class="${c}"></i>`;
  }).join('');
  const bal = r1(b.bal);
  $('#energia').title = L(`Produces ${r1(b.gen)} kWh y gastas ${r1(b.cons)} kWh. Mañana tendrás ${r1(b.manana)} de ${MISION.bateriaMax} kWh.`,
    `You make ${r1(b.gen)} kWh and use ${r1(b.cons)} kWh. Tomorrow you will have ${r1(b.manana)} of ${MISION.bateriaMax} kWh.`);
  $('#energia').className = `energia ${b.apagon ? 'apagon' : bal < 0 ? 'baja' : 'sube'}`;
  $('#energia').innerHTML = `<small>${b.apagon ? L('¡Apagón mañana!', 'Blackout tomorrow!') : L('Batería mañana', 'Battery tomorrow')}</small>
    <div class="pila">${celdas}</div>
    <b class="bal">${bal > 0 ? '+' : ''}${bal}</b>`;
}

// ---------------------------------------------------------------------
//  CONSOLA DE LA BASE — todo lo que se decide DENTRO del hábitat.
//  Se abre con "Control base" (sel = 'base') o tocando un edificio (sel = id del edificio):
//  en ese caso la consola abre con ese sistema resaltado.
// ---------------------------------------------------------------------
const FOCO = { habitat: 'vital', invernadero: 'invernadero', lab: 'lab', antena: 'radio',
  paneles: 'paneles', bateria: 'energia', reactor: 'energia', rover: 'puerta' };
let ultimoFoco = null;

export function renderPanel(S, sel) {
  const el = $('#panel');
  const abierta = !!sel;
  el.classList.toggle('vacio', !abierta);
  el.classList.toggle('consola', abierta);
  document.body.classList.toggle('en-consola', abierta);
  if (!abierta) {
    ultimoFoco = null;
    el.innerHTML = S.sol <= 2 ? `<p class="pista">${L('👆 Toca un edificio o abre <b>Control base</b>', '👆 Tap a building or open <b>Base control</b>')}</p>` : '';
    return;
  }
  const foco = FOCO[sel] || null;
  const e = EDIF[sel];
  el.innerHTML = `
    <div class="pantalla">
      <header class="con-cab">
        <span class="led"></span><b>${L('Consola de la base', 'Base console')}</b><small>${campo(SITIO, 'nombre')} · Sol ${S.sol}</small>
        <button class="cerrar" data-sel="" aria-label="${L('Volver afuera', 'Back outside')}">${L('Volver afuera ✕', 'Back outside ✕')}</button>
      </header>
      ${e ? `<p class="con-pista">${e.icono} <b>${e.nombre}:</b> ${e.info}</p>` : ''}
      <div class="con-grid">
        <section class="con-col">${colRecoleccion(S, foco)}</section>
        <section class="con-col con-centro">${colTripulante(S)}</section>
        <section class="con-col">${colEnergia(S, foco)}</section>
      </div>
    </div>`;
  if (foco && foco !== ultimoFoco) el.querySelector(`[data-foco="${foco}"]`)?.scrollIntoView({ block: 'nearest' });
  ultimoFoco = foco;
}

const accionBtn = (S, a) => {
  const A = ACCIONES[a];
  if (!A.visible(S)) return '';
  return `<button class="accion ${a === 'blindaje' && S.construir ? 'activa' : ''}" data-accion="${a}" ${A.activo(S) ? '' : 'disabled'}>
    <span>${tr(A.texto(S))}</span><small>${tr(A.detalle(S))}</small></button>`;
};

// Izquierda: lo que se trajo de afuera y la puerta para salir
function colRecoleccion(S, foco) {
  const filas = Object.entries(MISION.eva.objetos).map(([k, o]) => `
    <li style="--c:${o.color}" title="${tr(o.uso)}"><span>${o.icono}</span><b>${tr(o.nombre)}</b><em>${S.inventario.total[k]}</em></li>`).join('');
  const bolsas = MISION.eva.regolitoPorNivel;
  return `<h3>🎒 ${L('Recolección', 'Collected')}</h3>
    <ul class="con-inv">${filas}</ul>
    <div class="con-fila" title="${L(`Cada ${bolsas} bolsas de regolito cubren más el hábitat`, `Every ${bolsas} bags of regolith cover more of the habitat`)}">
      🧱 ${L('Blindaje', 'Shield')} <span class="cuadros">${Array.from({ length: 3 }, (_, i) => `<i class="${i < S.blindaje ? 'on' : ''}"></i>`).join('')}</span>
      <small>${S.blindaje < 3 ? `${L('bolsas', 'bags')} ${S.regolito}/${bolsas}` : L('¡completo!', 'complete!')}</small></div>
    <div class="con-fila">🧰 ${t('pan.repuestos')} <b>${S.repuestos}</b> · 💊 ${t('pan.botiquin')} <b>${S.botiquin}</b></div>
    <div class="con-puerta ${foco === 'puerta' ? 'foco' : ''}" data-foco="puerta">
      ${accionBtn(S, 'eva')}
    </div>`;
}

// Centro: el cuerpo del tripulante muestra las consecuencias de las decisiones
function colTripulante(S) {
  const rad = clamp(S.rad / MISION.radLimite * 100, 0, 100);
  const cascos = Math.ceil(clamp(S.salud, 0, 100) / 25);
  const estado = S.o2 < 25 ? { t: L('Le falta el aire', 'Short of air'), c: 'mal' }
    : S.comida <= 10 ? { t: L('Tiene mucha hambre', 'Very hungry'), c: 'mal' }
    : rad > 70 ? { t: L('Recibió mucha radiación', 'Got a lot of radiation'), c: 'mal' }
    : S.salud < 50 ? { t: L('Está cansado', 'Tired'), c: 'medio' }
    : { t: L('Se siente bien', 'Feeling good'), c: 'bien' };
  // El riesgo más grande decide qué estudio real se muestra
  const tema = rad > 25 ? 'radiacion' : S.comida < 40 ? 'comida' : 'radiacion';
  const lista = HALLAZGOS.filter(h => h.tema === tema);
  const h = lista[S.sol % lista.length];
  return `<h3>🧑‍🚀 ${L('Tripulante', 'Crew member')}</h3>
    <div class="cuerpo">
      ${SVG_ASTRONAUTA}
      <div class="dosimetro" title="${L('Radiación acumulada', 'Total radiation')}: ${S.rad} ${L('de', 'of')} ${MISION.radLimite} mSv">
        <div style="height:${rad}%"></div><i></i>
        <small>☢️<br>${r1(S.rad)}<br>mSv</small></div>
    </div>
    <div class="con-estado ${estado.c}">${estado.t}</div>
    <div class="con-vitales">
      <span title="${L('Oxígeno de la base', 'Base oxygen')}: ${S.o2}%">🫁<div class="barra o2"><div style="width:${clamp(S.o2, 0, 100)}%"></div></div></span>
      <span title="${L('Comida', 'Food')}: ${S.comida}%">🥔<div class="barra comida"><div style="width:${clamp(S.comida, 0, 100)}%"></div></div></span>
    </div>
    <div class="cascos" title="${L('Salud de la tripulación', 'Crew health')}: ${S.salud}%">${Array.from({ length: 4 }, (_, i) => `<span class="${i < cascos ? 'ok' : ''}">🧑‍🚀</span>`).join('')}</div>
    ${h ? `<a class="con-ciencia" href="${h.url}" target="_blank" rel="noopener">🧬 ${txt(h)} <b>${L('Estudio NASA', 'NASA study')} ${h.estudio} ↗</b></a>` : ''}`;
}

// Derecha: energía de mañana y los sistemas que la gastan
function colEnergia(S, foco) {
  const b = balance(S), pronostico = preverSol(S);
  const signo = n => n > 0 ? `+${n}` : String(n);
  const sistemas = Object.entries(SISTEMAS).map(([id, s]) => {
    const n = S.niveles[id];
    const malo = n < (id === 'vital' ? 2 : id === 'lab' ? 0 : 1);
    return `<div class="sis ${foco === id ? 'foco' : ''}" data-foco="${id}" title="${tr(s.desc)}">
      <div class="sis-cab">${s.icono} <b>${tr(s.nombre)}</b><small>⚡ ${r1(n * s.costo)}</small></div>
      <div class="control">
        <button class="nivel-btn" data-sis="${id}" data-d="-1" ${n <= 0 ? 'disabled' : ''} aria-label="${L('Menos energía para', 'Less power for')} ${tr(s.nombre)}">−</button>
        <div class="nivel-vis">${Array.from({ length: s.max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
        <button class="nivel-btn" data-sis="${id}" data-d="1" ${n >= s.max ? 'disabled' : ''} aria-label="${L('Más energía para', 'More power for')} ${tr(s.nombre)}">+</button>
      </div>
      <div class="nivel-txt ${malo ? 'malo' : ''}">${tr(s.niveles[n])}</div>
      ${id === 'invernadero' ? accionBtn(S, 'reparar') : ''}
      ${id === 'vital' ? accionBtn(S, 'blindaje') : ''}
    </div>`;
  }).join('');
  return `<h3>⚡ ${L('Energía', 'Power')}</h3>
    <div class="con-energia ${foco === 'energia' ? 'foco' : ''}" data-foco="energia">
      <div>☀️ ${r1(b.solar)} + ⚛️ ${MISION.nuclear} = <b>${L('produces', 'you make')} ${r1(b.gen)}</b></div>
      <div>${L('gastas', 'you use')} <b>${r1(b.cons)}</b> · 🔋 ${r1(S.bateria)} ${L('de', 'of')} ${MISION.bateriaMax}</div>
    </div>
    <div class="sis ${foco === 'paneles' ? 'foco' : ''}" data-foco="paneles">
      <div class="sis-cab">☀️ <b>${nombreEd('paneles')}</b><small>${L('limpios', 'clean')} ${Math.round(S.eficiencia * 100)}%</small></div>
      ${accionBtn(S, 'paneles')}${accionBtn(S, 'limpiar')}
    </div>
    <details class="pronostico" open>
      <summary>${L('Si terminas el sol ahora…', 'If you end the sol now…')}</summary>
      <p>${L('Con este plan, antes de nuevas emergencias:', 'With this plan, before any new emergencies:')}</p>
      <div class="pronostico-valores">🫁 ${signo(pronostico.oxigeno)} · 🥔 ${signo(pronostico.comida)} · 🔬 ${signo(pronostico.ciencia)}</div>
      ${pronostico.apagados.length ? `<p class="malo">${L('La energía no alcanza. Se reducirá:', 'There is not enough power. These will be reduced:')} ${pronostico.apagados.map(n => tr(n === 'la construcción' ? 'Construcción' : n[0].toUpperCase() + n.slice(1))).join(', ')}.</p>` : ''}
    </details>
    ${sistemas}`;
}

const SVG_ASTRONAUTA = `<svg class="astro" viewBox="0 0 120 150" aria-hidden="true">
  <rect x="30" y="62" width="60" height="58" rx="18" fill="#fff" stroke="#2b1408" stroke-width="4"/>
  <rect x="44" y="76" width="32" height="20" rx="4" fill="#e2582c" stroke="#2b1408" stroke-width="3"/>
  <rect x="12" y="66" width="22" height="44" rx="11" fill="#fff" stroke="#2b1408" stroke-width="4"/>
  <rect x="86" y="66" width="22" height="44" rx="11" fill="#fff" stroke="#2b1408" stroke-width="4"/>
  <rect x="36" y="116" width="20" height="28" rx="8" fill="#fff" stroke="#2b1408" stroke-width="4"/>
  <rect x="64" y="116" width="20" height="28" rx="8" fill="#fff" stroke="#2b1408" stroke-width="4"/>
  <circle cx="60" cy="38" r="30" fill="#fff" stroke="#2b1408" stroke-width="4"/>
  <rect x="38" y="24" width="44" height="28" rx="14" fill="#33c2d6" stroke="#2b1408" stroke-width="3"/>
  <rect x="46" y="29" width="10" height="6" rx="3" fill="#fff" opacity=".8"/>
</svg>`;

export function renderLog(S) {
  $('#bitacora').innerHTML = S.log.slice(0, 40).map(l => `<li class="${l.tipo}"><span class="log-sol">${l.sol}</span> ${tr(l.texto)}</li>`).join('');
}
