// HUD: recursos, panel del edificio seleccionado, energía y bitácora.
import { MISION, SISTEMAS, RECURSOS } from '../sim/config.js';
import { ACCIONES, balance, r1, clamp, enTormenta, enConjuncion, CLIMA } from '../sim/motor.js';

const $ = s => document.querySelector(s);

// Información de cada edificio para el panel lateral
export const EDIF = {
  habitat: { nombre: 'Hábitat', icono: '🏠', sistema: 'vital', acciones: ['eva', 'blindaje'],
    info: 'Aquí viven y duermen los 4 astronautas. Es el refugio cuando hay radiación peligrosa.' },
  invernadero: { nombre: 'Invernadero', icono: '🌱', sistema: 'invernadero', acciones: ['reparar'],
    info: 'Las plantas crecen con luces LED especiales. Cada sol la tripulación come 5 de comida.' },
  lab: { nombre: 'Laboratorio', icono: '🔬', sistema: 'lab', acciones: [],
    info: 'La ciencia es la razón de la misión, pero cada experimento gasta energía. ¡Meta: ' + MISION.metaCiencia + ' puntos de ciencia!' },
  antena: { nombre: 'Antena', icono: '📡', sistema: 'radio', acciones: [],
    info: 'Los mensajes viajan a la velocidad de la luz, pero Marte está tan lejos que tardan unos 12 minutos.' },
  paneles: { nombre: 'Paneles solares', icono: '☀️', sistema: null, acciones: ['paneles', 'limpiar'],
    info: 'Marte recibe menos de la mitad de luz solar que la Tierra. El polvo los tapa y raya.' },
  bateria: { nombre: 'Baterías', icono: '🔋', sistema: null, acciones: [],
    info: 'Guardan la energía que sobra. Si la batería llega a 0 hay un apagón y los sistemas se apagan solos.' },
  reactor: { nombre: 'Mini reactor nuclear', icono: '⚛️', sistema: null, acciones: [],
    info: 'Da poca energía, pero siempre: de día, de noche y en tormentas. Está lejos de la base por seguridad.' },
  rover: { nombre: 'Rover explorador', icono: '🚙', sistema: null, acciones: ['eva'],
    info: 'Las rocas más valiosas están lejos de la base. ¡Pero cuanto más lejos vas, más oxígeno del traje gastas y más radiación recibes!' },
};

export function renderRecursos(S) {
  $('#sol').innerHTML = `Sol <b>${S.sol}</b> / ${MISION.maxSol}`;
  $('#recursos').innerHTML = RECURSOS.map(r => {
    const max = r.max(), v = S[r.id], pct = clamp(v / max * 100, 0, 100);
    const malo = r.inverso ? pct > 70 : pct < 25, medio = r.inverso ? pct > 45 : pct < 50;
    return `<div class="rec ${malo ? 'peligro' : medio ? 'medio' : ''}" title="${r.ayuda}">
      <span class="rec-ic">${r.icono}</span>
      <div class="rec-cuerpo"><div class="rec-top"><span>${r.nombre}</span><b>${r1(v)}${r.unidad === '%' ? '' : ' ' + r.unidad}${r.inverso ? '/' + max : ''}</b></div>
      <div class="barra"><div style="width:${pct}%"></div></div></div></div>`;
  }).join('') + `<div class="rec ciencia" title="Puntos de ciencia. Meta: ${MISION.metaCiencia}"><span class="rec-ic">🔬</span>
      <div class="rec-cuerpo"><div class="rec-top"><span>Ciencia</span><b>${S.ciencia}/${MISION.metaCiencia}</b></div>
      <div class="barra azul"><div style="width:${clamp(S.ciencia / MISION.metaCiencia * 100, 0, 100)}%"></div></div></div></div>`;

  const tags = [];
  if (enTormenta(S)) tags.push('🌪️ Tormenta de polvo');
  if (enConjuncion(S)) tags.push('🌞 Conjunción: sin contacto con la Tierra');
  if (!S.paneles) tags.push('🔽 Paneles plegados');
  $('#tags').innerHTML = tags.map(t => `<span>${t}</span>`).join('');
  $('#clima').innerHTML = `${CLIMA.real ? '🛰️' : '📚'} ${CLIMA.resumen}`;
  renderPlan(S);
}

// Tarjeta "Plan del sol": objetivo opcional de recolección con su progreso
export function renderPlan(S) {
  const el = $('#planSol');
  if (!el) return;
  const p = S.plan;
  if (!p) {
    const motivo = enTormenta(S) ? '🌪️ Hoy no hay caminata: tormenta de polvo.'
      : enConjuncion(S) ? '🌞 Sin plan: no hay contacto con la Tierra.'
      : S.niveles.radio === 0 ? '📡 Sin plan: las comunicaciones están apagadas.' : '';
    el.innerHTML = motivo ? `<div class="plan-tit">📋 Plan del sol</div><small>${motivo}</small>` : '';
    el.classList.toggle('vacio', !motivo);
    return;
  }
  const O = MISION.eva.objetos[p.tipo], hecho = Math.min(S.inventario.hoy[p.tipo], p.cantidad);
  el.classList.remove('vacio');
  el.classList.toggle('cumplido', p.cumplido);
  el.innerHTML = `<div class="plan-tit">📋 Plan del sol ${p.cumplido ? '✅' : '<small>(opcional)</small>'}</div>
    <div class="plan-obj">Trae <b>${p.cantidad} ${O.icono} ${O.nombre}</b></div>
    <div class="plan-prog">${Array.from({ length: p.cantidad }, (_, i) => `<i class="${i < hecho ? 'on' : ''}">${O.icono}</i>`).join('')}
      <span>${hecho}/${p.cantidad}</span></div>
    <small>${p.cumplido ? '¡Cumplido! Bono recibido.' : `Bono: +${MISION.plan.bono.ciencia} ciencia y +${MISION.plan.bono.salud} salud · ${p.motivo}`}</small>`;
}

export function renderEnergia(S) {
  const b = balance(S), esc = Math.max(b.gen, b.cons, 1);
  $('#energia').innerHTML = `
    <div class="en-tit">⚡ Energía de hoy</div>
    <div class="en-fila"><small>Produces</small><div class="barra verde"><div style="width:${b.gen / esc * 100}%"></div></div><b>${r1(b.gen)}</b></div>
    <div class="en-fila"><small>Gastas</small><div class="barra naranja"><div style="width:${b.cons / esc * 100}%"></div></div><b>${r1(b.cons)}</b></div>
    <div class="en-bal ${b.bal >= 0 ? 'pos' : 'neg'}">${b.bal >= 0 ? '+' : ''}${r1(b.bal)} kWh · 🔋 mañana ${r1(b.manana)}/${MISION.bateriaMax}
      ${b.apagon ? '<b class="parp">⚠️ ¡APAGÓN!</b>' : ''}</div>`;
}

export function renderPanel(S, sel) {
  const el = $('#panel');
  el.classList.toggle('sin-sel', !sel);   // en celular: sin selección, el panel se reduce a una pista
  if (!sel) {
    el.innerHTML = `<h3>🛰️ Tu base en Marte</h3>
      <p class="pista">👆 Toca un edificio para controlarlo.</p>
      <div class="lista-ed">${Object.entries(EDIF).map(([id, e]) => {
        const s = e.sistema ? SISTEMAS[e.sistema] : null;
        const nivel = s ? `<span class="pips-mini">${'●'.repeat(S.niveles[e.sistema])}${'○'.repeat(s.max - S.niveles[e.sistema])}</span>` : '';
        return `<button class="ed-btn" data-sel="${id}">${e.icono} ${e.nombre} ${nivel}</button>`;
      }).join('')}</div>
      <div class="inventario">🧰 Repuestos: <b>${S.repuestos}</b> · 💊 Botiquín: <b>${S.botiquin}</b></div>`;
    return;
  }
  const e = EDIF[sel];
  let html = `<div class="pan-cab"><span class="pan-ic">${e.icono}</span><h3>${e.nombre}</h3><button class="cerrar" data-sel="">✕</button></div>`;
  if (e.sistema) {
    const s = SISTEMAS[e.sistema], n = S.niveles[e.sistema];
    html += `<p>${s.desc}</p>
      <div class="control">
        <button class="nivel-btn" data-sis="${e.sistema}" data-d="-1" ${n <= 0 ? 'disabled' : ''}>−</button>
        <div class="nivel-vis">${Array.from({ length: s.max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}
          <small>${s.costo} kWh por nivel · gasta ${r1(n * s.costo)} kWh</small></div>
        <button class="nivel-btn" data-sis="${e.sistema}" data-d="1" ${n >= s.max ? 'disabled' : ''}>+</button>
      </div>
      <div class="nivel-txt ${n < (e.sistema === 'vital' ? 2 : e.sistema === 'lab' ? 0 : 1) ? 'malo' : ''}">${s.niveles[n]}</div>`;
  }
  if (sel === 'paneles') {
    const b = balance(S);
    html += `<div class="dato-ed">☀️ Producen hoy: <b>${r1(b.solar)} kWh</b> · Limpieza: <b>${Math.round(S.eficiencia * 100)}%</b>${enTormenta(S) ? '<br>🌪️ La tormenta tapa el Sol: producen 75% menos.' : ''}</div>`;
  }
  if (sel === 'bateria') html += `<div class="dato-ed">🔋 Carga: <b>${r1(S.bateria)} / ${MISION.bateriaMax} kWh</b></div>`;
  if (sel === 'reactor') html += `<div class="dato-ed">⚛️ Produce: <b>${MISION.nuclear} kWh</b> cada sol</div>`;
  for (const a of e.acciones) {
    const A = ACCIONES[a];
    if (!A.visible(S)) continue;
    html += `<button class="accion ${a === 'blindaje' && S.construir ? 'activa' : ''}" data-accion="${a}" ${A.activo(S) ? '' : 'disabled'}>
      <span>${A.texto(S)}</span><small>${A.detalle(S)}</small></button>`;
  }
  html += `<p class="info">💡 ${e.info}</p>`;
  el.innerHTML = html;
}

export function renderLog(S) {
  $('#bitacora').innerHTML = S.log.slice(0, 40).map(l => `<li class="${l.tipo}"><span class="log-sol">Sol ${l.sol}</span> ${l.texto}</li>`).join('');
}
