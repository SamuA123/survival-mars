// =====================================================================
//  📍 UBICACIÓN — resumen del lugar de la base + enlaces a NASA Mars Trek.
//  Se inserta solo (botón arriba y enlace en la pantalla de inicio).
//  Usa su propia capa, así no reemplaza la pantalla de inicio ni otros modales.
// =====================================================================
import { SITIO } from '../data/sitio.js';
import { FUENTES } from '../data/fuentes.js';
import { t, campo, fuenteNombre, onIdioma, setIdioma, idioma } from './i18n.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function abrirUbicacion() {
  if (document.querySelector('.ubic-capa')) return;
  const capa = document.createElement('div');
  capa.className = 'ubic-capa';
  const secciones = (SITIO.resumen || []).map(s => {
    const f = FUENTES[s.fuente];
    return `<section class="ubic-sec">
      <h3>${s.icono} ${esc(campo(s, 'titulo'))}</h3>
      <ul>${campo(s, 'puntos').map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      ${f ? `<a class="fuente" href="${f.url}" target="_blank" rel="noopener">${t('fuente')} ${esc(fuenteNombre(f))}</a>` : ''}
    </section>`;
  }).join('');
  const mapas = (SITIO.mapas || []).map((m, i) =>
    `<a class="ubic-mapa ${i ? 'sec' : ''}" href="${m.url}" target="_blank" rel="noopener">${esc(campo(m, 'texto'))} ↗</a>`).join('');
  capa.innerHTML = `
    <div class="ubic-caja" role="dialog" aria-modal="true" aria-label="${t('ubic.dialog')}">
      <button class="ubic-cerrar" aria-label="${t('cerrar')}">✕</button>
      <button class="chip-btn ubic-idioma">${idioma === 'es' ? '🌐 English' : '🌐 Español'}</button>
      <div class="ubic-cab"><span>📍</span><div><small>${t('ubic.base')}</small><b>${esc(campo(SITIO, 'nombreCompleto') || campo(SITIO, 'nombre'))}</b></div></div>
      ${secciones}
      <div class="ubic-mapas">${mapas}</div>
      <button class="btn-grande ubic-ok">${t('volver')}</button>
    </div>`;
  const alEscape = e => { if (e.key === 'Escape') cerrar(); };
  const cerrar = () => { capa.remove(); removeEventListener('keydown', alEscape); };
  capa.querySelector('.ubic-idioma').onclick = () => setIdioma(idioma === 'es' ? 'en' : 'es');
  capa.addEventListener('click', e => {
    if (e.target === capa || e.target.closest('.ubic-cerrar, .ubic-ok')) cerrar();
  });
  addEventListener('keydown', alEscape);
  capa.cerrar = cerrar;
  document.body.appendChild(capa);
}

// Botón "📍 Ubicación" en la barra superior
function insertarBoton() {
  const barra = document.querySelector('.botones-top');
  if (!barra || barra.querySelector('#btnUbicacion')) return;
  const b = document.createElement('button');
  b.id = 'btnUbicacion'; b.className = 'chip-btn'; b.title = t('ubic.title');
  b.textContent = '📍'; b.setAttribute('aria-label', t('ubic.title'));
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
  a.textContent = t('ubic.intro');
  a.addEventListener('click', abrirUbicacion);
  ancla.after(a);
}

const css = document.createElement('style');
css.textContent = `
  .ubic-capa { position: fixed; inset: 0; z-index: 30; background: rgba(10,4,2,.6); display: grid; place-items: center; padding: 14px; backdrop-filter: blur(3px); }
  .ubic-caja { position: relative; width: min(680px, 100%); max-height: 92vh; overflow-y: auto; background: var(--papel);
    border: 3px solid var(--tinta); box-shadow: var(--sombra); border-radius: 22px; padding: 20px 22px; color: var(--texto); animation: entra .25s ease-out; }
  .ubic-cerrar { position: absolute; top: 10px; right: 12px; background: none; border: 0; color: var(--suave); font-size: 20px; }
  .ubic-cab { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
  .ubic-cab > span { font-size: 40px; }
  .ubic-cab small { display: block; color: var(--suave); }
  .ubic-cab b { font-size: 20px; }
  .ubic-sec { background: var(--papel2); border: 2px solid var(--tinta); border-radius: 14px; padding: 10px 14px; margin: 10px 0; }
  .ubic-sec h3 { margin: 4px 0 6px; font-size: 16px; color: var(--marte-osc); }
  .ubic-sec ul { margin: 0; padding-left: 20px; font-size: 14px; }
  .ubic-sec li { margin: 5px 0; }
  .ubic-mapas { display: grid; gap: 8px; margin-top: 14px; }
  .ubic-mapa { display: block; text-align: center; padding: 12px; border-radius: 14px; font-weight: 900; text-decoration: none;
    color: #fff; background: linear-gradient(180deg, #4cb8f0, #1f7fc0); box-shadow: 0 4px 0 #0f4f7a; }
  .ubic-mapa.sec { background: var(--papel2); color: var(--ciencia); box-shadow: none; border: 2px solid var(--tinta); font-weight: 700; }
  .ubic-link { display: block; margin: 4px auto 8px; background: none; border: 1px dashed var(--azul); color: var(--azul);
    border-radius: 999px; padding: 6px 14px; font-weight: 700; font-size: 14px; cursor: pointer; }
  .ubic-link:hover { background: rgba(92,200,255,.1); }`;
document.head.appendChild(css);

new MutationObserver(insertarEnInicio).observe(document.querySelector('#modalCaja') || document.body, { childList: true, subtree: true });
insertarBoton();
insertarEnInicio();
onIdioma(() => {
  const b = document.querySelector('#btnUbicacion');
  if (b) { b.title = t('ubic.title'); b.setAttribute('aria-label', t('ubic.title')); }
  const enlace = document.querySelector('.ubic-link');
  if (enlace) enlace.textContent = t('ubic.intro');
  const capa = document.querySelector('.ubic-capa');
  if (capa) {
    const scroll = capa.querySelector('.ubic-caja').scrollTop;
    capa.cerrar(); abrirUbicacion();
    document.querySelector('.ubic-caja').scrollTop = scroll;
  }
});

export { abrirUbicacion };
