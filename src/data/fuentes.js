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
    nombre: 'Curiosity — Radiation Assessment Detector (RAD), Hassler et al. 2014 (Science 343)',
    url: 'https://ntrs.nasa.gov/citations/20180007641',
    uso: 'Radiación medida en la superficie de Marte: ~0,67 mSv por día (cráter Gale, 2012-2013).',
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
    uso: 'Mapas y relieve de Marte (región de Isidis y Syrtis Major).',
  },
  neSyrtis: {
    nombre: 'NASA — NE Syrtis, uno de los 3 sitios finalistas de Mars 2020',
    url: 'https://astrobiology.nasa.gov/news/scientists-shortlist-three-landing-sites-for-mars-2020/',
    uso: 'Lugar de la base: meseta NE Syrtis, al borde de la cuenca Isidis.',
  },
  topoJezero: {
    nombre: 'ESA / DLR (Mars Express HRSC) — Mapa topográfico del cráter Jezero y alrededores',
    url: 'https://www.esa.int/ESA_Multimedia/Images/2021/02/Topographic_map_of_Jezero_crater_and_surrounds',
    uso: 'Altura del terreno: el fondo de Jezero está ~2.600 m bajo el nivel de referencia de Marte.',
  },
  neSyrtisGeologia: {
    nombre: 'Brown University (2017) — Mapa geológico de NE Syrtis: olivino, carbonatos y cuenca Isidis',
    url: 'https://www.brown.edu/news/2017-04-20/syrtis',
    uso: 'Edad de la cuenca Isidis (~3.960 millones de años) y rocas con olivino alterado por agua.',
  },
  csaComida: {
    nombre: 'Agencia Espacial Canadiense — Producción de alimentos en la Luna',
    url: 'https://www.asc-csa.gc.ca/eng/youth-educators/',
    uso: 'Cómo se cultiva comida en el espacio.',
  },
  moxie: {
    nombre: 'NASA — MOXIE (Perseverance) completa su misión',
    url: 'https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/',
    uso: 'MOXIE fabricó 122 gramos de oxígeno con el aire de Marte.',
  },
  aguaISS: {
    nombre: 'NASA — La Estación Espacial recupera el 98% del agua',
    url: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/',
    uso: 'Reciclaje de agua del soporte vital.',
  },
  opportunity: {
    nombre: 'NASA — Fin de la misión del rover Opportunity (tormenta de polvo de 2018)',
    url: 'https://science.nasa.gov/mission/mer-opportunity/',
    uso: 'Tormentas de polvo que tapan los paneles solares.',
  },
  fissionPower: {
    nombre: 'NASA — Fission Surface Power (reactores para la Luna y Marte)',
    url: 'https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power/',
    uso: 'El mini reactor nuclear de la base.',
  },
  veggie: {
    nombre: 'NASA — Cultivar plantas en el espacio (Veggie)',
    url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/',
    uso: 'El invernadero de la base.',
  },
  conjuncion: {
    nombre: 'NASA — ¿Qué es la conjunción solar de Marte?',
    url: 'https://www.nasa.gov/solar-system/whats-mars-solar-conjunction-and-why-does-it-matter/',
    uso: 'Los sols sin comunicación con la Tierra.',
  },
  retraso: {
    nombre: 'NASA — Peligro: distancia de la Tierra (programa de investigación humana)',
    url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/',
    uso: 'Retraso de los mensajes Tierra-Marte (de unos 4 a 24 minutos).',
  },
  mroCrateres: {
    nombre: 'NASA Mars Reconnaissance Orbiter — impactos nuevos en Marte',
    url: 'https://www.jpl.nasa.gov/news/nasa-probe-counts-space-rock-impacts-on-mars/',
    uso: 'Más de 200 cráteres nuevos por año: evento de micrometeorito.',
  },

  // ---- Estudios concretos de NASA OSDR (cada uno con su página) ----
  'OSD-342': {
    nombre: 'NASA OSDR · OSD-342 — Rodent Research-19: pérdida de músculo y hueso en el espacio',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-342',
    uso: 'Ratones en la Estación Espacial perdieron músculo y hueso en 33 días.',
  },
  'OSD-566': {
    nombre: 'NASA OSDR · OSD-566 — Respuestas inmunes y hormonales a la radiación ionizante',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-566',
    uso: 'Cómo la radiación espacial afecta las defensas del cuerpo.',
  },
  'OSD-343': {
    nombre: 'NASA OSDR · OSD-343 — Estrés de las mitocondrias en el espacio (59 astronautas + Estudio de Gemelos)',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-343',
    uso: 'El espacio estresa las "centrales de energía" de las células.',
  },
  'OSD-766': {
    nombre: 'NASA OSDR · OSD-766 — VEG-05: tomates cultivados 101 días en la Estación Espacial',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-766',
    uso: 'Cultivo de comida con luces LED rojas y azules.',
  },
  'OSD-678': {
    nombre: 'NASA OSDR · OSD-678 — CARA: la luz guía a las plantas en el espacio',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-678',
    uso: 'Plantas Arabidopsis cultivadas con luz y en oscuridad en la Estación Espacial.',
  },
  'OSD-177': {
    nombre: 'NASA OSDR · OSD-177 — Hongo Fusarium en las zinnias de la Estación Espacial',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-177',
    uso: 'Las plantas también se enferman en el espacio (evento de plaga).',
  },
  'OSD-87': {
    nombre: 'NASA OSDR · OSD-87 — Efectos del vuelo espacial en la retina (STS-135)',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-87',
    uso: 'El espacio también afecta los ojos.',
  },
};
