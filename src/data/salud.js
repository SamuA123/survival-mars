// Hallazgos REALES de estudios de la NASA (Open Science Data Repository, OSDR)
// que el juego muestra como "Lo que dice la ciencia real" según lo que pasó en el sol.
// Formato: { id, tema, texto (para niños de 7-12), fuente (clave en fuentes.js), estudio, url }
//
// Temas que usa el simulador hoy: 'radiacion' (tras una llamarada), 'comida' (comida < 30),
// 'oxigeno' (oxígeno < 50). El simulador muestra el PRIMERO de cada tema: el orden importa.
// Temas extra disponibles para nuevas mecánicas: 'ejercicio', 'plaga', 'ojos'.
//
// Verificado el 14/11/2026 con la API de búsqueda de OSDR (https://osdr.nasa.gov/osdr/data/search).
export const HALLAZGOS = [
  // ---------- Radiación ----------
  { id: 'radiacion-defensas', tema: 'radiacion', fuente: 'OSD-566', estudio: 'OSD-566',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-566',
    texto: 'Los científicos de la NASA exponen ratones a radiación como la del espacio para ver cómo cambian sus defensas (el sistema inmune) y sus hormonas. ¡La radiación puede dañar el ADN de las células! Por eso refugiarse durante una llamarada es tan importante.' },

  // ---------- Oxígeno / energía del cuerpo ----------
  { id: 'mitocondrias', tema: 'oxigeno', fuente: 'OSD-343', estudio: 'OSD-343',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-343',
    texto: 'Un gran estudio de la NASA con datos de 59 astronautas y del famoso Estudio de Gemelos descubrió que en el espacio las mitocondrias se estresan. Son las "centrales de energía" de cada célula, y usan el oxígeno que respiras para darte energía.' },

  // ---------- Comida / plantas ----------
  { id: 'tomates-veg05', tema: 'comida', fuente: 'OSD-766', estudio: 'OSD-766',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-766',
    texto: 'Entre 2022 y 2023, los astronautas cultivaron tomates enanos durante 101 días en la Estación Espacial (experimento VEG-05). Probaron luces LED más rojas y más azules para ver cuál ayudaba más a las plantas.' },
  { id: 'plantas-luz', tema: 'comida', fuente: 'OSD-678', estudio: 'OSD-678',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-678',
    texto: 'En el espacio no hay "arriba" ni "abajo". El experimento CARA mostró que la luz es una de las guías más importantes para que las raíces de las plantas sepan hacia dónde crecer.' },

  // ---------- Ejercicio / huesos y músculos ----------
  { id: 'musculo-hueso', tema: 'ejercicio', fuente: 'OSD-342', estudio: 'OSD-342',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-342',
    texto: 'Unos ratones que pasaron 33 días en la Estación Espacial perdieron mucho músculo y hueso (estudio Rodent Research-19). Por eso los astronautas hacen ejercicio unas 2 horas todos los días.' },

  // ---------- Plagas en el invernadero ----------
  { id: 'zinnias-hongo', tema: 'plaga', fuente: 'OSD-177', estudio: 'OSD-177',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-177',
    texto: 'En 2016, unas flores llamadas zinnias se enfermaron con un hongo (Fusarium) en la Estación Espacial. Los astronautas tuvieron que cuidarlas como jardineros. ¡Las plagas también viajan al espacio!' },

  // ---------- Ojos ----------
  { id: 'retina', tema: 'ojos', fuente: 'OSD-87', estudio: 'OSD-87',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-87',
    texto: 'Ratones que viajaron en el último vuelo del transbordador espacial (STS-135) mostraron cambios en la retina, la parte del ojo que capta la luz. Algunos astronautas también notan cambios en la vista después de misiones largas.' },
];
