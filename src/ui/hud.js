// HUD: tanques de recursos, ruta de la misión, panel del edificio, pronóstico de batería y bitácora.
// Formas y valores visibles para relacionar cada decisión con sus consecuencias.
// Diseño de Jorge. Textos: t() interfaz, tr() textos de src/sim, txt() datos con *_en, L(es, en) textos nuevos.
import { MISION, SISTEMAS, RECURSOS } from '../sim/config.js';
import { ACCIONES, balance, preverSol, r1, clamp, enTormenta, enConjuncion, seccionesHechas } from '../sim/motor.js';
import { HALLAZGOS } from '../data/salud.js';
import { t, tr, txt, esEN } from './i18n.js';

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
      <span class="tq-ic">${r.icono}</span><small>${tr(r.nombre)}<b class="tq-valor">${r1(v)}${r.unidad === '%' ? '%' : ' ' + r.unidad}</b></small></div>`;
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

// Cada edificio abre solo sus controles. Control base es el menú general.
export function renderPanel(S, sel) {
  const el = $('#panel'), abierta = !!sel;
  el.classList.toggle('vacio', !abierta);
  el.classList.toggle('consola', abierta);
  el.classList.toggle('edificio', abierta && sel !== 'base');
  document.body.classList.toggle('en-consola', abierta);
  document.body.classList.toggle('en-edificio', abierta && sel !== 'base');
  el.dataset.panel = sel || '';
  if (!abierta) {
    el.innerHTML = S.sol <= 2 ? `<p class="pista">${L('Objetivo: conserva aire y comida, consigue ciencia y termina el sol. Abre un edificio o Control base.', 'Goal: keep air and food available, collect science and end the sol. Open a building or Base control.')}</p>` : '';
    return;
  }
  const e = EDIF[sel];
  const titulo = e ? `${e.icono} ${e.nombre}` : sel === 'tripulacion' ? L('🧑‍🚀 Tripulación', '🧑‍🚀 Crew') : sel === 'inventario' ? L('🎒 Inventario', '🎒 Inventory') : L('🖥️ Control base', '🖥️ Base control');
  let contenido;
  if (sel === 'base') contenido = `<p>${L('Elige qué quieres gestionar. Cada edificio tiene sus propios controles.', 'Choose what to manage. Each building has its own controls.')}</p>
    <nav class="edificios-menu" aria-label="${L('Edificios y estado', 'Buildings and status')}">
      ${Object.entries(EDIF).map(([id, e]) => `<button data-sel="${id}"><span>${e.icono}</span><b>${e.nombre}</b><small>${proposito(id)}</small></button>`).join('')}
      <button data-sel="tripulacion"><span>🧑‍🚀</span><b>${L('Tripulación', 'Crew')}</b><small>${L('Salud y radiación', 'Health and radiation')}</small></button>
      <button data-sel="inventario"><span>🎒</span><b>${L('Inventario', 'Inventory')}</b><small>${L('Qué recogiste y para qué sirve', 'What you collected and how to use it')}</small></button>
    </nav>${resumenEnergia(S)}`;
  else if (sel === 'tripulacion') contenido = `${colTripulante(S)}<p class="estado-numeros">🫁 ${S.o2}% · 🥔 ${S.comida}% · ❤️ ${S.salud}% · ☢️ ${S.rad} mSv</p><p>${L('La comida baja reduce la salud. La radiación se acumula: el refugio y el blindaje ayudan a protegerte.', 'Low food reduces health. Radiation builds up: shelter and shielding help protect you.')}</p>`;
  else if (sel === 'inventario') contenido = `${colRecoleccion(S)}<div class="inventario-explica">${Object.values(MISION.eva.objetos).map(o => `<details><summary>${o.icono} ${tr(o.nombre)}</summary><p>${tr(o.que)}</p><p>${tr(o.uso)}</p></details>`).join('')}</div>`;
  else contenido = contenidoEdificio(S, sel);
  el.innerHTML = `<div class="pantalla">
    <header class="con-cab"><b>${titulo}</b><button class="cerrar" data-sel="" aria-label="${t('cerrar')}">✕</button></header>
    <section class="edificio-contenido">${e ? `<p class="edificio-proposito">${proposito(sel)}</p>` : ''}${contenido}</section>
    ${sel === 'base' ? '' : `<button class="panel-volver" data-sel="base">${L('← Todos los edificios', '← All buildings')}</button>`}
  </div>`;
}

function proposito(id) {
  return {
    habitat: L('Fabrica aire y protege de la radiación.', 'Makes air and shields the crew from radiation.'),
    invernadero: L('Cultiva la comida que la tripulación consume cada sol.', 'Grows the food the crew eats every sol.'),
    lab: L('Convierte energía en puntos de ciencia.', 'Turns power into science points.'),
    antena: L('Recibe avisos, tareas y respuestas de la Tierra.', 'Receives alerts, tasks and replies from Earth.'),
    paneles: L('Producen energía solar; el polvo reduce su rendimiento.', 'Generate solar power; dust reduces their output.'),
    bateria: L('Guarda energía para cuando falta producción.', 'Stores power for times when generation is too low.'),
    reactor: L('Produce energía incluso de noche y durante tormentas.', 'Generates power at night and during storms.'),
    rover: L('Sal a explorar: recoge muestras y vuelve antes de quedarte sin aire.', 'Go exploring: collect samples and return before your air runs out.'),
  }[id] || '';
}

function contenidoEdificio(S, id) {
  const e = EDIF[id], p = preverSol(S), signo = n => n > 0 ? `+${n}` : String(n);
  if (!e) return '';
  let detalle = '';
  if (id === 'habitat') detalle = `<p class="resultado-plan">🫁 ${L('Oxígeno al terminar el sol', 'Oxygen when the sol ends')}: <b>${signo(p.oxigeno)}</b></p><p>${L('Menos potencia ahorra energía, pero puede reducir el oxígeno. El blindaje también consume energía mientras se construye.', 'Lower power saves energy, but may reduce oxygen. Building shielding also uses power.')}</p>`;
  if (id === 'invernadero') detalle = resumenComida(S, p);
  if (id === 'lab') detalle = `<p class="resultado-plan">🔬 ${L('Ciencia al terminar el sol', 'Science when the sol ends')}: <b>+${p.ciencia}</b> · ⚡ ${S.niveles.lab * SISTEMAS.lab.costo} kWh</p><p>${L('Los experimentos usan energía que también necesita el soporte vital. Sin energía o con la tripulación en el refugio, no hay ciencia del laboratorio.', 'Experiments use power that life support also needs. The lab makes no science without power or while the crew is sheltering.')}</p>`;
  if (id === 'antena') detalle = comunicacionesHTML(S, p);
  if (id === 'paneles') detalle = `<p class="resultado-plan">☀️ ${L('Producción', 'Generation')}: <b>${r1(balance(S).solar)} kWh</b> · ${L('Limpieza', 'Cleanliness')}: ${Math.round(S.eficiencia * 100)}%</p><p>${L('Retraerlos los protege del polvo, pero dejan de producir energía. Limpiarlos requiere salir y recibir radiación.', 'Retracting protects them from dust, but they stop generating power. Cleaning them requires going outside and receiving radiation.')}</p>`;
  if (id === 'bateria' || id === 'reactor') detalle = resumenEnergia(S);
  if (id === 'rover') detalle = `<p>${L('El traje consume oxígeno cada segundo. Regolito → blindaje; hielo → oxígeno; rocas → ciencia. Los recursos se entregan al volver: un rescate pierde lo recogido.', 'The suit uses oxygen every second. Regolith → shielding; ice → oxygen; rocks → science. Resources are delivered when you return; a rescue loses the collected items.')}</p>`;
  const control = e.sistema ? controlSistema(S, e.sistema) : e.acciones.map(a => accionBtn(S, a)).join('');
  return control + detalle + (p.apagados.length && e.sistema && p.niv[e.sistema] < S.niveles[e.sistema] ? `<p class="aviso-sistema">${L('⚠️ Tu plan consume más energía de la disponible: este sistema trabajará a menor potencia.', '⚠️ Your plan needs more power than is available: this system will run at lower power.')}</p>` : '');
}

function resumenComida(S, p) {
  const deficit = MISION.consumoComida - p.cosecha;
  const duracion = deficit > 0 ? Math.ceil(S.comida / deficit) : null;
  return `<div class="resultado-plan"><b>🥔 ${L('Reservas', 'Reserves')}: ${S.comida}%</b>
    <p>${L('Cosechas', 'You harvest')} <b>${p.cosecha}</b> · ${L('consumes', 'you use')} <b>${MISION.consumoComida}</b> ${L('por sol', 'per sol')} → <b>${p.comida > 0 ? '+' : ''}${p.comida}</b></p>
    <p>${duracion !== null ? L(`A este ritmo, las reservas duran unos ${duracion} sols.`, `At this rate, reserves last about ${duracion} sols.`) : L('A este ritmo produces al menos lo que consumes.', 'At this rate, you grow at least as much as you eat.')}</p></div>
    <p>${L(`Con ${MISION.comidaBaja}% o menos, el hambre cuesta ${MISION.penalizacionHambre} de salud por sol; sin comida cuesta 10. Sube la cosecha para recuperar reservas, a cambio de más energía.`, `At ${MISION.comidaBaja}% or below, hunger costs ${MISION.penalizacionHambre} health per sol; with no food it costs 10. Grow more food to rebuild reserves, at the cost of more power.`)}</p>
    <small>${L('Estimación del juego con el plan actual, antes de nuevas emergencias.', 'Game estimate with the current plan, before new emergencies.')}</small>`;
}

function comunicacionesHTML(S, p) {
  const conj = enConjuncion(S), apagada = p.niv.radio === 0;
  const estado = conj ? L('🌞 Sin contacto: conjunción solar', '🌞 No contact: solar conjunction') : apagada ? L('📡 Antena sin energía', '📡 Antenna has no power') : L('📡 Recibiendo mensajes', '📡 Receiving messages');
  return `<div class="resultado-plan"><b>${estado}</b><p>${L('Mensajes pendientes', 'Pending replies')}: ${S.pendientes.length} · ${L('Retraso por trayecto', 'One-way delay')}: ${MISION.delayMin} min</p></div>
    <p>${L('Nivel 0: ahorras energía, pero no recibes nuevas tareas ni avisos. Nivel 1: recibes avisos, tareas y respuestas. Nivel 2: añade videollamadas que recuperan hasta 2 de salud por sol si no está al máximo.', 'Level 0: saves power, but receives no new tasks or alerts. Level 1: receives alerts, tasks and replies. Level 2: adds video calls that restore up to 2 health per sol when health is below maximum.')}</p>
    <p>${conj ? L('Durante la conjunción no hay contacto, aunque la antena esté encendida.', 'During conjunction there is no contact, even with the antenna on.') : apagada ? L('Los mensajes pendientes esperan a que vuelva la conexión. Enciende la antena para recibirlos al iniciar el próximo sol.', 'Pending replies wait for the connection to return. Turn on the antenna to receive them at the start of the next sol.') : L('Los mensajes nuevos llegan al empezar el sol. La ayuda no llega a tiempo para una emergencia de segundos.', 'New messages arrive at the start of a sol. Help cannot arrive in time for an emergency lasting seconds.')}</p>
    ${S.niveles.radio >= 2 && S.salud >= 100 ? `<p>${L('❤️ Salud al máximo: la videollamada no añade más salud hoy.', '❤️ Health is already full: a video call adds no extra health today.')}</p>` : ''}
    <h3>${L('Bandeja de mensajes', 'Message inbox')}</h3>
    <ul class="mensajes-radio">${S.mensajes.slice(-3).reverse().map(m => `<li><b>Sol ${m.sol} · ${m.tipo === 'respuesta' ? L('Respuesta recibida', 'Reply received') : L('Aviso recibido', 'Alert received')}</b><p>${tr(m.texto)}</p></li>`).join('') || `<li>${L('Todavía no hay mensajes recibidos.', 'No messages have arrived yet.')}</li>`}</ul>`;
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
  const hechas = seccionesHechas(S), total = Object.keys(MISION.construccion?.secciones || {}).length || 4;
  return `<h3>🎒 ${L('Recolección', 'Collected')}</h3>
    <ul class="con-inv">${filas}</ul>
    <div class="con-fila" title="${L('Construye secciones de blindaje con el modo construcción (tecla B)', 'Build shield sections with build mode (B key)')}">
      🧱 ${L('Blindaje', 'Shield')} <span class="cuadros">${Array.from({ length: total }, (_, i) => `<i class="${i < hechas ? 'on' : ''}"></i>`).join('')}</span>
      <small>${hechas < total ? `${hechas}/${total} · 🟫 ${S.regolito} ${L('bolsas en la base', 'bags in the base')}` : L('¡completo!', 'complete!')}</small></div>
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
    : S.comida <= MISION.comidaBaja ? { t: L('Tiene mucha hambre', 'Very hungry'), c: 'mal' }
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

function controlSistema(S, id) {
  const s = SISTEMAS[id], n = S.niveles[id];
  return `<div class="sis" data-foco="${id}">
    <div class="sis-cab">${s.icono} <b>${tr(s.nombre)}</b><small>⚡ ${r1(n * s.costo)} kWh</small></div>
    <div class="control">
      <button class="nivel-btn" data-sis="${id}" data-d="-1" ${n <= 0 ? 'disabled' : ''} aria-label="${L('Menos energía para', 'Less power for')} ${tr(s.nombre)}">−</button>
      <div class="nivel-vis">${Array.from({ length: s.max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
      <button class="nivel-btn" data-sis="${id}" data-d="1" ${n >= s.max ? 'disabled' : ''} aria-label="${L('Más energía para', 'More power for')} ${tr(s.nombre)}">+</button>
    </div><p class="nivel-txt">${tr(s.niveles[n])}</p>
    ${id === 'invernadero' ? accionBtn(S, 'reparar') : ''}${id === 'vital' ? accionBtn(S, 'blindaje') : ''}
  </div>`;
}

function resumenEnergia(S) {
  const b = balance(S), p = preverSol(S), signo = n => n > 0 ? `+${n}` : String(n);
  return `<div class="resultado-plan"><b>⚡ ${L('Energía del plan', 'Power budget')}</b>
    <p>☀️ ${r1(b.solar)} + ⚛️ ${MISION.nuclear} = ${L('produces', 'you generate')} ${r1(b.gen)} kWh</p>
    <p>${L('Gastas', 'You use')} ${r1(b.cons)} kWh · 🔋 ${L('reservas', 'stored')} ${S.bateria}/${MISION.bateriaMax}</p></div>
    <div class="pronostico"><b>${L('Si terminas el sol ahora…', 'If you end the sol now…')}</b>
      <p>${L('Con este plan, antes de nuevas emergencias:', 'With this plan, before new emergencies:')}</p>
      <p>🫁 ${signo(p.oxigeno)} · 🥔 ${signo(p.comida)} · 🔬 ${signo(p.ciencia)}</p>
      ${p.apagados.length ? `<p class="aviso-sistema">${L('⚠️ Se reducirá:', '⚠️ These will be turned down:')} ${p.apagados.map(n => tr(n === 'la construcción' ? 'Construcción' : n[0].toUpperCase() + n.slice(1))).join(', ')}.</p>` : ''}
    </div>`;
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
