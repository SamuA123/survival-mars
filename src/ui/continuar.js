// "¿Continuar la misión guardada?" — se muestra al abrir el juego si hay una partida guardada.
// Devuelve una promesa: true = continuar, false = empezar una misión nueva.
import { esEN } from './i18n.js';
import { DIFICULTADES } from '../sim/dificultad.js';
import { MISION } from '../sim/config.js';

const L = (es, en) => esEN() ? en : es;
const limpiar = s => String(s ?? '').replace(/[<>&"]/g, '');

export function preguntarContinuar(g) {
  return new Promise(res => {
    const D = DIFICULTADES[g.dificultad] || DIFICULTADES.comandante;
    const maxSol = { ...MISION, ...D.mision }.maxSol;
    const capa = document.createElement('div');
    capa.className = 'cont-capa';
    const pintar = () => {
      const fecha = g.fecha ? new Date(g.fecha).toLocaleString(esEN() ? 'en' : 'es', { dateStyle: 'medium', timeStyle: 'short' }) : '';
      capa.innerHTML = `
        <div class="cont-caja" role="dialog" aria-modal="true" aria-labelledby="contTit">
          <div class="cont-ic">🚀</div>
          <h2 id="contTit">${L('Tienes una misión guardada', 'You have a saved mission')}</h2>
          <p class="cont-dato"><b>${limpiar(g.S.nombre)}</b> · ${D.icono} ${L(D.nombre, D.nombre === 'Cadete' ? 'Cadet' : 'Commander')}</p>
          <p class="cont-dato">☀️ ${L('Sol', 'Sol')} <b>${g.S.sol}</b> ${L('de', 'of')} ${maxSol} · 🔬 ${g.S.ciencia} · ☢️ ${Math.round(g.S.rad * 10) / 10} mSv</p>
          ${fecha ? `<p class="cont-fecha">${L('Guardada', 'Saved')}: ${fecha}</p>` : ''}
          <button class="cont-btn si" data-r="1">▶️ ${L('Continuar misión', 'Continue mission')}</button>
          <button class="cont-btn no" data-r="0">🆕 ${L('Empezar una misión nueva', 'Start a new mission')}</button>
          <p class="cont-nota">${L('La partida se guarda sola al empezar cada sol y al volver de una caminata.', 'The game saves by itself at the start of each sol and after each spacewalk.')}</p>
        </div>`;
      capa.querySelector('.cont-btn.si').focus();
    };
    capa.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      capa.remove();
      res(b.dataset.r === '1');
    });
    document.body.appendChild(capa);
    pintar();
  });
}

if (!document.querySelector('style[data-continuar]')) {
  const s = document.createElement('style');
  s.dataset.continuar = '';
  s.textContent = `
    .cont-capa { position: fixed; inset: 0; z-index: 60; background: rgba(10,4,2,.6); display: grid; place-items: center; padding: 12px; }
    .cont-caja { background: var(--papel, #fff7ea); color: var(--tinta, #2b1408); border: 3px solid var(--tinta, #2b1408); border-radius: 20px;
      box-shadow: 0 8px 0 var(--tinta, #2b1408); padding: 18px 20px; width: min(420px, 100%); text-align: center; }
    .cont-ic { font-size: 44px; }
    .cont-caja h2 { margin: 4px 0 10px; font-family: var(--titulo, inherit); font-size: 22px; }
    .cont-dato { margin: 4px 0; font-size: 16px; }
    .cont-fecha, .cont-nota { margin: 6px 0; font-size: 12px; opacity: .75; }
    .cont-btn { display: block; width: 100%; margin-top: 10px; padding: 12px; font-size: 18px; border-radius: 14px;
      border: 3px solid var(--tinta, #2b1408); cursor: pointer; font-family: var(--titulo, inherit); }
    .cont-btn.si { background: var(--marte, #e2582c); color: #fff; box-shadow: 0 4px 0 var(--tinta, #2b1408); }
    .cont-btn.no { background: #fff; color: var(--tinta, #2b1408); }`;
  document.head.appendChild(s);
}
