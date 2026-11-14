// Hallazgos reales de salud de astronautas (NASA OSDR) que el juego muestra
// como consecuencia de las decisiones.
// Formato: { id, tema, texto (para niños de 7-12), fuente: 'osdr', estudio, url }
// Temas que usa el simulador: 'radiacion' | 'comida' | 'oxigeno' | 'ejercicio' | 'sueno'
// TODO(datos): reemplazar/ampliar con estudios concretos de OSDR (OSD-xxx).
export const HALLAZGOS = [
  { id: 'hueso', tema: 'ejercicio', fuente: 'osdr', estudio: '', url: 'https://osdr.nasa.gov/bio/',
    texto: 'Con poca gravedad los huesos y músculos se debilitan. Por eso los astronautas hacen ejercicio unas 2 horas al día.' },
  { id: 'radiacion-celulas', tema: 'radiacion', fuente: 'osdr', estudio: '', url: 'https://osdr.nasa.gov/bio/',
    texto: 'La radiación espacial puede dañar las células del cuerpo. La NASA la estudia con experimentos en ratones, plantas y células.' },
  { id: 'comida-plantas', tema: 'comida', fuente: 'osdr', estudio: '', url: 'https://osdr.nasa.gov/bio/',
    texto: 'Las plantas pueden crecer en el espacio, pero sus raíces y hojas se comportan distinto. ¡La NASA estudia cómo cultivarlas mejor!' },
  { id: 'sueno', tema: 'sueno', fuente: 'osdr', estudio: '', url: 'https://osdr.nasa.gov/bio/',
    texto: 'En el espacio es difícil dormir bien. Dormir mal hace que los astronautas cometan más errores.' },
];
