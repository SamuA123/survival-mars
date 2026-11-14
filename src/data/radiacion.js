// Valores de radiación. El simulador lee `.valor`, `.llamarada`, `.atenuacion*` y `.limiteMision`.
// Lo marcado como "simplificado" es un número del juego, no una medición: así se explica en el panel de datos.
export const RADIACION = {
  marteSuperficie: {
    valor: 0.7, unidad: 'mSv por sol', fuente: 'curiosityRAD',
    texto: 'En el suelo de Marte, Curiosity midió unos 0,67 mSv de radiación al día. ¡Es como 100 días de radiación en la Tierra!',
    // Hassler et al. 2014, Science 343: 0,64 ± 0,12 mSv/día de dosis equivalente en el cráter Gale.
  },
  estacionEspacial: {
    valor: 0.3, unidad: 'mGy por día (dosis absorbida)', fuente: 'radlab',
    texto: 'En la Estación Espacial, el detector REM del módulo Columbus midió unos 0,3 mGy al día (1–7 abril 2022). En Marte, Curiosity midió 0,21 mGy al día: la atmósfera marciana, aunque delgada, ayuda un poquito.',
    // RadLab API: spacecraft=ISS, 2022-04-01 a 2022-04-08. Medias: REM-Lid 0,32 · Lidal 0,13 mGy/día.
  },
  tierra: {
    valor: 0.0066, unidad: 'mSv por día', fuente: null,
    texto: 'En la Tierra recibimos unos 2,4 mSv en todo un año (promedio mundial de radiación natural).',
  },
  limiteCarreraNASA: {
    valor: 600, unidad: 'mSv en toda la carrera', fuente: null,
    texto: 'La NASA no deja que un astronauta reciba más de 600 mSv en toda su carrera.',
    // NASA-STD-3001 (2022).
  },
  // --- Simplificado para el juego ---
  // Dosis extra si la tripulación NO se refugia de una llamarada, según su clase (DONKI).
  llamarada: { X: 50, M: 25, C: 8, B: 3, A: 2 },
  atenuacionAtmosfera: 0.5,   // la atmósfera delgada de Marte frena una parte
  atenuacionBlindaje: 0.4,    // con el hábitat cubierto de regolito: llega el 40%
  limiteMision: 60,           // límite de esta misión corta de 15 sols
};
