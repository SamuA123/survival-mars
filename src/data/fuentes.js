// Fuentes de datos usadas en el juego.
// Cada dato del juego apunta a una de estas claves con `fuente: 'clave'`.
// Se muestran al jugador en el panel "Datos de la NASA". Solo se listan fuentes que el juego USA.
// `papel`: 'mecanica' = cambia lo que pasa en la partida · 'texto' = explica lo que pasó.
export const FUENTES = {
  donki: {
    nombre: 'NASA DONKI — clima espacial',
    url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    uso: 'Las llamaradas solares de tu partida son llamaradas reales registradas por la NASA. Si el Sol estuvo muy activo, hay más alertas.',
    papel: 'mecanica',
  },
  curiosityRAD: {
    nombre: 'Curiosity — detector de radiación RAD',
    url: 'https://science.nasa.gov/mission/msl-curiosity/',
    uso: 'La radiación que tu tripulación recibe cada sol es la que midió Curiosity en el suelo de Marte (0,67 mSv al día).',
    papel: 'mecanica',
  },
  radlab: {
    nombre: 'NASA OSDR — RadLab',
    url: 'https://visualization.osdr.nasa.gov/radlab/',
    uso: 'Dosis medidas por los detectores de la Estación Espacial. Las usamos para comparar Marte con la Estación.',
    papel: 'texto',
  },
  osdr: {
    nombre: 'NASA OSDR — estudios de biología espacial',
    url: 'https://osdr.nasa.gov/bio/repo/',
    uso: 'Estudios reales (con número OSD) sobre qué le pasa a los seres vivos en el espacio. Aparecen cuando tus decisiones tocan ese tema.',
    papel: 'texto',
  },
  marsTrek: {
    nombre: 'NASA Mars Trek',
    url: 'https://trek.nasa.gov/mars/',
    uso: 'Ubicación de tu base: el cráter Jezero (18,4° N, 77,6° E).',
    papel: 'texto',
  },
  perseverance: {
    nombre: 'Rover Perseverance (Mars 2020)',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    uso: 'MOXIE, la máquina que fabricó oxígeno en Marte, y las rocas de Jezero.',
    papel: 'texto',
  },
  opportunity: {
    nombre: 'Rover Opportunity',
    url: 'https://science.nasa.gov/mission/mer-opportunity/',
    uso: 'La tormenta de polvo de 2018 y por qué el polvo es peligroso para la energía solar.',
    papel: 'texto',
  },
  nasaMarte: {
    nombre: 'NASA Ciencia — Marte',
    url: 'https://science.nasa.gov/mars/facts/',
    uso: 'Datos básicos de Marte: duración del sol, luz solar, retraso de las señales.',
    papel: 'texto',
  },
  iss: {
    nombre: 'NASA — Estación Espacial Internacional',
    url: 'https://www.nasa.gov/international-space-station/',
    uso: 'Cómo se recicla el agua y cómo se trabaja fuera de la nave.',
    papel: 'texto',
  },
};
