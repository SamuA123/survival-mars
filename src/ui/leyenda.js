// =====================================================================
//  📖 LEYENDA: qué significa cada ícono, palabra y tecla del juego.
//  Botón arriba (junto a NASA) y dentro del modo construcción. Esc cierra.
//  Capa propia por encima de las demás ventanas: se puede abrir con otra abierta.
// =====================================================================
import { MISION } from '../sim/config.js';
import { esEN, onIdioma, setIdioma, t } from './i18n.js';
import { beep } from './sonido.js';

const L = (es, en) => esEN() ? en : es;
let capa = null;

const grupos = () => [
  { tit: L('Lo que hay que cuidar', 'What you need to look after'), items: [
    ['⚡', L('Energía', 'Power'), L('La electricidad de la base. Se mide en kWh. Si se acaba, hay apagón.', 'The base\'s electricity, measured in kWh. If it runs out, there is a blackout.')],
    ['🫁', L('Oxígeno', 'Oxygen'), L('El aire para respirar. Lo fabrica el soporte vital.', 'The air to breathe. Life support makes it.')],
    ['🥔', L('Comida', 'Food'), L('La tripulación come cada sol. La da el invernadero.', 'The crew eats every sol. The greenhouse grows it.')],
    ['❤️', L('Salud', 'Health'), L('Cómo se siente la tripulación. Baja con hambre, frío o poco aire.', 'How the crew feels. It drops with hunger, cold or little air.')],
    ['☢️', L('Radiación', 'Radiation'), L(`Energía invisible del espacio que daña el cuerpo. Se suma día a día; el límite de la misión es ${MISION.radLimite} mSv.`, `Invisible energy from space that harms the body. It adds up day by day; the mission limit is ${MISION.radLimite} mSv.`)],
    ['🔬', L('Ciencia', 'Science'), L(`Puntos por experimentos y rocas. Con ${MISION.metaCiencia} ganas la segunda estrella.`, `Points from experiments and rocks. ${MISION.metaCiencia} earns the second star.`)],
  ] },
  { tit: L('Cosas que juntas', 'Things you collect'), items: [
    ['🟫', L('Regolito', 'Regolith'), L('Tierra suelta de Marte. Con ella construyes el blindaje y otras obras.', 'Loose Martian soil. You use it to build the shield and other buildings.')],
    ['🪨', L('Roca marciana', 'Martian rock'), L('El laboratorio la estudia y te da ciencia.', 'The lab studies it and gives you science.')],
    ['🧊', L('Hielo de agua', 'Water ice'), L('Se convierte en oxígeno.', 'It is turned into oxygen.')],
    ['🧰', L('Repuesto', 'Spare part'), L('Arregla máquinas rotas en una emergencia.', 'Fixes broken machines in an emergency.')],
    ['💊', L('Botiquín', 'First-aid kit'), L('Medicina para un astronauta enfermo.', 'Medicine for a sick astronaut.')],
    ['💡', L('Invento', 'Invention'), L('Una mejora para la base. El laboratorio te deja elegir uno cada vez que juntas más ciencia.', 'An upgrade for the base. The lab lets you pick one each time you collect more science.')],
  ] },
  { tit: L('Palabras de la misión', 'Mission words'), items: [
    ['☀️', L('Sol', 'Sol'), L('Un día en Marte. Dura 24 horas y 40 minutos.', 'A day on Mars. It lasts 24 hours and 40 minutes.')],
    ['📏', 'mSv', L('Milisievert: la unidad para medir cuánta radiación recibe una persona.', 'Millisievert: the unit for how much radiation a person gets.')],
    ['🌌', L('Radiación diaria', 'Daily radiation'), L('La que llega todos los días desde el espacio, de todos lados. Las paredes la frenan mejor.', 'The radiation that arrives every day from space, from every side. Walls block it best.')],
    ['💥', L('Llamarada solar', 'Solar flare'), L('Una explosión en el Sol que lanza muchas partículas de golpe. Llegan desde arriba: el techo las frena mejor.', 'An explosion on the Sun that throws out lots of particles at once. They come from above: the roof blocks them best.')],
    ['🟩', L('Barrita verde', 'Green bar'), L('Cuánto protege una parte del blindaje: más cuadros verdes, menos radiación entra.', 'How much a part of the shield protects: more green squares, less radiation gets in.')],
    ['🧱', L('Blindaje', 'Shield'), L('Paredes y techo de regolito que cubren el hábitat.', 'Regolith walls and roof covering the habitat.')],
    ['🛡️', L('Refugio', 'Shelter'), L('La parte más protegida de la base. Ahí nadie trabaja, pero recibe menos radiación.', 'The best-protected part of the base. Nobody works there, but they get less radiation.')],
    ['📟', L('Dosímetro', 'Dosimeter'), L('Aparato que cada astronauta lleva para medir su radiación.', 'A device each astronaut wears to measure their radiation.')],
    ['🧑‍🚀', L('Caminata espacial', 'Spacewalk'), L('Salir de la base con el traje. Gasta aire del traje y da radiación.', 'Going outside in a suit. It uses suit air and gives radiation.')],
    ['📡', L('Retraso', 'Delay'), L('Un mensaje tarda unos 12 minutos en llegar de Marte a la Tierra.', 'A message takes about 12 minutes to travel from Mars to Earth.')],
    ['🗺️', L('Minimapa y radar', 'Minimap and radar'), L('Abajo a la derecha cuando caminas afuera. En Comandante, el radar del traje solo muestra lo que está cerca: hay que explorar.', 'Bottom right when you walk outside. In Commander, the suit radar only shows what is close: you have to explore.')],
    ['🌞', L('Conjunción solar', 'Solar conjunction'), L('El Sol queda entre Marte y la Tierra y no se puede hablar con nadie.', 'The Sun is between Mars and Earth, so you cannot talk to anyone.')],
  ] },
  { tit: L('Teclas', 'Keys'), items: [
    ['⌨️', 'W A S D', L('Caminar afuera (también las flechas).', 'Walk outside (the arrow keys work too).')],
    ['⌨️', 'E', L('En la base: salir a explorar. Afuera: recoger o entrar a la base.', 'In the base: go exploring. Outside: pick up or go into the base.')],
    ['⌨️', '1 2 3 4', L('Elegir quién sale a caminar (y opciones en una emergencia).', 'Choose who goes on the spacewalk (and options in an emergency).')],
    ['⌨️', 'R', L('Soltar algo de la mochila.', 'Drop something from the backpack.')],
    ['⌨️', 'B', L('Abrir el modo construcción.', 'Open build mode.')],
    ['⌨️', 'Enter', L('Seguir.', 'Continue.')],
    ['⌨️', 'Esc', L('Cerrar.', 'Close.')],
  ] },
];

function pintar() {
  if (!capa) return;
  capa.innerHTML = `
    <div class="ley-caja" role="dialog" aria-modal="true" aria-labelledby="leyTit">
      <div class="ley-cab"><h2 id="leyTit">📖 ${L('¿Qué significa?', 'What does it mean?')}</h2>
        <button type="button" class="chip-btn" data-ley-idioma>${esEN() ? '🌐 Español' : '🌐 English'}</button>
        <button type="button" class="ley-cerrar" aria-label="${L('Cerrar', 'Close')}">✕</button></div>
      ${grupos().map(g => `<h3>${g.tit}</h3><div class="ley-lista">${g.items.map(([ic, n, d]) => `
        <div class="ley-item"><span class="ley-ic">${ic}</span><div><b>${n}</b><small>${d}</small></div></div>`).join('')}</div>`).join('')}
      <button type="button" class="btn-grande ley-cerrar">${L('Entendido', 'Got it')} <kbd class="tecla">Esc</kbd></button>
    </div>`;
  capa.querySelector('.btn-grande')?.focus({ preventScroll: true });
}

export function abrirLeyenda() {
  if (capa) return;
  capa = document.createElement('div');
  capa.className = 'ley-capa';
  capa.addEventListener('click', e => {
    if (e.target.closest('[data-ley-idioma]')) return setIdioma(esEN() ? 'es' : 'en');
    if (e.target === capa || e.target.closest('.ley-cerrar')) cerrarLeyenda();
  });
  document.body.appendChild(capa);
  beep(700, 0.06);
  pintar();
}
export function cerrarLeyenda() { capa?.remove(); capa = null; }
onIdioma(() => { pintar(); ponerBotones(); });

// Esc cierra la leyenda antes que cualquier otra ventana (captura y se detiene aquí)
addEventListener('keydown', e => {
  if (!capa) return;
  if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); cerrarLeyenda(); }
}, true);

// Botón arriba y botón dentro del modo construcción
function ponerBotones() {
  const nav = document.querySelector('.botones-top');
  if (nav && !nav.querySelector('#btnLeyenda')) {
    const b = document.createElement('button');
    b.id = 'btnLeyenda'; b.className = 'chip-btn'; b.textContent = '📖';
    b.addEventListener('click', abrirLeyenda);
    nav.insertBefore(b, document.querySelector('#btnIdioma'));
  }
  const top = document.querySelector('#btnLeyenda');
  if (top) { top.title = L('¿Qué significa cada ícono?', 'What does each icon mean?'); top.setAttribute('aria-label', top.title); }
  const cons = document.querySelector('.cons-caja');
  if (cons && !cons.querySelector('.cons-leyenda')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cons-leyenda';
    b.addEventListener('click', e => { e.stopPropagation(); abrirLeyenda(); });
    cons.querySelector('h2')?.after(b);
  }
  const cb = document.querySelector('.cons-leyenda');
  if (cb) cb.textContent = L('📖 ¿Qué significa cada cosa?', '📖 What does each thing mean?');
}
let pendiente = false;
new MutationObserver(() => {
  if (pendiente) return;
  pendiente = true;
  setTimeout(() => { pendiente = false; ponerBotones(); }, 60);
}).observe(document.body, { childList: true, subtree: true });
ponerBotones();

const css = document.createElement('style');
css.textContent = `
  .ley-capa { position: fixed; inset: 0; z-index: 70; background: rgba(10,4,2,.6); display: grid; place-items: center; padding: 12px; }
  .ley-caja { width: min(760px, 100%); max-height: 92vh; overflow-y: auto; background: var(--papel, #fff7ea); color: var(--tinta, #2b1408);
    border: 3px solid var(--tinta, #2b1408); border-radius: 20px; padding: 14px 18px; box-shadow: 0 8px 0 var(--tinta, #2b1408); }
  .ley-cab { display: flex; align-items: center; gap: 8px; position: sticky; top: -14px; background: inherit; padding: 4px 0; z-index: 1; }
  .ley-cab h2 { margin: 0; flex: 1; font-size: 22px; }
  .ley-cab .chip-btn { width: auto; height: auto; min-width: 0; border-radius: 999px; padding: 5px 12px; white-space: nowrap; font-size: 14px; }
  .ley-cerrar:not(.btn-grande) { border: 0; background: none; font-size: 22px; cursor: pointer; color: inherit; }
  .ley-caja h3 { margin: 12px 0 6px; font-size: 15px; text-transform: uppercase; letter-spacing: .5px; opacity: .75; }
  .ley-lista { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; }
  .ley-item { display: grid; grid-template-columns: 32px 1fr; gap: 8px; align-items: start; padding: 6px 8px; border-radius: 10px; background: rgba(160,82,45,.1); }
  .ley-ic { font-size: 22px; text-align: center; }
  .ley-item b { display: block; font-size: 14px; }
  .ley-item small { display: block; font-size: 12px; line-height: 1.3; }
  .ley-caja .btn-grande { margin-top: 12px; width: 100%; }
  .cons-leyenda { border: 2px solid currentColor; background: none; color: inherit; border-radius: 999px; padding: 3px 12px; font-weight: 700; cursor: pointer; margin: 0 0 8px; }`;
document.head.appendChild(css);
