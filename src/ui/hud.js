// HUD: recursos, panel del edificio seleccionado, energía y bitácora.
// Textos: t() para la interfaz, tr() para lo que viene de src/sim (ver src/ui/i18n.js).
import { MISION, SISTEMAS, RECURSOS } from '../sim/config.js';
import { ACCIONES, balance, r1, clamp, enTormenta, enConjuncion, CLIMA } from '../sim/motor.js';
import { t, tr } from './i18n.js';

const $ = s => document.querySelector(s);

// Información de cada edificio para el panel lateral (nombre e info vienen de i18n: ed.<id>, ed.<id>.i)
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
const nombreEd = id => t('ed.' + id);
const infoEd = id => t('ed.' + id + '.i', { meta: MISION.metaCiencia });

export function renderRecursos(S) {
  $('#sol').innerHTML = `Sol <b>${S.sol}</b> / ${MISION.maxSol}`;
  $('#recursos').innerHTML = RECURSOS.map(r => {
    const max = r.max(), v = S[r.id], pct = clamp(v / max * 100, 0, 100);
    const malo = r.inverso ? pct > 70 : pct < 25, medio = r.inverso ? pct > 45 : pct < 50;
    return `<div class="rec ${malo ? 'peligro' : medio ? 'medio' : ''}" title="${tr(r.ayuda)}">
      <span class="rec-ic">${r.icono}</span>
      <div class="rec-cuerpo"><div class="rec-top"><span>${tr(r.nombre)}</span><b>${r1(v)}${r.unidad === '%' ? '' : ' ' + r.unidad}${r.inverso ? '/' + max : ''}</b></div>
      <div class="barra"><div style="width:${pct}%"></div></div></div></div>`;
  }).join('') + `<div class="rec ciencia" title="${t('rec.ciencia.t', { meta: MISION.metaCiencia })}"><span class="rec-ic">🔬</span>
      <div class="rec-cuerpo"><div class="rec-top"><span>${t('rec.ciencia')}</span><b>${S.ciencia}/${MISION.metaCiencia}</b></div>
      <div class="barra azul"><div style="width:${clamp(S.ciencia / MISION.metaCiencia * 100, 0, 100)}%"></div></div></div></div>`;

  const tags = [];
  if (enTormenta(S)) tags.push(t('tag.tormenta'));
  if (enConjuncion(S)) tags.push(t('tag.conj'));
  if (!S.paneles) tags.push(t('tag.plegados'));
  $('#tags').innerHTML = tags.map(x => `<span>${x}</span>`).join('');
  $('#clima').innerHTML = `${CLIMA.real ? '🛰️' : '📚'} ${tr(CLIMA.resumen)}`;
  renderPlan(S);
}

// Tarjeta "Plan del sol": objetivo opcional de recolección con su progreso
export function renderPlan(S) {
  const el = $('#planSol');
  if (!el) return;
  const p = S.plan;
  if (!p) {
    const motivo = enTormenta(S) ? t('plan.sinTormenta')
      : enConjuncion(S) ? t('plan.sinConj')
      : S.niveles.radio === 0 ? t('plan.sinRadio') : '';
    el.innerHTML = motivo ? `<div class="plan-tit">${t('plan.tit')}</div><small>${motivo}</small>` : '';
    el.classList.toggle('vacio', !motivo);
    return;
  }
  const O = MISION.eva.objetos[p.tipo], hecho = Math.min(S.inventario.hoy[p.tipo], p.cantidad);
  el.classList.remove('vacio');
  el.classList.toggle('cumplido', p.cumplido);
  el.innerHTML = `<div class="plan-tit">${t('plan.tit')} ${p.cumplido ? '✅' : `<small>${t('plan.opcional')}</small>`}</div>
    <div class="plan-obj">${t('plan.trae')} <b>${p.cantidad} ${O.icono} ${tr(O.nombre)}</b></div>
    <div class="plan-prog">${Array.from({ length: p.cantidad }, (_, i) => `<i class="${i < hecho ? 'on' : ''}">${O.icono}</i>`).join('')}
      <span>${hecho}/${p.cantidad}</span></div>
    <small>${p.cumplido ? t('plan.cumplido') : `${t('plan.bono', { c: MISION.plan.bono.ciencia, s: MISION.plan.bono.salud })} · ${tr(p.motivo)}`}</small>`;
}

export function renderEnergia(S) {
  const b = balance(S), esc = Math.max(b.gen, b.cons, 1);
  $('#energia').innerHTML = `
    <div class="en-tit">${t('en.tit')}</div>
    <div class="en-fila"><small>${t('en.produces')}</small><div class="barra verde"><div style="width:${b.gen / esc * 100}%"></div></div><b>${r1(b.gen)}</b></div>
    <div class="en-fila"><small>${t('en.gastas')}</small><div class="barra naranja"><div style="width:${b.cons / esc * 100}%"></div></div><b>${r1(b.cons)}</b></div>
    <div class="en-bal ${b.bal >= 0 ? 'pos' : 'neg'}">${b.bal >= 0 ? '+' : ''}${r1(b.bal)} kWh · ${t('en.manana')} ${r1(b.manana)}/${MISION.bateriaMax}
      ${b.apagon ? `<b class="parp">${t('en.apagon')}</b>` : ''}</div>`;
}

export function renderPanel(S, sel) {
  const el = $('#panel');
  el.classList.toggle('sin-sel', !sel);   // en celular: sin selección, el panel se reduce a una pista
  if (!sel) {
    el.innerHTML = `<h3>${t('pan.base')}</h3>
      <p class="pista">${t('pan.pista')}</p>
      <div class="lista-ed">${Object.entries(EDIF).map(([id, e]) => {
        const s = e.sistema ? SISTEMAS[e.sistema] : null;
        const nivel = s ? `<span class="pips-mini">${'●'.repeat(S.niveles[e.sistema])}${'○'.repeat(s.max - S.niveles[e.sistema])}</span>` : '';
        return `<button class="ed-btn" data-sel="${id}">${e.icono} ${nombreEd(id)} ${nivel}</button>`;
      }).join('')}</div>
      <div class="inventario">🧰 ${t('pan.repuestos')}: <b>${S.repuestos}</b> · 💊 ${t('pan.botiquin')}: <b>${S.botiquin}</b></div>`;
    return;
  }
  const e = EDIF[sel];
  let html = `<div class="pan-cab"><span class="pan-ic">${e.icono}</span><h3>${nombreEd(sel)}</h3><button class="cerrar" data-sel="">✕</button></div>`;
  if (e.sistema) {
    const s = SISTEMAS[e.sistema], n = S.niveles[e.sistema];
    html += `<p>${tr(s.desc)}</p>
      <div class="control">
        <button class="nivel-btn" data-sis="${e.sistema}" data-d="-1" ${n <= 0 ? 'disabled' : ''}>−</button>
        <div class="nivel-vis">${Array.from({ length: s.max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}
          <small>${t('pan.porNivel', { c: s.costo, g: r1(n * s.costo) })}</small></div>
        <button class="nivel-btn" data-sis="${e.sistema}" data-d="1" ${n >= s.max ? 'disabled' : ''}>+</button>
      </div>
      <div class="nivel-txt ${n < (e.sistema === 'vital' ? 2 : e.sistema === 'lab' ? 0 : 1) ? 'malo' : ''}">${tr(s.niveles[n])}</div>`;
  }
  if (sel === 'paneles') {
    const b = balance(S);
    html += `<div class="dato-ed">${t('pan.paneles', { s: r1(b.solar), e: Math.round(S.eficiencia * 100) })}${enTormenta(S) ? t('pan.panelesTormenta') : ''}</div>`;
  }
  if (sel === 'bateria') html += `<div class="dato-ed">${t('pan.bateria', { b: r1(S.bateria), m: MISION.bateriaMax })}</div>`;
  if (sel === 'reactor') html += `<div class="dato-ed">${t('pan.reactor', { n: MISION.nuclear })}</div>`;
  for (const a of e.acciones) {
    const A = ACCIONES[a];
    if (!A.visible(S)) continue;
    html += `<button class="accion ${a === 'blindaje' && S.construir ? 'activa' : ''}" data-accion="${a}" ${A.activo(S) ? '' : 'disabled'}>
      <span>${tr(A.texto(S))}</span><small>${tr(A.detalle(S))}</small></button>`;
  }
  html += `<p class="info">💡 ${infoEd(sel)}</p>`;
  el.innerHTML = html;
}

export function renderLog(S) {
  $('#bitacora').innerHTML = S.log.slice(0, 40).map(l => `<li class="${l.tipo}"><span class="log-sol">Sol ${l.sol}</span> ${tr(l.texto)}</li>`).join('');
}
