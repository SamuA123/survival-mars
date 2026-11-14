// =====================================================================
//  INFORME DE MISIÓN (pantalla final)
//  - Línea de tiempo: qué pasó cada sol
//  - Gráficas pequeñas (una por recurso, cada una con su escala)
//  - Comparador de radiación: ¿cuánto es "un mSv"?
// =====================================================================
import { MISION } from '../sim/config.js';
import { EVENTOS } from '../sim/motor.js';
import { RADIACION } from '../data/radiacion.js';

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

const SERIES = [
  { id: 'o2', nombre: 'Oxígeno', icono: '🫁', max: () => 100, unidad: '%', peligro: 25 },
  { id: 'comida', nombre: 'Comida', icono: '🥔', max: () => 100, unidad: '%', peligro: 20 },
  { id: 'bateria', nombre: 'Energía (batería)', icono: '⚡', max: () => MISION.bateriaMax, unidad: 'kWh', peligro: 5 },
  { id: 'rad', nombre: 'Radiación acumulada', icono: '☢️', max: () => MISION.radLimite, unidad: 'mSv', limite: true },
];

export function informeHTML(S) {
  const R = S.registro;
  if (!R || !R.sols.length) return '';
  const puntos = [{ sol: 0, ...R.inicio }, ...R.sols];
  return `
    <section class="informe">
      <h3>📊 Informe de misión: así se desarrollaron tus decisiones</h3>
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
  if (s?.evento && EVENTOS[s.evento]) ics.push([EVENTOS[s.evento].icono, EVENTOS[s.evento].titulo]);
  if (s?.apagon) ics.push(['🔌', '¡Apagón!']);
  for (const e of R.evas.filter(x => x.sol === sol)) ics.push([e.rescate ? '🆘' : '🧑‍🚀', e.rescate ? 'Rescate en la caminata' : `Caminata de ${Math.round(e.segundos)} s`]);
  const d = R.decisiones.find(x => x.sol === sol);
  if (d?.agotado) ics.push(['⏰', 'No decidiste a tiempo']);
  return ics;
}

function lineaTiempo(R) {
  const celdas = R.sols.map(s => {
    const ics = iconosDelSol(R, s.sol);
    return `<div class="lt-sol ${s.tormenta ? 'tormenta' : ''}" title="${ics.map(i => i[1]).join(' · ') || 'Sol tranquilo'}">
      <div class="lt-ics">${ics.map(i => i[0]).join('') || '·'}</div><small>${s.sol}</small></div>`;
  }).join('');
  return `<div class="linea-tiempo" aria-label="Eventos de cada sol">${celdas}</div>
    <p class="lt-ayuda">Pasa el mouse sobre cada sol para ver qué ocurrió. Los sols con fondo café fueron días de tormenta.</p>`;
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
      <text x="${L + 4}" y="${H - B - 4}" class="g-zona-txt">zona de peligro</text>`;
  } else if (serie.limite) {
    zona = `<line x1="${L}" x2="${W - Rm}" y1="${y(MISION.radLimite)}" y2="${y(MISION.radLimite)}" class="g-limite"/>
      <text x="${L + 4}" y="${y(MISION.radLimite) - 4}" class="g-zona-txt">límite de la misión (${MISION.radLimite})</text>`;
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
      <figcaption>${serie.icono} ${serie.nombre}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${serie.nombre} sol a sol">
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
  return `<details class="tabla-informe"><summary>Ver los números en una tabla</summary>
    <table><thead><tr><th>Sol</th>${SERIES.map(s => `<th>${s.icono} ${s.unidad}</th>`).join('')}<th>🔬</th></tr></thead>
    <tbody>${filas}</tbody></table></details>`;
}

// ---------------------------------------------------------------------
function comparadorRadiacion(rad) {
  if (rad <= 0) return '';
  const dTierra = rad / RADIACION.tierra.valor;
  const tierra = dTierra >= 365 ? `${r1(dTierra / 365)} años` : `${Math.round(dTierra)} días`;
  const iss = Math.round(rad / RADIACION.estacionEspacial.valor);
  const rx = Math.round(rad / RADIOGRAFIA_MSV);
  const pct = Math.round(rad / MISION.radLimite * 100);
  return `
    <div class="comparador">
      <h4>☢️ Tu tripulación recibió <b>${r1(rad)} mSv</b>. ¿Eso es mucho?</h4>
      <p class="tranqui">mSv (milisievert) es la unidad para medir cuánta radiación recibe una persona.</p>
      <div class="cmp-filas">
        <div><span>🩻</span><b>${rx}</b><small>radiografías de pecho</small></div>
        <div><span>🌍</span><b>${tierra}</b><small>viviendo en la Tierra</small></div>
        <div><span>🛰️</span><b>${iss} días</b><small>en la Estación Espacial</small></div>
        <div><span>🎯</span><b>${pct}%</b><small>del límite de esta misión</small></div>
      </div>
      <small class="fuente-txt">Valores aproximados. Fuentes: Curiosity RAD (Marte), RadLab/OSDR (Estación Espacial),
        dosis anual promedio en la Tierra (~2,4 mSv) y radiografía de pecho (~0,1 mSv).</small>
    </div>`;
}
