// Valores de radiación con fuente. El simulador lee `.valor`.
// TODO(datos): refinar con valores de RadLab / estudios de RAD citados.
export const RADIACION = {
  marteSuperficie: {
    valor: 0.7, unidad: 'mSv por sol', fuente: 'curiosityRAD',
    texto: 'En la superficie de Marte, Curiosity midió unos 0,7 mSv por día.',
  },
  estacionEspacial: {
    valor: 0.5, unidad: 'mSv por día', fuente: 'radlab',
    texto: 'En la Estación Espacial, los dosímetros miden alrededor de 0,5 mSv por día.',
  },
  tierra: {
    valor: 0.0066, unidad: 'mSv por día', fuente: 'curiosityRAD',
    texto: 'En la Tierra recibimos unos 2,4 mSv en todo un año.',
  },
  // Dosis extra (simplificada para el juego) si la tripulación NO se refugia.
  llamarada: { X: 50, M: 25, C: 8, B: 3, A: 2 },
  atenuacionAtmosfera: 0.5,   // la atmósfera delgada de Marte ayuda un poco
  atenuacionBlindaje: 0.4,    // con blindaje de regolito terminado
  limiteMision: 60,           // límite del juego (simplificado)
};
