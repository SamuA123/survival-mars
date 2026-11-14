// Tutorial guiado del Sol 1. Un globo de diálogo señala elementos y espera a que el niño actúe.
import { balance } from '../sim/motor.js';
import { beep } from './sonido.js';
import { t } from './i18n.js';

const CLAVE = 'survivalMars.tutorialVisto';
export function tutorialVisto() { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } }
function marcarVisto() { try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ } }

// objetivo: selector CSS a resaltar · espera: condición para avanzar sola (si no hay, botón "Siguiente")
// Los textos están en src/ui/i18n.js (tuto.1 … tuto.8)
const PASOS = [
  { objetivo: null, texto: () => t('tuto.1') },
  { objetivo: '.etiqueta[data-edificio="habitat"]', texto: () => t('tuto.2'), espera: c => c.sel === 'habitat' },
  { objetivo: '.control', texto: () => t('tuto.3') },
  { objetivo: '#energia', texto: () => t('tuto.4') },
  { objetivo: '.etiqueta[data-edificio="lab"]', texto: () => t('tuto.5'), espera: c => c.sel === 'lab' },
  { objetivo: '.control', texto: () => t('tuto.6'), espera: c => c.S.niveles.lab > 0 },
  { objetivo: '#energia', texto: c => t('tuto.7', { e: balance(c.S).bal >= 0 ? t('tuto.7.sobra') : t('tuto.7.falta') }) },
  { objetivo: '#btnSol', texto: () => t('tuto.8'), final: true },
];

export function iniciarTutorial(contexto) {
  let i = -1, timer = null;
  const globo = document.createElement('div');
  globo.className = 'tuto-globo';
  const foco = document.createElement('div');
  foco.className = 'tuto-foco';
  document.body.append(foco, globo);

  function terminar() {
    clearInterval(timer);
    globo.remove(); foco.remove();
    marcarVisto();
  }

  function siguiente() {
    i++;
    if (i >= PASOS.length) return terminar();
    beep(820, 0.06);
    const p = PASOS[i];
    const txt = typeof p.texto === 'function' ? p.texto(contexto()) : p.texto;
    globo.innerHTML = `<div class="tuto-txt">${txt}</div>
      <div class="tuto-pie"><button class="tuto-saltar">${t('tuto.saltar')}</button>
      <span>${i + 1}/${PASOS.length}</span>
      ${p.espera ? '' : `<button class="tuto-sig">${p.final ? t('tuto.ok') : t('tuto.sig')}</button>`}</div>`;
    globo.querySelector('.tuto-saltar').onclick = terminar;
    const sig = globo.querySelector('.tuto-sig');
    if (sig) sig.onclick = siguiente;
    colocar();
  }

  function colocar() {
    const p = PASOS[i];
    const el = p?.objetivo && document.querySelector(p.objetivo);
    if (!el) {
      foco.style.display = 'none';
      Object.assign(globo.style, { left: '50%', top: '96px', transform: 'translateX(-50%)' });
      return;
    }
    const r = el.getBoundingClientRect();
    foco.style.display = 'block';
    Object.assign(foco.style, { left: r.left - 8 + 'px', top: r.top - 8 + 'px', width: r.width + 16 + 'px', height: r.height + 16 + 'px' });
    const gw = globo.offsetWidth, gh = globo.offsetHeight;
    let top = r.bottom + 16;
    if (top + gh > innerHeight - 10) top = r.top - gh - 16;
    const left = Math.min(Math.max(10, r.left + r.width / 2 - gw / 2), innerWidth - gw - 10);
    Object.assign(globo.style, { left: left + 'px', top: Math.max(10, top) + 'px', transform: 'none' });
  }

  timer = setInterval(() => {
    const p = PASOS[i];
    if (!p) return;
    if (p.espera && p.espera(contexto())) return siguiente();
    colocar();
  }, 150);

  siguiente();
  return { terminar, activo: () => globo.isConnected };
}
