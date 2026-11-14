// Hallazgos REALES de estudios de la NASA (Open Science Data Repository, OSDR)
// que el juego muestra como "Lo que dice la ciencia real" según lo que pasó en el sol.
// Formato: { id, tema, texto (para niños de 7-12), fuente (clave en fuentes.js), estudio, url }
//
// Temas que usa el simulador hoy: 'radiacion' (tras una llamarada), 'comida' (comida < 30),
// 'oxigeno' (oxígeno < 50). La lista se mezcla en cada partida.
// Temas extra disponibles para nuevas mecánicas: 'ejercicio', 'plaga', 'ojos'.
//
// Verificado el 14/11/2026 con la API de búsqueda de OSDR (https://osdr.nasa.gov/osdr/data/search).
const LISTA = [
  // ---------- Radiación ----------
  { id: 'radiacion-defensas', tema: 'radiacion', fuente: 'OSD-566', estudio: 'OSD-566',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-566',
    texto: 'Los científicos de la NASA exponen ratones a radiación como la del espacio para ver cómo cambian sus defensas (el sistema inmune) y sus hormonas. ¡La radiación puede dañar el ADN de las células! Por eso refugiarse durante una llamarada es tan importante.',
    texto_en: 'NASA scientists expose mice to radiation like the one in space to see how their defenses (the immune system) and hormones change. Radiation can damage the DNA in cells! That is why taking shelter during a solar flare is so important.' },

  // ---------- Oxígeno / energía del cuerpo ----------
  { id: 'mitocondrias', tema: 'oxigeno', fuente: 'OSD-343', estudio: 'OSD-343',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-343',
    texto: 'Un gran estudio de la NASA con datos de 59 astronautas y del famoso Estudio de Gemelos descubrió que en el espacio las mitocondrias se estresan. Son las "centrales de energía" de cada célula, y usan el oxígeno que respiras para darte energía.',
    texto_en: 'A big NASA study with data from 59 astronauts and the famous Twins Study found that in space the mitochondria get stressed. They are the "power plants" of every cell, and they use the oxygen you breathe to give you energy.' },

  // ---------- Comida / plantas ----------
  { id: 'tomates-veg05', tema: 'comida', fuente: 'OSD-766', estudio: 'OSD-766',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-766',
    texto: 'Entre 2022 y 2023, los astronautas cultivaron tomates enanos durante 101 días en la Estación Espacial (experimento VEG-05). Probaron luces LED más rojas y más azules para ver cuál ayudaba más a las plantas.',
    texto_en: 'Between 2022 and 2023, astronauts grew dwarf tomatoes for 101 days on the Space Station (the VEG-05 experiment). They tried redder and bluer LED lights to see which one helped the plants more.' },
  { id: 'plantas-luz', tema: 'comida', fuente: 'OSD-678', estudio: 'OSD-678',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-678',
    texto: 'En el espacio no hay "arriba" ni "abajo". El experimento CARA mostró que la luz es una de las guías más importantes para que las raíces de las plantas sepan hacia dónde crecer.',
    texto_en: 'In space there is no "up" or "down". The CARA experiment showed that light is one of the most important guides that tells plant roots which way to grow.' },

  // ---------- Ejercicio / huesos y músculos ----------
  { id: 'musculo-hueso', tema: 'ejercicio', fuente: 'OSD-342', estudio: 'OSD-342',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-342',
    texto: 'Unos ratones que pasaron 33 días en la Estación Espacial perdieron mucho músculo y hueso (estudio Rodent Research-19). Por eso los astronautas hacen ejercicio unas 2 horas todos los días.',
    texto_en: 'Some mice that spent 33 days on the Space Station lost a lot of muscle and bone (the Rodent Research-19 study). That is why astronauts exercise about 2 hours every day.' },

  // ---------- Plagas en el invernadero ----------
  { id: 'zinnias-hongo', tema: 'plaga', fuente: 'OSD-177', estudio: 'OSD-177',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-177',
    texto: 'En 2016, unas flores llamadas zinnias se enfermaron con un hongo (Fusarium) en la Estación Espacial. Los astronautas tuvieron que cuidarlas como jardineros. ¡Las plagas también viajan al espacio!',
    texto_en: 'In 2016, some flowers called zinnias got sick with a fungus (Fusarium) on the Space Station. The astronauts had to take care of them like gardeners. Pests travel to space too!' },

  // ---------- Ojos ----------
  { id: 'retina', tema: 'ojos', fuente: 'OSD-87', estudio: 'OSD-87',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-87',
    texto: 'Ratones que viajaron en el último vuelo del transbordador espacial (STS-135) mostraron cambios en la retina, la parte del ojo que capta la luz. Algunos astronautas también notan cambios en la vista después de misiones largas.',
    texto_en: 'Mice that flew on the last Space Shuttle flight (STS-135) showed changes in the retina, the part of the eye that catches light. Some astronauts also notice changes in their eyesight after long missions.' },

  // ---------- Estudios OSDR aportados por Jorge ----------
  { id: 'bazo', tema: 'radiacion', fuente: 'osdr', estudio: 'OSD-360', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-360',
    texto: 'Científicos expusieron ratones a dosis pequeñas de radiación espacial y vieron que cambia la química del bazo, un órgano que ayuda a defenderse de las enfermedades.',
    texto_en: 'Scientists exposed mice to small doses of space radiation and saw that it changes the chemistry of the spleen, an organ that helps fight disease.' },
  { id: 'corazon', tema: 'radiacion', fuente: 'osdr', estudio: 'OSD-334', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-334',
    texto: 'Las partículas más pesadas de la radiación espacial pueden dañar tejidos como el del corazón. La NASA estudia medicinas para protegerlos.',
    texto_en: 'The heaviest particles in space radiation can damage tissues like the heart. NASA is studying medicines to protect them.' },
  { id: 'intestino', tema: 'radiacion', fuente: 'osdr', estudio: 'OSD-146', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-146',
    texto: 'La radiación espacial cambia hasta las bacterias buenas que viven en el intestino. Por eso no basta con mirar la piel: afecta a todo el cuerpo.',
    texto_en: 'Space radiation even changes the good bacteria that live in the gut. That is why looking at the skin is not enough: it affects the whole body.' },
  { id: 'lechuga', tema: 'comida', fuente: 'osdr', estudio: 'OSD-268', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-268',
    texto: 'Los astronautas cultivaron lechuga roja en la Estación Espacial (experimento Veggie) y los científicos revisaron sus microbios y nutrientes para ver si era buena para comer.',
    texto_en: 'Astronauts grew red lettuce on the Space Station (the Veggie experiment) and scientists checked its microbes and nutrients to see if it was good to eat.' },
  { id: 'chiles', tema: 'comida', fuente: 'osdr', estudio: 'OSD-772', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-772',
    texto: 'En 2021 crecieron chiles en la Estación Espacial (experimento PH-04). ¡La tripulación los probó en tacos!',
    texto_en: 'In 2021 chile peppers grew on the Space Station (the PH-04 experiment). The crew tried them in tacos!' },
  { id: 'raices', tema: 'comida', fuente: 'osdr', estudio: 'OSD-615', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-615',
    texto: 'Sin gravedad, las raíces de las plantas cambian por dentro: sus paredes se construyen distinto. Cultivar en el espacio no es igual que en la Tierra.',
    texto_en: 'Without gravity, plant roots change on the inside: their walls are built differently. Growing plants in space is not the same as on Earth.' },
];

// Se mezclan al cargar para que cada partida muestre hallazgos distintos (idea de Jorge).
function mezclar(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const HALLAZGOS = mezclar(LISTA);
