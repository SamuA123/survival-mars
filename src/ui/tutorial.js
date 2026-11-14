// Tutorial guiado del Sol 1. Un globo de diálogo señala elementos y espera a que el niño actúe.
import { balance } from '../sim/motor.js';
import { beep } from './sonido.js';
import { t, esEN, onIdioma } from './i18n.js';
const L = (es, en) => esEN() ? en : es;

const CLAVE = 'survivalMars.tutorialVisto';
export function tutorialVisto() { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } }
function marcarVisto() { try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ } }

// objetivo: selector CSS a resaltar · espera: condición para avanzar sola (si no hay, botón "Siguiente")
// Los textos están en src/ui/i18n.js (tuto.1 … tuto.8)
const PASOS = [
  { objetivo: null, texto: () => t('tuto.1') },
  { objetivo: '.etiqueta[data-edificio="habitat"]', texto: () => t('tuto.2'), espera: c => c.sel === 'habitat' },
  { objetivo: '.sis[data-foco="vital"]', texto: () => L('Entraste a la <b>consola de la base</b>. Aquí está el <b>soporte vital</b>: fabrica el oxígeno. Los botones <b>−</b> y <b>+</b> cambian cuánta energía usa. Déjalo en 2 por ahora.',
      'You are in the <b>base console</b>. This is <b>life support</b>: it makes oxygen. The <b>−</b> and <b>+</b> buttons change how much power it uses. Leave it at 2 for now.') },
  { objetivo: '.con-centro', texto: () => L('🧑‍🚀 En el centro está tu <b>tripulante</b>. La barra rosa es la <b>radiación</b> que lleva en el cuerpo: si llega a la línea roja, la misión termina.',
      '🧑‍🚀 In the middle is your <b>crew member</b>. The pink bar is the <b>radiation</b> in their body: if it reaches the red line, the mission ends.') },
  { objetivo: '#energia', texto: () => L('🔋 Esta pila muestra tu batería de <b>mañana</b>. Rayas verdes = la energía que te sobra hoy. Rayas rojas = la que te falta. ¡Si se vacía, hay apagón!',
      '🔋 This battery shows your power for <b>tomorrow</b>. Green stripes = power left over today. Red stripes = power you are short. If it empties, there is a blackout!') },
  { objetivo: '.sis[data-foco="lab"] [data-d="1"]', texto: () => L('🔬 Ahora pulsa <b>+</b> en el <b>Laboratorio</b> para encender los experimentos. Ahí se hace la ciencia de la misión.',
      '🔬 Now press <b>+</b> on the <b>Laboratory</b> to turn on the experiments. That is where the mission\'s science happens.'),
    espera: c => c.S.niveles.lab > 0 },
  { objetivo: '#energia', texto: c => t('tuto.7', { e: balance(c.S).bal >= 0 ? t('tuto.7.sobra') : t('tuto.7.falta') }) },
  { objetivo: '.con-puerta', texto: () => L('🧑‍🚀 Esta es la <b>puerta</b>: desde aquí sales a explorar Marte. Afuera recoges hielo, rocas y regolito… pero gastas oxígeno y recibes radiación.',
      '🧑‍🚀 This is the <b>door</b>: from here you go out to explore Mars. Outside you collect ice, rocks and regolith… but you use oxygen and get radiation.') },
  { objetivo: '#btnTarea', texto: () => L('📋 Aquí ves la <b>tarea del día</b> que te pide Control de Misión. Es opcional: cumplirla da un premio.',
      '📋 Here is the <b>task of the day</b> from Mission Control. It is optional: completing it gives a reward.') },
  { objetivo: '#btnSol', texto: () => L('🌙 Cuando termines de planear, pulsa <b>Terminar el Sol</b>. Si llega una emergencia, ¡tendrás muy pocos segundos para decidir! Para volver a la consola, usa <b>Control base</b>. ¡Buena suerte!',
      '🌙 When you finish planning, press <b>End the Sol</b>. If an emergency comes, you will have very few seconds to decide! To go back to the console, use <b>Base control</b>. Good luck!'),
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
    dejarIdioma();
    globo.remove(); foco.remove();
    marcarVisto();
  }

  function siguiente() {
    i++;
    if (i >= PASOS.length) return terminar();
    beep(820, 0.06);
    dibujar();
  }

  function dibujar() {
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
  const dejarIdioma = onIdioma(() => { if (globo.isConnected) dibujar(); });
  return { terminar, activo: () => globo.isConnected };
}
