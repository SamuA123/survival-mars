// Optional reflection: answers stay in this mission, with no analytics or uploads.
import { esEN } from './i18n.js';
const L = (es, en) => esEN() ? en : es;

export function repasoHTML(S, respuestas) {
  const preguntas = [
    {
      pregunta: L('La batería está casi vacía. ¿Qué ayuda a mantener el aire?', 'The battery is almost empty. What helps keep the air supply running?'),
      opciones: [L('Bajar el laboratorio y mantener el soporte vital', 'Turn down the lab and keep life support running'), L('Encender todos los sistemas al máximo', 'Turn every system up to maximum')],
      correcta: 0,
      explica: L('El soporte vital necesita electricidad para producir oxígeno. Ahorrar energía en ciencia deja más para el aire, a cambio de menos descubrimientos.', 'Life support needs electricity to make oxygen. Using less power for science leaves more for air, at the cost of fewer discoveries.'),
    },
    {
      pregunta: L('¿Qué cuesta refugiarse durante una tormenta de partículas?', 'What does taking shelter during a particle storm cost?'),
      opciones: [L('Nada: todos siguen trabajando igual', 'Nothing: everyone keeps working as usual'), L('Menos trabajo y cosecha, a cambio de protección', 'Less work and a smaller harvest, in exchange for protection')],
      correcta: 1,
      explica: L('En el juego, el refugio reduce la exposición, pero ese sol no hay ciencia del laboratorio y la cosecha baja. Protegerse también tiene un costo.', 'In the game, shelter reduces exposure, but the lab produces no science that sol and the harvest is smaller. Protection has a cost too.'),
    },
    {
      pregunta: L('¿Por qué Control de Misión no resuelve una emergencia de inmediato?', 'Why can’t Mission Control solve an emergency immediately?'),
      opciones: [L('Porque las señales tardan minutos en viajar', 'Because signals take minutes to travel'), L('Porque basta con subir el volumen de la radio', 'Because you just need to turn up the radio volume')],
      correcta: 0,
      explica: L('En esta misión, la señal tarda 12 minutos en ir y otros 12 en volver. La tripulación debe decidir mientras llega la respuesta. En la realidad el retraso varía con la distancia.', 'In this mission, a signal takes 12 minutes each way. The crew must decide while waiting for a reply. In real missions, the delay changes with distance.'),
    },
  ];
  const contestadas = Object.keys(respuestas).length;
  const aciertos = preguntas.filter((p, i) => respuestas[i] === p.correcta).length;
  const refugios = S.registro?.decisiones.filter(d => d.evento === 'llamarada' && d.opcion === 0).length || 0;
  const apagones = S.registro?.sols.filter(s => s.apagon).length || 0;
  return `<section class="repaso" aria-labelledby="repasoTitulo">
    <h3 id="repasoTitulo">${L('🧠 Tu turno: explica la misión', '🧠 Your turn: explain the mission')}</h3>
    <p>${L('Repaso opcional. Prueba una respuesta y descubre por qué.', 'Optional review. Try an answer and find out why.')}</p>
    ${refugios ? `<p>${L(`En tu misión elegiste el refugio ${refugios} vez/veces: protegiste a la tripulación y renunciaste al trabajo de ese sol.`, `In your mission you chose shelter ${refugios} time(s): you protected the crew and gave up that sol’s work.`)}</p>` : ''}
    ${apagones ? `<p>${L(`Hubo ${apagones} sol(s) con apagones. El motor redujo sistemas para gastar menos: revisa la batería antes de tu próxima decisión.`, `There were ${apagones} sol(s) with power cuts. Systems were turned down to use less power: check the battery before your next decision.`)}</p>` : ''}
    ${preguntas.map((p, i) => `<fieldset><legend>${i + 1}. ${p.pregunta}</legend>
      ${p.opciones.map((op, j) => `<label><input type="radio" name="repaso-${i}" value="${j}" data-pregunta="${i}" ${respuestas[i] === j ? 'checked' : ''}> ${op}</label>`).join('')}
      ${respuestas[i] === undefined ? '' : `<p class="repaso-feedback" role="status"><b>${respuestas[i] === p.correcta ? L('¡Exacto!', 'That’s right!') : L('Veamos por qué:', 'Here is why:')}</b> ${p.explica}</p>`}
    </fieldset>`).join('')}
    <p class="repaso-puntos" aria-live="polite">${L(`${contestadas}/3 respondidas · ${aciertos}/3 correctas`, `${contestadas}/3 answered · ${aciertos}/3 correct`)}</p>
  </section>`;
}

export function conectarRepaso(raiz, S, respuestas) {
  raiz.querySelectorAll('[data-pregunta]').forEach(input => {
    input.onchange = () => {
      const pregunta = input.dataset.pregunta;
      respuestas[pregunta] = Number(input.value);
      raiz.querySelector('.repaso').outerHTML = repasoHTML(S, respuestas);
      conectarRepaso(raiz, S, respuestas);
      raiz.querySelector(`[data-pregunta="${pregunta}"]:checked`)?.focus({ preventScroll: true });
    };
  });
}
