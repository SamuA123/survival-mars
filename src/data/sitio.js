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
};
