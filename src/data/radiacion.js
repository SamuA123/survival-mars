// Valores de radiación con fuente. El simulador lee `.valor`.
// mSv = milisievert: unidad que mide cuánto daño puede hacer la radiación al cuerpo.
export const RADIACION = {
  marteSuperficie: {
    // Hassler et al. 2014, Science 343: dosis equivalente media de rayos cósmicos
    // en el cráter Gale = 0,67 mSv/día (ago 2012 – jun 2013). En el juego se redondea a 0,7.
    valor: 0.7, unidad: 'mSv por sol', fuente: 'curiosityRAD',
    texto: 'En el suelo de Marte, Curiosity midió unos 0,67 mSv de radiación al día. ¡Es como 100 días de radiación en la Tierra!',
  },
  viajeMarte: {
    // Mismo instrumento RAD durante el viaje (crucero) Tierra-Marte.
    valor: 1.8, unidad: 'mSv por día', fuente: 'curiosityRAD',
    texto: 'Durante el viaje hacia Marte, dentro de la nave, la radiación es casi 3 veces mayor: unos 1,8 mSv por día.',
  },
  estacionEspacial: {
    // RadLab API: spacecraft=ISS, 2022-04-01 a 2022-04-08. Medias: REM-Lid 0,32 · Lidal 0,13 mGy/día (medición de Jorge).
    valor: 0.3, unidad: 'mGy por día (dosis absorbida)', fuente: 'radlab',
    texto: 'En la Estación Espacial, el detector REM del módulo Columbus midió unos 0,3 mGy al día (1–7 abril 2022). En Marte, Curiosity midió 0,21 mGy al día: la atmósfera marciana, aunque delgada, ayuda un poquito.',
    texto_en: 'On the Space Station, the REM detector in the Columbus module measured about 0.3 mGy per day (April 1–7, 2022). On Mars, Curiosity measured 0.21 mGy per day: the Martian atmosphere, though thin, helps a little.',
  },
  tierra: {
    // Promedio mundial de radiación natural: ~2,4 mSv por año (UNSCEAR).
    valor: 0.0066, unidad: 'mSv por día', fuente: 'radlab',
    texto: 'En la Tierra recibimos unos 2,4 mSv en todo un año. ¡En Marte recibirías eso en menos de 4 días!',
  },
  limiteCarreraNASA: {
    // Estándar de la NASA (2022): máximo 600 mSv en toda la carrera de un astronauta.
    valor: 600, unidad: 'mSv', fuente: 'radlab',
    texto: 'La NASA no deja que un astronauta reciba más de 600 mSv en toda su carrera.',
  },
  // Dosis extra (SIMPLIFICADA para el juego) si la tripulación NO se refugia de una llamarada.
  // Las tormentas de partículas reales varían muchísimo; estos valores solo ordenan X > M > C.
  llamarada: { X: 50, M: 25, C: 8, B: 3, A: 2 },
  atenuacionAtmosfera: 0.5,   // la atmósfera delgada de Marte frena parte de las partículas
  atenuacionBlindaje: 0.4,    // con blindaje de regolito terminado (simplificado)
  limiteMision: 60,           // límite del juego (simplificado; el real de carrera es 600 mSv)
};
