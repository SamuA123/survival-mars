// HUD: tanques de recursos, ruta de la misión, panel del edificio, pronóstico de batería y bitácora.
// Principio: el niño ve FORMAS (cuánto se llena un tanque), no números. Los números van en el tooltip.
import { MISION, SISTEMAS, RECURSOS } from '../sim/config.js';
import { ACCIONES, balance, r1, clamp, enTormenta, enConjuncion } from '../sim/motor.js';
import { HALLAZGOS } from '../data/salud.js';
import { SITIO } from '../data/sitio.js';

const $ = s => document.querySelector(s);

// Información de cada edificio para el panel lateral
export const EDIF = {
  habitat: {
    nombre: 'Hábitat', icono: '🏠', sistema: 'vital', acciones: ['eva', 'blindaje'],
    info: 'Aquí viven los 4 astronautas. También es el refugio cuando hay radiación peligrosa.'
  },
  invernadero: {
    nombre: 'Invernadero', icono: '🌱', sistema: 'invernadero', acciones: ['reparar'],
    info: 'Las plantas crecen con luces especiales. Cada sol la tripulación se come 5 de comida.'
  },
  lab: {
    nombre: 'Laboratorio', icono: '🔬', sistema: 'lab', acciones: [],
    info: 'La ciencia es la razón de la misión, pero cada experimento gasta energía.'
  },
  antena: {
    nombre: 'Antena', icono: '📡', sistema: 'radio', acciones: [],
    info: 'Los mensajes viajan a la velocidad de la luz, pero Marte está tan lejos que tardan unos 12 minutos.'
  },
  paneles: {
    nombre: 'Paneles solares', icono: '☀️', sistema: null, acciones: ['paneles', 'limpiar'],
    info: 'Marte recibe menos de la mitad de luz solar que la Tierra. El polvo los tapa y raya.'
  },
  bateria: {
    nombre: 'Baterías', icono: '🔋', sistema: null, acciones: [],
    info: 'Guardan la energía que sobra. Si llegan a 0 hay un apagón y los sistemas se apagan solos.'
  },
  reactor: {
    nombre: 'Mini reactor nuclear', icono: '⚛️', sistema: null, acciones: [],
    info: 'Da poca energía, pero siempre: de día, de noche y en tormentas.'
  },
  rover: {
    nombre: 'Rover explorador', icono: '🚙', sistema: null, acciones: ['eva'],
    info: 'Las rocas más valiosas están lejos. Cuanto más lejos vas, más oxígeno del traje gastas y más radiación recibes.'
  },
};

// Tanques visibles. La tripulación se dibuja aparte (4 cascos).
const TANQUES = ['bateria', 'o2', 'comida', 'rad'];

export function renderRecursos(S) {
  renderRuta(S);
  const tanques = TANQUES.map(id => {
    const r = RECURSOS.find(x => x.id === id), max = r.max(), v = S[id];
    const pct = clamp(v / max * 100, 0, 100);
    const estado = r.inverso ? (pct > 70 ? 'peligro' : pct > 45 ? 'medio' : '') : (pct < 25 ? 'peligro' : pct < 50 ? 'medio' : '');
    const valor = `${r1(v)}${r.unidad === '%' ? '%' : ' ' + r.unidad}${r.inverso ? ' de ' + max : ''}`;
    return `<div class="tanque t-${id} ${estado}" title="${r.nombre}: ${valor}. ${r.ayuda}">
      <div class="tq-vidrio"><div class="tq-liquido" style="height:${pct}%"></div>${r.inverso ? '<i class="tq-limite"></i>' : ''}</div>
      <span class="tq-ic">${r.icono}</span><small>${r.nombre}</small></div>`;
  }).join('');
  const cascos = Math.ceil(clamp(S.salud, 0, 100) / 25);
  const tripu = `<div class="tripulacion ${cascos <= 1 ? 'peligro' : ''}" title="Tripulación: ${S.salud}%. Baja si falta oxígeno, comida o calor.">
      ${Array.from({ length: 4 }, (_, i) => `<span class="${i < cascos ? 'ok' : ''}">🧑‍🚀</span>`).join('')}</div>`;
  $('#recursos').innerHTML = tanques + tripu;

  const tags = [];
  if (enTormenta(S)) tags.push('🌪️ Tormenta de polvo');
  if (enConjuncion(S)) tags.push('🌞 Sin contacto con la Tierra');
  if (!S.paneles) tags.push('🔽 Paneles guardados');
  $('#tags').innerHTML = tags.map(t => `<span>${t}</span>`).join('');
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
  $('#sol').innerHTML = `<div class="ruta-cab"><b>Sol ${S.sol}</b><small>de ${MISION.maxSol}</small></div>
    <div class="ruta">${celdas}</div>
    <div class="meta-ciencia" title="Ciencia: ${S.ciencia} de ${MISION.metaCiencia} para la segunda estrella">
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
  el.innerHTML = `<small>Tarea del día</small><b>${!p ? '—' : p.cumplido ? '✅' : `${MISION.eva.objetos[p.tipo].icono} ${hecho}/${p.cantidad}`}</b>`;
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
  $('#energia').title = `Produces ${r1(b.gen)} kWh y gastas ${r1(b.cons)} kWh. Mañana tendrás ${r1(b.manana)} de ${MISION.bateriaMax} kWh.`;
  $('#energia').className = `energia ${b.apagon ? 'apagon' : bal < 0 ? 'baja' : 'sube'}`;
  $('#energia').innerHTML = `<small>${b.apagon ? '¡Apagón mañana!' : 'Batería mañana'}</small>
    <div class="pila">${celdas}</div>
    <b class="bal">${bal > 0 ? '+' : ''}${bal}</b>`;
}

// ---------------------------------------------------------------------
//  CONSOLA DE LA BASE — todo lo que se decide DENTRO del hábitat.
//  Se abre con "Control base" (sel = 'base') o tocando un edificio (sel = id del edificio):
//  en ese caso la consola abre con ese sistema resaltado.
//  Afuera (caminata) se sale con el botón de la puerta, en la columna de recolección.
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
    el.innerHTML = S.sol <= 2 ? '<p class="pista">👆 Toca un edificio o abre <b>Control base</b></p>' : '';
    return;
  }
  const foco = FOCO[sel] || null;
  const e = EDIF[sel];
  el.innerHTML = `
    <div class="pantalla">
      <header class="con-cab">
        <span class="led"></span><b>Consola de la base</b><small>${SITIO.nombre} · Sol ${S.sol}</small>
        <button class="cerrar" data-sel="" aria-label="Volver afuera">Volver afuera ✕</button>
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
    <span>${A.texto(S)}</span><small>${A.detalle(S)}</small></button>`;
};

// Izquierda: lo que se trajo de afuera y la puerta para salir
function colRecoleccion(S, foco) {
  const filas = Object.entries(MISION.eva.objetos).map(([k, o]) => `
    <li style="--c:${o.color}" title="${o.uso}"><span>${o.icono}</span><b>${o.nombre}</b><em>${S.inventario.total[k]}</em></li>`).join('');
  const bolsas = MISION.eva.regolitoPorNivel;
  return `<h3>🎒 Recolección</h3>
    <ul class="con-inv">${filas}</ul>
    <div class="con-fila" title="Cada ${bolsas} bolsas de regolito cubren más el hábitat">
      🧱 Blindaje <span class="cuadros">${Array.from({ length: 3 }, (_, i) => `<i class="${i < S.blindaje ? 'on' : ''}"></i>`).join('')}</span>
      <small>${S.blindaje < 3 ? `bolsas ${S.regolito}/${bolsas}` : '¡completo!'}</small></div>
    <div class="con-fila">🧰 Repuestos <b>${S.repuestos}</b> · 💊 Botiquín <b>${S.botiquin}</b></div>
    <div class="con-puerta ${foco === 'puerta' ? 'foco' : ''}" data-foco="puerta">
      ${accionBtn(S, 'eva')}
    </div>`;
}

// Centro: el cuerpo del tripulante muestra las consecuencias de las decisiones
function colTripulante(S) {
  const rad = clamp(S.rad / MISION.radLimite * 100, 0, 100);
  const cascos = Math.ceil(clamp(S.salud, 0, 100) / 25);
  const estado = S.o2 < 25 ? { t: 'Le falta el aire', c: 'mal' }
    : S.comida <= 10 ? { t: 'Tiene mucha hambre', c: 'mal' }
    : rad > 70 ? { t: 'Recibió mucha radiación', c: 'mal' }
    : S.salud < 50 ? { t: 'Está cansado', c: 'medio' }
    : { t: 'Se siente bien', c: 'bien' };
  // El riesgo más grande decide qué estudio real se muestra
  const tema = rad > 25 ? 'radiacion' : S.comida < 40 ? 'comida' : 'radiacion';
  const lista = HALLAZGOS.filter(h => h.tema === tema);
  const h = lista[S.sol % lista.length];
  return `<h3>🧑‍🚀 Tripulante</h3>
    <div class="cuerpo">
      ${SVG_ASTRONAUTA}
      <div class="dosimetro" title="Radiación acumulada: ${S.rad} de ${MISION.radLimite} mSv">
        <div style="height:${rad}%"></div><i></i>
        <small>☢️<br>${r1(S.rad)}<br>mSv</small></div>
    </div>
    <div class="con-estado ${estado.c}">${estado.t}</div>
    <div class="con-vitales">
      <span title="Oxígeno de la base: ${S.o2}%">🫁<div class="barra o2"><div style="width:${clamp(S.o2, 0, 100)}%"></div></div></span>
      <span title="Comida: ${S.comida}%">🥔<div class="barra comida"><div style="width:${clamp(S.comida, 0, 100)}%"></div></div></span>
    </div>
    <div class="cascos" title="Salud de la tripulación: ${S.salud}%">${Array.from({ length: 4 }, (_, i) => `<span class="${i < cascos ? 'ok' : ''}">🧑‍🚀</span>`).join('')}</div>
    ${h ? `<a class="con-ciencia" href="${h.url}" target="_blank" rel="noopener">🧬 ${h.texto} <b>Estudio NASA ${h.estudio} ↗</b></a>` : ''}`;
}

// Derecha: energía de mañana y los sistemas que la gastan
function colEnergia(S, foco) {
  const b = balance(S);
  const sistemas = Object.entries(SISTEMAS).map(([id, s]) => {
    const n = S.niveles[id];
    const malo = n < (id === 'vital' ? 2 : id === 'lab' ? 0 : 1);
    return `<div class="sis ${foco === id ? 'foco' : ''}" data-foco="${id}" title="${s.desc}">
      <div class="sis-cab">${s.icono} <b>${s.nombre}</b><small>⚡ ${r1(n * s.costo)}</small></div>
      <div class="control">
        <button class="nivel-btn" data-sis="${id}" data-d="-1" ${n <= 0 ? 'disabled' : ''} aria-label="Menos energía para ${s.nombre}">−</button>
        <div class="nivel-vis">${Array.from({ length: s.max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
        <button class="nivel-btn" data-sis="${id}" data-d="1" ${n >= s.max ? 'disabled' : ''} aria-label="Más energía para ${s.nombre}">+</button>
      </div>
      <div class="nivel-txt ${malo ? 'malo' : ''}">${s.niveles[n]}</div>
      ${id === 'invernadero' ? accionBtn(S, 'reparar') : ''}
      ${id === 'vital' ? accionBtn(S, 'blindaje') : ''}
    </div>`;
  }).join('');
  return `<h3>⚡ Energía</h3>
    <div class="con-energia ${foco === 'energia' ? 'foco' : ''}" data-foco="energia">
      <div>☀️ ${r1(b.solar)} + ⚛️ ${MISION.nuclear} = <b>produces ${r1(b.gen)}</b></div>
      <div>gastas <b>${r1(b.cons)}</b> · 🔋 ${r1(S.bateria)} de ${MISION.bateriaMax}</div>
    </div>
    <div class="sis ${foco === 'paneles' ? 'foco' : ''}" data-foco="paneles">
      <div class="sis-cab">☀️ <b>Paneles solares</b><small>limpios ${Math.round(S.eficiencia * 100)}%</small></div>
      ${accionBtn(S, 'paneles')}${accionBtn(S, 'limpiar')}
    </div>
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
  $('#bitacora').innerHTML = S.log.slice(0, 40).map(l => `<li class="${l.tipo}"><span class="log-sol">${l.sol}</span> ${l.texto}</li>`).join('');
}
