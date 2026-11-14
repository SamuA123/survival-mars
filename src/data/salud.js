// Hallazgos reales de biología espacial (NASA OSDR) que el juego muestra como consecuencia de las decisiones.
// Formato: { id, tema, texto (para niños de 7-12), fuente: 'osdr', estudio, url }
// Temas que usa el simulador hoy: 'radiacion' | 'comida'. Se mezclan al cargar para que cada partida muestre otro.
const OSD = id => `https://osdr.nasa.gov/bio/repo/data/studies/${id}`;

const LISTA = [
  { id: 'bazo', tema: 'radiacion', estudio: 'OSD-360',
    texto: 'Científicos expusieron ratones a dosis pequeñas de radiación espacial y vieron que cambia la química del bazo, un órgano que ayuda a defenderse de las enfermedades.' },
  { id: 'corazon', tema: 'radiacion', estudio: 'OSD-334',
    texto: 'Las partículas más pesadas de la radiación espacial pueden dañar tejidos como el del corazón. La NASA estudia medicinas para protegerlos.' },
  { id: 'intestino', tema: 'radiacion', estudio: 'OSD-146',
    texto: 'La radiación espacial cambia hasta las bacterias buenas que viven en el intestino. Por eso no basta con mirar la piel: afecta a todo el cuerpo.' },
  { id: 'lechuga', tema: 'comida', estudio: 'OSD-268',
    texto: 'Los astronautas cultivaron lechuga roja en la Estación Espacial (experimento Veggie) y los científicos revisaron sus microbios y nutrientes para ver si era buena para comer.' },
  { id: 'chiles', tema: 'comida', estudio: 'OSD-772',
    texto: 'En 2021 crecieron chiles en la Estación Espacial (experimento PH-04). ¡La tripulación los probó en tacos!' },
  { id: 'raices', tema: 'comida', estudio: 'OSD-615',
    texto: 'Sin gravedad, las raíces de las plantas cambian por dentro: sus paredes se construyen distinto. Cultivar en el espacio no es igual que en la Tierra.' },
];

function mezclar(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const HALLAZGOS = mezclar(LISTA.map(h => ({ ...h, fuente: 'osdr', url: OSD(h.estudio) })));
