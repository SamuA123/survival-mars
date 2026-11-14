// Selector de dificultad en la pantalla de inicio (se inserta solo, sin tocar modales.js).
import { DIFICULTADES, aplicarDificultad } from '../sim/dificultad.js';
import { MISION } from '../sim/config.js';
import { t } from './i18n.js';
import { esDemo } from '../sim/demostracion.js';

const CLAVE = 'survivalMars.dificultad';
let elegida = (() => { try { return localStorage.getItem(CLAVE) || 'cadete'; } catch { return 'cadete'; } })();
if (!DIFICULTADES[elegida]) elegida = 'cadete';
aplicarDificultad(elegida);

function insertar() {
  if (esDemo) return;
  const intro = document.querySelector('#modalCaja .intro');
  const btn = intro?.querySelector('#btnEmpezar');
  if (!btn || intro.querySelector('.dificultad')) return;
  const caja = document.createElement('div');
  caja.className = 'dificultad';
  caja.innerHTML = `<div class="dif-tit">${t('dif.tit')}</div>
    <div class="dif-opciones">${Object.entries(DIFICULTADES).map(([id, d]) => `
      <button type="button" class="dif-op" data-dif="${id}">
        <span class="dif-ic">${d.icono}</span><b>${t(`dif.${id}.n`)}</b><small>${t(`dif.${id}.e`)}</small><em>${t(`dif.${id}.r`)}</em>
      </button>`).join('')}</div>`;
  intro.insertBefore(caja, btn);
  caja.addEventListener('click', e => {
    const b = e.target.closest('[data-dif]');
    if (b) elegir(b.dataset.dif);
  });
  marcar();
}

function elegir(id) {
  elegida = id;
  try { localStorage.setItem(CLAVE, id); } catch { /* sin almacenamiento */ }
  aplicarDificultad(id);
  marcar();
}

// Actualizar los textos de la intro que mencionan sols y segundos
function actualizarTextos() {
  const D = DIFICULTADES[elegida];
  document.querySelectorAll('#modalCaja .intro b').forEach(b => {
    if (/^\d+ sols$/.test(b.textContent)) b.textContent = `${MISION.maxSol} sols`;
    if (/^\d+ (segundos|seconds)$/.test(b.textContent)) b.textContent = t('intro.c3b', { s: D.tiempoEmergencia });
  });
}

function marcar() {
  document.querySelectorAll('.dif-op').forEach(b => b.classList.toggle('sel', b.dataset.dif === elegida));
  actualizarTextos();
}

const s = document.createElement('style');
s.textContent = `
  .dificultad { margin: 12px 0 4px; }
  .dif-tit { font-weight: 900; margin-bottom: 6px; }
  .dif-opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .dif-op { text-align: center; background: var(--vidrio2); border: 2px solid var(--borde); border-radius: 16px; padding: 10px; color: var(--texto); }
  .dif-op:hover { border-color: var(--acento); }
  .dif-op.sel { border-color: var(--acento); background: rgba(255,179,71,.15); box-shadow: 0 0 14px rgba(255,179,71,.4); }
  .dif-ic { display: block; font-size: 30px; }
  .dif-op b { display: block; font-size: 18px; }
  .dif-op small { display: block; color: var(--acento); font-weight: 700; }
  .dif-op em { display: block; font-style: normal; font-size: 12px; color: var(--suave); margin-top: 4px; }
  @media (max-width: 500px) { .dif-opciones { grid-template-columns: 1fr; } }`;
document.head.appendChild(s);

new MutationObserver(insertar).observe(document.querySelector('#modalCaja') || document.body, { childList: true, subtree: true });
insertar();
