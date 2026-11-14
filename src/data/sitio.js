// Datos del lugar de la base: meseta NE Syrtis, en el borde de la cuenca Isidis (Isidis Planitia), Marte.
// NE Syrtis fue uno de los 3 sitios finalistas de la NASA para el aterrizaje de Perseverance (Mars 2020),
// junto con el cráter Jezero (el elegido) y Columbia Hills.
// Fuentes: NASA Astrobiology (lista final de sitios Mars 2020), Brown University (mapa geológico 2017), Mars Trek.
export const SITIO = {
  nombre: 'Meseta NE Syrtis',
  region: 'Isidis Planitia',
  nombreCompleto: 'Meseta NE Syrtis · Isidis Planitia',
  planeta: 'Marte',
  lat: 18, lon: 77,           // ~18° N, 77° E (a unos pocos km del cráter Jezero)
  fuente: 'neSyrtis',
  texto: 'Tu base está en la meseta NE Syrtis, al borde de la gran cuenca Isidis, que dejó un asteroide gigante hace casi 4.000 millones de años. La NASA la eligió como uno de los 3 sitios finalistas para el rover Perseverance, porque sus rocas guardan pistas de agua antigua.',
  tempMediaC: -60,            // temperatura media de Marte (aprox.)
  luzSolarRelativa: 0.43,     // Marte recibe ~43% de la luz solar que la Tierra
  duracionSol: '24 h 39 min', // día solar marciano: 24 h 39 min 35 s
  retrasoMin: 12,             // retraso usado en el juego (real: entre ~4 y ~24 minutos, según la posición)

  // Resumen de la ubicación (panel "📍 Ubicación"). Basado en el texto del equipo, con datos verificados.
  resumen: [
    {
      icono: '📍', titulo: 'Ubicación: Meseta NE Syrtis · Isidis Planitia (junto al cráter Jezero)',
      puntos: [
        'Tu base está justo al norte del ecuador marciano, a unos 18° N y 77° E.',
        'Queda en el borde oeste de la gran cuenca Isidis: al oeste está la región oscura de Syrtis Major (un volcán antiguo), al este la llanura de Isidis Planitia y, muy al sur, la enorme cuenca Hellas.',
        'A pocos kilómetros está el cráter Jezero, donde aterrizó el rover Perseverance en 2021.',
        'La NASA estudió este lugar como uno de los 3 sitios finalistas para Perseverance: suelo estable, cerca del ecuador (más luz y menos frío) y rocas que guardan pistas de agua antigua.',
      ],
      fuente: 'neSyrtis',
    },
    {
      icono: '⛰️', titulo: 'Topografía y el reto de la radiación',
      puntos: [
        'Isidis es una de las zonas más bajas de Marte: el fondo del cráter Jezero está a unos 2.600 metros por debajo del nivel de referencia (el "nivel del mar" de Marte). La meseta de NE Syrtis queda un poco más alta que la llanura.',
        'Estar en una zona baja tiene una ventaja: hay un poco más de atmósfera encima, que frena algo de radiación y ayuda a aterrizar.',
        'Pero la atmósfera de Marte es tan delgada (menos del 1 % de la de la Tierra) que la radiación cósmica sigue llegando todos los días. Por eso hay que construir el blindaje de regolito.',
        'El suelo de esta zona tiene arcillas que se formaron con agua hace miles de millones de años, y rocas de olivino transformadas en carbonato.',
      ],
      fuente: 'topoJezero',
    },
    {
      icono: '☀️', titulo: 'Ciclo solar y energía (1 sol = 24 h 39 min)',
      puntos: [
        'Mañana: el Sol sale y los paneles empiezan a cargar las baterías.',
        'Mediodía: cerca del ecuador el Sol sube muy alto (hasta unos 80° en algunas épocas del año): es cuando los paneles dan el 100 % de su energía.',
        'Tarde: el Sol baja hacia el horizonte y la energía solar cae poco a poco.',
        'Noche: los paneles dan 0 % y la temperatura puede bajar de -80 °C. La base sobrevive con la batería guardada y el mini reactor nuclear.',
        'En Marte se usa la hora local marciana, no la hora de la Tierra: como el sol dura 39 minutos más que un día terrestre, el amanecer se corre cada día respecto a nuestros relojes.',
      ],
      fuente: 'marsTrek',
    },
  ],

  // Enlaces a NASA Mars Trek (x = longitud, y = latitud)
  mapas: [
    { texto: '🗺️ Ver la base en NASA Mars Trek (NE Syrtis y cráter Jezero)',
      url: 'https://trek.nasa.gov/mars/#v=0.1&x=77.3&y=18.2&z=8&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104905&d=&locale=&b=mars&e=75.8%2C17.4%2C78.8%2C19.0&sfz=&w=' },
    { texto: '🧭 Vista regional de Marte en NASA Mars Trek (enlace del equipo)',
      url: 'https://trek.nasa.gov/mars/#v=0.1&x=55.645750915133405&y=1.3911437728782494&z=6&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104905&d=&locale=&b=mars&e=47.20825107252287%2C-2.426605179344615%2C64.08325075774394%2C5.208892725101114&sfz=&w=' },
  ],
};
