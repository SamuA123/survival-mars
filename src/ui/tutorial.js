// Tutorial guiado del Sol 1. Un globo de diálogo señala elementos y espera a que el niño actúe.
import { balance } from '../sim/motor.js';
import { beep } from './sonido.js';
import { t, esEN, onIdioma } from './i18n.js';
const L = (es, en) => esEN() ? en : es;

const CLAVE = 'survivalMars.tutorialVisto.v2';
export function tutorialVisto() { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } }
function marcarVisto() { try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ } }

// objetivo: selector CSS a resaltar · espera: condición para avanzar sola (si no hay, botón "Siguiente")
// Cada paso usa texto bilingüe y una acción verificable cuando corresponde.
const PASOS = [
  { objetivo: null, texto: () => L('👋 Tu misión: mantener a la tripulación con aire y comida, y conseguir ciencia hasta que llegue la nave. Practiquemos tu primera decisión.', '👋 Your mission: keep the crew supplied with air and food, and collect science until the ship arrives. Let’s practise your first decision.') },
  { objetivo: '.etiqueta[data-edificio="habitat"]', abrir: 'habitat', texto: () => L('🏠 Abre el Hábitat. Aquí controlas el aire y la protección de la tripulación.', '🏠 Open the Habitat. This is where you control the crew’s air supply and shielding.'), espera: c => c.sel === 'habitat' },
  { objetivo: '.sis[data-foco="vital"]', texto: () => L('🫁 El soporte vital usa electricidad para fabricar oxígeno. En nivel 2 mantiene el aire estable. Déjalo en 2 mientras aprendemos.', '🫁 Life support uses power to make oxygen. Level 2 keeps the air supply steady. Leave it at 2 while we learn.') },
  { objetivo: '.etiqueta[data-edificio="lab"]', abrir: 'lab', texto: () => L('🔬 Ahora abre el Laboratorio. Cada edificio tiene un panel diferente con su función y sus controles.', '🔬 Now open the Laboratory. Each building has a different panel with its own purpose and controls.'), espera: c => c.sel === 'lab' },
  { objetivo: '.sis[data-foco="lab"] [data-d="1"]', texto: () => L('Pulsa + una vez para encender los experimentos. Mira cuánta ciencia ganarás al terminar el sol.', 'Press + once to switch on the experiments. Look at how much science you will gain when the sol ends.'), espera: c => c.S.niveles.lab > 0 },
  { objetivo: '#energia', texto: c => t('tuto.7', { e: balance(c.S).bal >= 0 ? t('tuto.7.sobra') : t('tuto.7.falta') }) },
  { objetivo: '#btnTarea', texto: () => L('📋 La tarea del día llega por la antena. Es opcional y da un premio. Si apagas las comunicaciones, no recibes nuevas tareas ni avisos.', '📋 The daily task arrives through the antenna. It is optional and gives a reward. With communications off, you receive no new tasks or alerts.') },
  { objetivo: '.etiqueta[data-edificio="rover"]', abrir: 'rover', texto: () => L('🚙 Abre el Rover para ver cómo salir a explorar. Cada segundo afuera gasta oxígeno; lo recogido se entrega al volver. Hoy puedes quedarte dentro y practicar la energía.', '🚙 Open the Rover to see how to explore. Every second outside uses oxygen; collected items are delivered when you return. Today you can stay inside and practise managing power.'), espera: c => c.sel === 'rover' },
  { objetivo: '#btnSol', final: true, texto: () => L('🌙 Tu plan está listo. Pulsa Terminar el Sol para ver qué cambió. Después revisa el invernadero: la comida se consume cada sol y hay que reponerla.', '🌙 Your plan is ready. Press End the Sol to see what changed. Then check the greenhouse: food is used every sol and must be replenished.'), espera: () => false },
];

export function iniciarTutorial(contexto) {
  let i = -1, timer = null;
  const globo = document.createElement('div');
  globo.className = 'tuto-globo';
  const foco = document.createElement('div');
  foco.className = 'tuto-foco';
  document.body.append(foco, globo);

  function terminar(completado = false) {
    clearInterval(timer);
    dejarIdioma();
    globo.remove(); foco.remove();
    if (completado) marcarVisto();
  }

  function siguiente() {
    i++;
    if (i >= PASOS.length) return terminar(true);
    beep(820, 0.06);
    dibujar();
  }

  function dibujar() {
    const p = PASOS[i];
    const txt = typeof p.texto === 'function' ? p.texto(contexto()) : p.texto;
    globo.innerHTML = `<div class="tuto-txt">${txt}</div>
      <div class="tuto-pie"><button class="tuto-saltar">${t('tuto.saltar')}</button>
      <span>${i + 1}/${PASOS.length}</span>
      ${p.abrir ? `<button class="tuto-abrir" data-sel="${p.abrir}">${L('Abrir', 'Open')} ${t('ed.' + p.abrir)}</button>` : ''}
      ${p.espera ? '' : `<button class="tuto-sig">${p.final ? t('tuto.ok') : t('tuto.sig')}</button>`}</div>`;
    globo.querySelector('.tuto-saltar').onclick = () => terminar(false);
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
  return { terminar, activo: () => globo.isConnected, ultimoPaso: () => i === PASOS.length - 1 };
}
