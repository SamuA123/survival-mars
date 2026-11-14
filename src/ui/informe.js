// =====================================================================
//  INFORME DE MISIÓN (pantalla final)
//  - Línea de tiempo: qué pasó cada sol
//  - Gráficas pequeñas (una por recurso, cada una con su escala)
//  - Comparador de radiación: ¿cuánto es "un mSv"?
// =====================================================================
import { MISION } from '../sim/config.js';
import { EVENTOS } from '../sim/motor.js';
import { RADIACION } from '../data/radiacion.js';
import { t, tr } from './i18n.js';

const r1 = v => Math.round(v * 10) / 10;

// Estilos propios del informe y las insignias (se cargan solos)
if (!document.querySelector('link[data-informe]')) {
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.dataset.informe = '1';
  css.href = new URL('./informe.css', import.meta.url).href;
  document.head.appendChild(css);
}

// Dosis típica de una radiografía de pecho (≈0,1 mSv; FDA / RadiologyInfo.org)
const RADIOGRAFIA_MSV = 0.1;

// nombre() = texto traducido (claves inf.* en i18n.js)
const SERIES = [
  { id: 'o2', nombre: () => t('inf.o2'), icono: '🫁', max: () => 100, unidad: '%', peligro: 25 },
  { id: 'comida', nombre: () => t('inf.comida'), icono: '🥔', max: () => 100, unidad: '%', peligro: 20 },
  { id: 'bateria', nombre: () => t('inf.bateria'), icono: '⚡', max: () => MISION.bateriaMax, unidad: 'kWh', peligro: 5 },
  { id: 'rad', nombre: () => t('inf.rad'), icono: '☢️', max: () => MISION.radLimite, unidad: 'mSv', limite: true },
];

export function informeHTML(S) {
  const R = S.registro;
  if (!R || !R.sols.length) return '';
  const puntos = [{ sol: 0, ...R.inicio }, ...R.sols];
  return `
    <section class="informe">
      <h3>${t('inf.tit')}</h3>
      ${lineaTiempo(R)}
      <div class="graficas">${SERIES.map(s => grafica(s, puntos, R)).join('')}</div>
      ${tabla(puntos)}
      ${comparadorRadiacion(S.rad)}
    </section>`;
}

// ---------------------------------------------------------------------
function iconosDelSol(R, sol) {
  const s = R.sols.find(x => x.sol === sol);
  const ics = [];
  if (s?.evento && EVENTOS[s.evento]) ics.push([EVENTOS[s.evento].icono, tr(EVENTOS[s.evento].titulo)]);
  if (s?.apagon) ics.push(['🔌', t('inf.apagon')]);
  for (const e of R.evas.filter(x => x.sol === sol)) ics.push([e.rescate ? '🆘' : '🧑‍🚀', e.rescate ? t('inf.rescate') : t('inf.caminata', { s: Math.round(e.segundos) })]);
  const d = R.decisiones.find(x => x.sol === sol);
  if (d?.agotado) ics.push(['⏰', t('inf.agotado')]);
  return ics;
}

function lineaTiempo(R) {
  const celdas = R.sols.map(s => {
    const ics = iconosDelSol(R, s.sol);
    return `<div class="lt-sol ${s.tormenta ? 'tormenta' : ''}" title="${ics.map(i => i[1]).join(' · ') || t('inf.tranquilo')}">
      <div class="lt-ics">${ics.map(i => i[0]).join('') || '·'}</div><small>${s.sol}</small></div>`;
  }).join('');
  return `<div class="linea-tiempo" aria-label="${t('inf.aria')}">${celdas}</div>
    <p class="lt-ayuda">${t('inf.ayuda')}</p>`;
}

// ---------------------------------------------------------------------
function grafica(serie, puntos, R) {
  const W = 300, H = 120, L = 30, Rm = 44, T = 12, B = 22;
  const max = Math.max(serie.max(), ...puntos.map(p => p[serie.id]));
  const ultimoSol = puntos[puntos.length - 1].sol || 1;
  const x = sol => L + (sol / ultimoSol) * (W - L - Rm);
  const y = v => T + (1 - v / max) * (H - T - B);
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(p.sol).toFixed(1)},${y(p[serie.id]).toFixed(1)}`).join(' ');
  const ult = puntos[puntos.length - 1];

  // Zona de peligro (abajo) o límite (arriba, radiación)
  let zona = '';
  if (serie.peligro != null) {
    zona = `<rect x="${L}" y="${y(serie.peligro)}" width="${W - L - Rm}" height="${H - B - y(serie.peligro)}" class="g-peligro"/>
      <text x="${L + 4}" y="${H - B - 4}" class="g-zona-txt">${t('inf.peligro')}</text>`;
  } else if (serie.limite) {
    zona = `<line x1="${L}" x2="${W - Rm}" y1="${y(MISION.radLimite)}" y2="${y(MISION.radLimite)}" class="g-limite"/>
      <text x="${L + 4}" y="${y(MISION.radLimite) - 4}" class="g-zona-txt">${t('inf.limite', { n: MISION.radLimite })}</text>`;
  }

  // Marcas de tormenta y apagones
  const tormenta = R.sols.filter(s => s.tormenta).map(s =>
    `<rect x="${x(s.sol - 1)}" y="${T}" width="${x(s.sol) - x(s.sol - 1)}" height="${H - T - B}" class="g-tormenta"/>`).join('');
  const apagones = serie.id === 'bateria' ? R.sols.filter(s => s.apagon).map(s =>
    `<text x="${x(s.sol)}" y="${H - B - 2}" class="g-apagon" text-anchor="middle">🔌</text>`).join('') : '';

  const pts = puntos.map(p => {
    const v = r1(p[serie.id]);
    return `<g class="g-pt"><circle cx="${x(p.sol)}" cy="${y(p[serie.id])}" r="9" class="g-hit"/>
      <circle cx="${x(p.sol)}" cy="${y(p[serie.id])}" r="3.5" class="g-dot"/>
      <title>Sol ${p.sol}: ${v} ${serie.unidad}</title></g>`;
  }).join('');

  return `
    <figure class="grafica">
      <figcaption>${serie.icono} ${serie.nombre()}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('inf.ariaG', { n: serie.nombre() })}">
        ${tormenta}${zona}
        <line x1="${L}" x2="${W - Rm}" y1="${H - B}" y2="${H - B}" class="g-eje"/>
        <text x="${L - 4}" y="${y(max) + 4}" text-anchor="end" class="g-tick">${r1(max)}</text>
        <text x="${L - 4}" y="${H - B}" text-anchor="end" class="g-tick">0</text>
        <text x="${L}" y="${H - 6}" class="g-tick">Sol 0</text>
        <text x="${W - Rm}" y="${H - 6}" text-anchor="end" class="g-tick">Sol ${ultimoSol}</text>
        ${apagones}
        <path d="${linea}" class="g-linea"/>
        ${pts}
        <text x="${x(ult.sol) + 6}" y="${y(ult[serie.id]) + 4}" class="g-final">${r1(ult[serie.id])}${serie.unidad === '%' ? '%' : ''}</text>
      </svg>
    </figure>`;
}

function tabla(puntos) {
  const filas = puntos.map(p => `<tr><td>${p.sol}</td>${SERIES.map(s => `<td>${r1(p[s.id])}</td>`).join('')}<td>${p.ciencia}</td></tr>`).join('');
  return `<details class="tabla-informe"><summary>${t('inf.tabla')}</summary>
    <table><thead><tr><th>Sol</th>${SERIES.map(s => `<th>${s.icono} ${s.unidad}</th>`).join('')}<th>🔬</th></tr></thead>
    <tbody>${filas}</tbody></table></details>`;
}

// ---------------------------------------------------------------------
function comparadorRadiacion(rad) {
  if (rad <= 0) return '';
  const dTierra = rad / RADIACION.tierra.valor;
  const tierra = dTierra >= 365 ? t('cmp.anios', { n: r1(dTierra / 365) }) : t('cmp.dias', { n: Math.round(dTierra) });
  const iss = Math.round(rad / RADIACION.estacionEspacial.valor);
  const rx = Math.round(rad / RADIOGRAFIA_MSV);
  const pct = Math.round(rad / MISION.radLimite * 100);
  return `
    <div class="comparador">
      <h4>${t('cmp.tit', { r: r1(rad) })}</h4>
      <p class="tranqui">${t('cmp.msv')}</p>
      <div class="cmp-filas">
        <div><span>🩻</span><b>${rx}</b><small>${t('cmp.rx')}</small></div>
        <div><span>🌍</span><b>${tierra}</b><small>${t('cmp.tierra')}</small></div>
        <div><span>🛰️</span><b>${t('cmp.dias', { n: iss })}</b><small>${t('cmp.iss')}</small></div>
        <div><span>🎯</span><b>${pct}%</b><small>${t('cmp.limite')}</small></div>
      </div>
      <small class="fuente-txt">${t('cmp.fuentes')}</small>
    </div>`;
}
