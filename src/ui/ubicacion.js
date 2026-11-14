// =====================================================================
//  📍 UBICACIÓN — resumen del lugar de la base + enlaces a NASA Mars Trek.
//  Se inserta solo (botón arriba y enlace en la pantalla de inicio).
//  Usa su propia capa, así no reemplaza la pantalla de inicio ni otros modales.
// =====================================================================
import { SITIO } from '../data/sitio.js';
import { FUENTES } from '../data/fuentes.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function abrirUbicacion() {
  if (document.querySelector('.ubic-capa')) return;
  const capa = document.createElement('div');
  capa.className = 'ubic-capa';
  const secciones = (SITIO.resumen || []).map(s => {
    const f = FUENTES[s.fuente];
    return `<section class="ubic-sec">
      <h3>${s.icono} ${esc(s.titulo)}</h3>
      <ul>${s.puntos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      ${f ? `<a class="fuente" href="${f.url}" target="_blank" rel="noopener">Fuente: ${esc(f.nombre)}</a>` : ''}
    </section>`;
  }).join('');
  const mapas = (SITIO.mapas || []).map((m, i) =>
    `<a class="ubic-mapa ${i ? 'sec' : ''}" href="${m.url}" target="_blank" rel="noopener">${esc(m.texto)} ↗</a>`).join('');
  capa.innerHTML = `
    <div class="ubic-caja" role="dialog" aria-label="Ubicación de la base">
      <button class="ubic-cerrar" aria-label="Cerrar">✕</button>
      <div class="ubic-cab"><span>📍</span><div><small>Tu base en Marte</small><b>${esc(SITIO.nombreCompleto || SITIO.nombre)}</b></div></div>
      ${secciones}
      <div class="ubic-mapas">${mapas}</div>
      <button class="btn-grande ubic-ok">Volver</button>
    </div>`;
  const cerrar = () => capa.remove();
  capa.addEventListener('click', e => {
    if (e.target === capa || e.target.closest('.ubic-cerrar, .ubic-ok')) cerrar();
  });
  addEventListener('keydown', function alEscape(e) { if (e.key === 'Escape') { cerrar(); removeEventListener('keydown', alEscape); } });
  document.body.appendChild(capa);
}

// Botón "📍 Ubicación" en la barra superior
function insertarBoton() {
  const barra = document.querySelector('.botones-top');
  if (!barra || barra.querySelector('#btnUbicacion')) return;
  const b = document.createElement('button');
  b.id = 'btnUbicacion'; b.className = 'chip-btn'; b.title = 'Dónde está tu base en Marte';
  b.textContent = '📍 Ubicación';
  b.addEventListener('click', abrirUbicacion);
  barra.prepend(b);
}

// Enlace en la pantalla de inicio, debajo del texto del sitio
function insertarEnInicio() {
  const intro = document.querySelector('#modalCaja .intro');
  if (!intro || intro.querySelector('.ubic-link')) return;
  const ancla = [...intro.querySelectorAll('p')].find(p => p.textContent.includes('NE Syrtis')) || intro.querySelector('.sub');
  if (!ancla) return;
  const a = document.createElement('button');
  a.type = 'button'; a.className = 'ubic-link';
  a.textContent = '📍 Conoce el lugar de tu base (con mapa de la NASA)';
  a.addEventListener('click', abrirUbicacion);
  ancla.after(a);
}

const css = document.createElement('style');
css.textContent = `
  .ubic-capa { position: fixed; inset: 0; z-index: 30; background: rgba(10,4,2,.6); display: grid; place-items: center; padding: 14px; backdrop-filter: blur(3px); }
  .ubic-caja { position: relative; width: min(680px, 100%); max-height: 92vh; overflow-y: auto; background: rgba(36,18,13,.97);
    border: 2px solid var(--borde); border-radius: 22px; padding: 20px 22px; color: var(--texto); animation: entra .25s ease-out; }
  .ubic-cerrar { position: absolute; top: 10px; right: 12px; background: none; border: 0; color: var(--suave); font-size: 20px; }
  .ubic-cab { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
  .ubic-cab > span { font-size: 40px; }
  .ubic-cab small { display: block; color: var(--suave); }
  .ubic-cab b { font-size: 20px; }
  .ubic-sec { background: var(--vidrio2); border-radius: 14px; padding: 10px 14px; margin: 10px 0; }
  .ubic-sec h3 { margin: 4px 0 6px; font-size: 16px; color: var(--acento); }
  .ubic-sec ul { margin: 0; padding-left: 20px; font-size: 14px; }
  .ubic-sec li { margin: 5px 0; }
  .ubic-mapas { display: grid; gap: 8px; margin-top: 14px; }
  .ubic-mapa { display: block; text-align: center; padding: 12px; border-radius: 14px; font-weight: 900; text-decoration: none;
    color: #fff; background: linear-gradient(180deg, #4cb8f0, #1f7fc0); box-shadow: 0 4px 0 #0f4f7a; }
  .ubic-mapa.sec { background: var(--vidrio2); color: var(--azul); box-shadow: none; border: 1px solid rgba(92,200,255,.4); font-weight: 700; }
  .ubic-link { display: block; margin: 4px auto 8px; background: none; border: 1px dashed var(--azul); color: var(--azul);
    border-radius: 999px; padding: 6px 14px; font-weight: 700; font-size: 14px; cursor: pointer; }
  .ubic-link:hover { background: rgba(92,200,255,.1); }`;
document.head.appendChild(css);

new MutationObserver(insertarEnInicio).observe(document.querySelector('#modalCaja') || document.body, { childList: true, subtree: true });
insertarBoton();
insertarEnInicio();

export { abrirUbicacion };
