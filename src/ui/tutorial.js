// Tutorial guiado del Sol 1. Un globo de diálogo señala elementos y espera a que el niño actúe.
import { balance } from '../sim/motor.js';
import { beep } from './sonido.js';

const CLAVE = 'survivalMars.tutorialVisto';
export function tutorialVisto() { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } }
function marcarVisto() { try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ } }

// objetivo: selector CSS a resaltar · espera: condición para avanzar sola (si no hay, botón "Siguiente")
const PASOS = [
  { objetivo: null, texto: '👋 ¡Hola, comandante! Esta es tu base en Marte. Te enseño cómo funciona en 30 segundos.' },
  { objetivo: '.etiqueta[data-edificio="habitat"]', texto: '👆 <b>Toca el Hábitat</b>, la cúpula blanca donde vive tu tripulación.',
    espera: c => c.sel === 'habitat' },
  { objetivo: '.control', texto: 'Aquí está el <b>soporte vital</b>: fabrica el oxígeno. Los botones <b>−</b> y <b>+</b> cambian cuánta energía usa. Déjalo en 2 por ahora.' },
  { objetivo: '#energia', texto: '⚡ Esta barra es tu <b>energía de hoy</b>. Verde = lo que produces. Naranja = lo que gastas. ¡Si gastas más de lo que produces, la batería baja!' },
  { objetivo: '.etiqueta[data-edificio="lab"]', texto: '🔬 Ahora <b>toca el Laboratorio</b>. Ahí se hace la ciencia de la misión.',
    espera: c => c.sel === 'lab' },
  { objetivo: '.control', texto: 'Pulsa <b>+</b> para encender los experimentos.',
    espera: c => c.S.niveles.lab > 0 },
  { objetivo: '#energia', texto: c => `¿Ves? Ahora gastas más energía (${balance(c.S).bal >= 0 ? 'te sobra menos' : '¡te falta!'}). <b>En Marte nada es gratis:</b> la ciencia cuesta energía, y la energía es para el oxígeno, la comida y el calor.` },
  { objetivo: '#btnSol', texto: '🌙 Cuando termines de planear, pulsa <b>Terminar el Sol</b>. Si llega una emergencia, ¡tendrás muy pocos segundos para decidir! ¡Buena suerte!',
    final: true },
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
      <div class="tuto-pie"><button class="tuto-saltar">Saltar tutorial</button>
      <span>${i + 1}/${PASOS.length}</span>
      ${p.espera ? '' : `<button class="tuto-sig">${p.final ? '¡Entendido!' : 'Siguiente ▶'}</button>`}</div>`;
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
