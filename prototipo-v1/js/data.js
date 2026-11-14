// =====================================================================
//  DATOS DEL JUEGO: la misión en Marte, sistemas y datos educativos.
//  Cambien números aquí para balancear el juego sin tocar la lógica.
// =====================================================================

const MISION = {
  nombre: 'Base Marciana',
  maxSol: 20,
  solarBase: 9,          // kWh por sol con paneles limpios (Marte recibe ~43% de la luz que la Tierra)
  nuclear: 5,            // kWh constantes de un pequeño reactor (idea real: Fission Surface Power)
  bateriaMax: 40,
  bateriaInicial: 30,
  delayMin: 12,          // minutos que tarda un mensaje en llegar (real: 3 a 22)
  radDiaria: 0.7,        // mSv por sol en la superficie (Curiosity/RAD midió ~0,7)
  radLimite: 60,         // límite de la misión (simplificado para el juego)
  flareMult: 0.5,        // la atmósfera delgada ayuda un poco contra llamaradas
  calorNecesario: 2,     // Marte promedia unos -60 °C
  tormenta: [8, 9, 10],  // tormenta global de polvo
  conjuncion: [13, 14],  // el Sol queda entre Marte y la Tierra: sin comunicaciones
  repuestos: 2,
  botiquin: 1,
  // Eventos garantizados (el resto son aleatorios)
  guion: { 3: 'llamarada', 5: 'reciclador', 8: 'tormenta', 12: 'remolino', 16: 'llamarada' },
  // Mensajes de Control de Misión (solo llegan si las comunicaciones están encendidas)
  avisos: {
    1: ['¡Bienvenida, tripulación! Cada mensaje tarda unos 12 minutos en llegar. En una emergencia, ustedes deciden.'],
    6: ['⚠️ El satélite MRO ve una gran tormenta de polvo. Llegará en 2 sols y durará 3. ¡Carguen las baterías!'],
    7: ['La tormenta llega mañana. Ahorren energía y suban la batería.'],
    11: ['⚠️ En los sols 13 y 14 el Sol quedará entre Marte y la Tierra (conjunción solar). No podremos hablar. ¡Estarán solos!'],
    15: ['¡Volvimos a escucharlos! Buen trabajo durante la conjunción.'],
    19: ['La nave de relevo ya está en órbita. ¡Aguanten un sol más!'],
  },
};

const SISTEMAS = [
  {
    id: 'vital', nombre: 'Soporte vital', icono: '🫁', costo: 2, max: 3,
    desc: 'Fabrica oxígeno y recicla el agua',
    niveles: ['¡Apagado! El oxígeno baja muy rápido', 'Bajo: el oxígeno baja', 'Normal: oxígeno estable', 'Alto: el oxígeno sube'],
  },
  {
    id: 'invernadero', nombre: 'Invernadero', icono: '🌱', costo: 2, max: 3,
    desc: 'Luces y agua para cultivar comida',
    niveles: ['Apagado: no hay cosecha', 'Poca cosecha', 'Cosecha normal', '¡Cosecha grande!'],
  },
  {
    id: 'calor', nombre: 'Calefacción', icono: '🔥', costo: 1.5, max: 3,
    desc: 'Afuera hace unos -60 °C',
    niveles: ['Apagada: ¡mucho frío!', 'Baja: hace frío', 'Media: cómodo', 'Alta: calentito'],
  },
  {
    id: 'radio', nombre: 'Comunicaciones', icono: '📡', costo: 1, max: 2,
    desc: 'Habla con Control de Misión en la Tierra',
    niveles: ['Apagadas: sin mensajes y la tripulación se siente sola', 'Normal: recibes mensajes', 'Videomensajes de la familia: ¡más ánimo!'],
  },
];

const RECURSOS = [
  { id: 'o2', nombre: 'Oxígeno', icono: '🫧', ayuda: 'Sin oxígeno no se puede respirar. Lo produce el soporte vital.' },
  { id: 'agua', nombre: 'Agua', icono: '💧', ayuda: 'Se recicla casi toda, pero siempre se pierde un poquito.' },
  { id: 'comida', nombre: 'Comida', icono: '🥔', ayuda: 'La tripulación come cada sol. El invernadero produce más.' },
  { id: 'salud', nombre: 'Salud', icono: '❤️', ayuda: 'Baja si falta oxígeno, agua, comida o calor.' },
  { id: 'moral', nombre: 'Ánimo', icono: '😊', ayuda: 'Una tripulación triste trabaja peor. Hablar con la Tierra ayuda.' },
  { id: 'bateria', nombre: 'Batería', icono: '🔋', unidad: ' kWh', ayuda: 'Guarda energía para la noche y para las tormentas.' },
  { id: 'rad', nombre: 'Radiación', icono: '☢️', unidad: ' mSv', inverso: true, ayuda: 'Radiación acumulada. Si llega al límite, la misión regresa a la Tierra.' },
];

// "¿Sabías que...?" — datos reales que el jugador va desbloqueando.
const DATOS = {
  sol: 'Un día en Marte se llama "sol" y dura 24 horas y 37 minutos, ¡casi igual que un día en la Tierra!',
  oxigeno: 'En la Estación Espacial el oxígeno se fabrica separando el agua en hidrógeno y oxígeno con electricidad. Se llama electrólisis.',
  moxie: 'El rover Perseverance llevó a Marte un aparato llamado MOXIE que fabricó oxígeno a partir del aire marciano, que es casi todo dióxido de carbono.',
  agua: 'La Estación Espacial recicla cerca del 98% del agua… ¡incluidos el sudor y la orina de los astronautas!',
  polvo: 'En 2018 una tormenta de polvo cubrió todo Marte. Los paneles del rover Opportunity quedaron tapados y la NASA perdió contacto con él para siempre.',
  remolino: 'Los remolinos de polvo de Marte a veces limpiaron los paneles de los rovers Spirit y Opportunity. ¡Los científicos lo llamaban "eventos de limpieza"!',
  llamarada: 'La luz de una llamarada solar llega a Marte en unos 13 minutos. Las partículas peligrosas pueden tardar desde minutos hasta horas: ¡por eso hay que vigilar el Sol!',
  radiacion: 'Marte tiene una atmósfera muy delgada y no tiene un campo magnético global que lo proteja. El rover Curiosity mide la radiación con su instrumento RAD.',
  regolito: 'Cubrir el hábitat con regolito (la "tierra" de Marte) es una idea real: unos metros de regolito bloquean mucha radiación.',
  retraso: 'Un mensaje de radio tarda entre 3 y 22 minutos en viajar de la Tierra a Marte. ¡Ida y vuelta pueden ser 44 minutos! Por eso la tripulación debe resolver sola las emergencias.',
  conjuncion: 'Cada 2 años el Sol se pone entre la Tierra y Marte. Durante unas dos semanas la NASA casi no envía órdenes a sus rovers: se llama conjunción solar.',
  invernadero: 'En la Estación Espacial, el experimento Veggie ya cultivó lechugas, repollo chino y hasta flores llamadas zinnias.',
  nuclear: 'La NASA estudia pequeños reactores nucleares (Fission Surface Power) para tener energía de día, de noche y durante las tormentas de polvo.',
  solar: 'Marte está más lejos del Sol que la Tierra, así que sus paneles solares reciben menos de la mitad de luz. ¡Hay que aprovechar cada rayo!',
  micrometeorito: 'Los micrometeoritos viajan a más de 10 km por segundo. ¡A esa velocidad, un granito de arena puede agujerear el metal!',
  calor: 'La temperatura promedio en Marte es de unos -60 °C, y en las noches puede bajar de -100 °C. ¡Sin calefacción no se sobrevive!',
  comunicaciones: 'La Red del Espacio Profundo de la NASA usa antenas gigantes en California (EE. UU.), Madrid (España) y Canberra (Australia) para hablar con las naves.',
  bateria: 'Las baterías guardan la energía del día para usarla de noche o en tormentas. Planear la energía antes de que falte es clave para sobrevivir.',
  repuestos: 'En el espacio no hay ferretería: las misiones llevan repuestos, y en la Estación Espacial ya se prueban impresoras 3D para fabricar piezas.',
  moral: 'Los astronautas reciben mensajes y videos de su familia. Mantener el ánimo alto también es parte de la seguridad de una misión.',
  hielo: 'Los científicos encontraron hielo de agua bajo el suelo de Marte. ¡Se podría usar para beber y para fabricar oxígeno!',
  eva: 'Una caminata espacial se llama EVA (actividad extravehicular). Fuera del hábitat, el traje espacial es la única protección del astronauta.',
};
