// Datos del lugar de la base: cráter Jezero (Marte), sitio de aterrizaje de Perseverance.
// Coordenadas y contexto: NASA Mars 2020 / Mars Trek.
export const SITIO = {
  nombre: 'Cráter Jezero',
  planeta: 'Marte',
  lat: 18.4, lon: 77.5,       // ~18,4° N, 77,5° E
  diametroKm: 45,
  fuente: 'marsTrek',
  texto: 'Tu base está en el cráter Jezero, donde aterrizó el rover Perseverance el 18 de febrero de 2021. ¡Hace miles de millones de años aquí había un lago con un río que llegaba a él!',
  texto_en: 'Your base is in Jezero Crater, where the Perseverance rover landed on February 18, 2021. Billions of years ago there was a lake here, with a river flowing into it!',
  tempMediaC: -60,           // temperatura media de Marte (aprox.)
  luzSolarRelativa: 0.43,     // Marte recibe ~43% de la luz solar que la Tierra
  duracionSol: '24 h 39 min', // día solar marciano: 24 h 39 min 35 s
  retrasoMin: 12,             // retraso usado en el juego (real: entre ~4 y ~24 minutos, según la posición)
};
