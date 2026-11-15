// =====================================================================
//  👩‍🚀 TRIPULACIÓN CON DOSÍMETROS
//  - elegirAstronauta(S): antes de la caminata, elegir quién sale (por defecto, quien
//    tiene menos dosis). Devuelve el id o null si se cancela. Botones grandes (celular).
//  - dosimetrosHTML(S): los 4 dosímetros para el panel de tripulación.
//  Textos bilingües con L(es, en); estilos inyectados.
// =====================================================================
import { MISION } from '../sim/config.js';
import { menorDosis } from '../sim/motor.js';
import { beep } from './sonido.js';
import { esEN, onIdioma, setIdioma } from './i18n.js';
import { botonIdioma } from './construccion.js';

const L = (es, en) => esEN() ? en : es;
const hex = n => '#' + Number(n).toString(16).padStart(6, '0');
const pct = d => Math.min(100, Math.round(d / MISION.radLimite * 100));
const n1 = v => (Math.round(v * 10) / 10).toLocaleString(L('es', 'en'));
const nivel = d => pct(d) > 70 ? 'alto' : pct(d) > 45 ? 'medio' : 'bajo';

export const MENSAJE_NASA = () => L(
  '💡 Cada astronauta lleva su dosímetro y la NASA busca que nadie reciba más radiación de la necesaria: repartir las salidas ayuda.',
  '💡 Each astronaut wears a dosimeter, and NASA tries to keep everyone\'s radiation as low as possible: taking turns outside helps.');

// Un dosímetro (tarjeta) por astronauta
function tarjeta(a, { boton = false, elegido = false, menor = false } = {}) {
  const contenido = `
    <span class="dos-casco" style="--c:${hex(a.color)}">🧑‍🚀</span>
    <span class="dos-txt"><b>${a.nombre}</b>${menor ? `<em>${L('menos dosis', 'lowest dose')}</em>` : ''}
      <span class="dos-barra ${nivel(a.dosis)}" title="${n1(a.dosis)} ${L('de', 'of')} ${MISION.radLimite} mSv"><i style="width:${pct(a.dosis)}%"></i></span>
      <small>☢️ ${n1(a.dosis)} mSv · ${pct(a.dosis)}% ${L('del límite', 'of the limit')}</small></span>`;
  return boton
    ? `<button type="button" class="dos-card ${elegido ? 'sel' : ''}" data-astro="${a.id}" aria-pressed="${elegido}" style="--c:${hex(a.color)}">${contenido}</button>`
    : `<div class="dos-card" style="--c:${hex(a.color)}">${contenido}</div>`;
}

export function dosimetrosHTML(S) {
  if (!S.tripulacion?.length) return '';
  const menor = menorDosis(S);
  return `<div class="dosimetros">
      <h4>📟 ${L('Dosímetros de la tripulación', 'Crew dosimeters')}</h4>
      ${S.tripulacion.map(a => tarjeta(a, { menor: a.id === menor?.id && S.tripulacion.some(b => b.dosis !== a.dosis) })).join('')}
      <p class="dos-nota">${L(`El límite de ${MISION.radLimite} mSv es para cada persona. Fondo y llamaradas afectan a todos; la caminata, solo a quien sale.`,
        `The ${MISION.radLimite} mSv limit is for each person. Background radiation and flares affect everyone; a spacewalk only affects whoever goes out.`)}</p>
      <p class="dos-nota">${MENSAJE_NASA()}</p>
    </div>`;
}

// Selector antes de la caminata. Resuelve con el id elegido o null (cancelar / Esc).
export function elegirAstronauta(S) {
  return new Promise(resolver => {
    if (!S.tripulacion?.length) return resolver(null);
    let elegido = menorDosis(S)?.id;
    const capa = document.createElement('div');
    capa.className = 'dos-capa';
    const pintar = () => {
      const a = S.tripulacion.find(x => x.id === elegido);
      capa.innerHTML = `
        <div class="dos-caja" role="dialog" aria-modal="true" aria-label="${L('Elige quién sale', 'Choose who goes out')}">
          ${botonIdioma()}
          <h2>🧑‍🚀 ${L('¿Quién sale a la caminata?', 'Who goes on the spacewalk?')}</h2>
          <p>${L('Afuera, solo quien sale recibe la radiación de la caminata. Mira los dosímetros:', 'Outside, only the person who goes out gets the spacewalk radiation. Check the dosimeters:')}</p>
          <div class="dos-lista">${S.tripulacion.map(x => tarjeta(x, { boton: true, elegido: x.id === elegido, menor: x.id === menorDosis(S)?.id })).join('')}</div>
          <p class="dos-nota">${MENSAJE_NASA()}</p>
          <div class="dos-acciones">
            <button type="button" class="btn-grande dos-ok">🚪 ${L(`Sale ${a.nombre}`, `${a.nombre} goes out`)}</button>
            <button type="button" class="dos-cancelar">${L('Cancelar (Esc)', 'Cancel (Esc)')}</button>
          </div>
        </div>`;
    };
    // Botón ES/EN con el selector abierto: se repinta conservando a quien está elegido
    const quitarIdioma = onIdioma(() => { pintar(); capa.querySelector('.dos-ok')?.focus(); });
    const cerrar = id => { capa.remove(); quitarIdioma(); removeEventListener('keydown', teclas, true); resolver(id); };
    const teclas = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(null); }
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cerrar(elegido); }
    };
    capa.addEventListener('click', e => {
      if (e.target.closest('[data-cambiar-idioma]')) return setIdioma(esEN() ? 'es' : 'en');   // la capa tapa el ES/EN de arriba
      const b = e.target.closest('[data-astro]');
      if (b) { elegido = b.dataset.astro; beep(760, 0.05); pintar(); return; }
      if (e.target.closest('.dos-ok')) return cerrar(elegido);
      if (e.target === capa || e.target.closest('.dos-cancelar')) cerrar(null);
    });
    addEventListener('keydown', teclas, true);
    pintar();
    document.body.appendChild(capa);
    capa.querySelector('.dos-ok')?.focus();
  });
}

const css = document.createElement('style');
css.textContent = `
  .dos-capa { position: fixed; inset: 0; z-index: 30; background: rgba(10,4,2,.55); display: grid; place-items: center; padding: 12px; }
  .dos-caja { width: min(560px, 100%); max-height: 92vh; overflow-y: auto; background: var(--panel, #fff7ef); color: var(--texto, #2b140c);
    border-radius: 20px; padding: 18px; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
  .dos-caja h2 { margin: 0 0 6px; }
  .dos-caja > p { margin: 0 0 10px; font-size: 14px; }
  .dos-lista { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .dos-card { display: grid; grid-template-columns: 40px 1fr; gap: 8px; align-items: center; text-align: left; width: 100%;
    border: 2px solid rgba(160,82,45,.3); border-left: 8px solid var(--c); border-radius: 14px; padding: 8px 10px;
    background: rgba(255,255,255,.55); color: inherit; font: inherit; }
  button.dos-card { cursor: pointer; min-height: 64px; }
  button.dos-card:hover { border-color: var(--c); }
  .dos-card.sel { border-color: var(--c); box-shadow: 0 0 0 3px var(--c); background: rgba(255,255,255,.9); }
  .dos-casco { font-size: 28px; text-align: center; filter: drop-shadow(0 0 0 var(--c)); }
  .dos-txt b { font-size: 16px; }
  .dos-txt em { font-style: normal; font-size: 10px; font-weight: 900; margin-left: 6px; background: #2e7d32; color: #fff; border-radius: 999px; padding: 1px 6px; vertical-align: 2px; }
  .dos-txt small { display: block; font-size: 12px; }
  .dos-barra { display: block; height: 8px; border-radius: 999px; background: rgba(43,20,8,.12); overflow: hidden; margin: 4px 0 2px; }
  .dos-barra i { display: block; height: 100%; border-radius: 999px; background: #2e7d32; }
  .dos-barra.medio i { background: #f0a030; } .dos-barra.alto i { background: #d84315; }
  .dos-nota { font-size: 13px; margin: 8px 0 0; }
  .dos-acciones { display: grid; gap: 6px; margin-top: 10px; }
  .dos-acciones .btn-grande { margin: 0; }
  .dos-cancelar { border: 0; background: none; color: inherit; text-decoration: underline; font: inherit; font-size: 14px; cursor: pointer; padding: 6px; }
  .dosimetros { margin-top: 10px; display: grid; gap: 6px; }
  .dosimetros h4 { margin: 0; }
  @media (max-width: 520px) { .dos-lista { grid-template-columns: 1fr; } }`;
document.head.appendChild(css);
