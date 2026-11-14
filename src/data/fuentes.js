// Fuentes de datos de la NASA usadas en el juego.
// Cada dato del juego apunta a una de estas claves con `fuente: 'clave'`.
// Se muestran al jugador en el panel "📡 Datos de la NASA".
export const FUENTES = {
  donki: {
    nombre: 'NASA DONKI — Space Weather Database',
    url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    uso: 'Llamaradas solares reales de los últimos 30 días: cambian el riesgo de radiación de tu misión.',
  },
  curiosityRAD: {
    nombre: 'Curiosity — Radiation Assessment Detector (RAD)',
    url: 'https://science.nasa.gov/mission/msl-curiosity/',
    uso: 'Radiación medida en la superficie de Marte.',
  },
  radlab: {
    nombre: 'NASA OSDR — RadLab (dosimetría de la Estación Espacial)',
    url: 'https://visualization.osdr.nasa.gov/radlab/',
    uso: 'Dosis reales medidas a bordo de la Estación Espacial Internacional, para comparar.',
  },
  osdr: {
    nombre: 'NASA Open Science Data Repository (OSDR)',
    url: 'https://osdr.nasa.gov/bio/',
    uso: 'Estudios reales sobre la salud de los astronautas en el espacio.',
  },
  marsTrek: {
    nombre: 'NASA Mars Trek',
    url: 'https://trek.nasa.gov/mars/',
    uso: 'Datos del lugar de la base (cráter Jezero).',
  },
  csaComida: {
    nombre: 'Agencia Espacial Canadiense — Producción de alimentos en la Luna',
    url: 'https://www.asc-csa.gc.ca/eng/youth-educators/',
    uso: 'Cómo se cultiva comida en el espacio.',
  },
};
