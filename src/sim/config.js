// Configuración y balance de la misión. Cambien números aquí, no en el motor.
import { RADIACION } from '../data/radiacion.js';
import { SITIO } from '../data/sitio.js';

export const MISION = {
  maxSol: 15,
  solarBase: 11,              // kWh por sol con paneles limpios (Marte recibe ~43% de la luz de la Tierra)
  nuclear: 3,                 // kWh constantes del mini reactor
  bateriaMax: 40,
  bateriaInicial: 26,
  comidaInicial: 40,
  consumoComida: 5,
  cosecha: [0, 2, 4, 6],
  comidaBaja: 20,
  penalizacionHambre: 3,     // regla educativa: reservas bajas dificultan recuperarse
  consumoBase: 1,             // computadoras y luces
  frioTormenta: 2,            // kWh extra de calefacción en tormenta (el polvo tapa el Sol y enfría)
  delayMin: SITIO.retrasoMin,
  radDiaria: RADIACION.marteSuperficie.valor,
  radLimite: RADIACION.limiteMision,
  tormenta: [6, 7, 8],        // tormenta global de polvo (aviso en el sol 4)
  conjuncion: [10, 11],       // el Sol entre Marte y la Tierra: sin contacto
  repuestos: 2,
  botiquin: 1,
  // Puntos de ciencia para la 2ª estrella. Con 40, "laboratorio en 1 y refugiarse siempre" daba 3 estrellas
  // el 90 % de las veces sin decidir nada. Con 60 hay que arriesgar algo: más energía al laboratorio
  // (riesgo de apagón en la tormenta) o salir a buscar rocas (radiación y oxígeno).
  metaCiencia: 60,
  // Plan del sol: objetivo OPCIONAL de recolección que envía Control de Misión.
  // Cumplirlo da un bono; no cumplirlo no castiga (solo se pierde el bono).
  // Si las comunicaciones están apagadas o hay conjunción solar, el plan no llega.
  plan: {
    cantidad: { regolito: 2, roca: 2, hielo: 2 },
    bono: { ciencia: 5, salud: 5 },
  },
  // Caminata espacial (EVA) controlada por el jugador: 1 por sol
  eva: {
    costoO2Base: 3,           // llenar el tanque del traje gasta oxígeno de la base
    costoBateria: 1,          // cargar el traje
    o2TrajePorSeg: 1.2,       // el tanque del traje dura ~80 s
    radPorSeg: 0.04,          // mSv por segundo afuera (simplificado)
    multLlamarada: 6,         // si llega una llamarada durante la caminata
    saludRescate: 15,         // si se acaba el oxígeno del traje
    valores: { hielo: 8, roca: 6, regolito: 1, pieza: 1 },  // +O2, +ciencia, +bolsas, +repuestos
    regolitoPorNivel: 2,      // OBSOLETO: ya no se usa (las secciones de MISION.construccion tienen su propio costo)
    // Lo que el jugador recoge: qué es (dato real) y para qué sirve en el juego
    objetos: {
      regolito: {
        nombre: 'Regolito', icono: '🟫', color: '#ff8a3d',
        que: 'Es la capa de polvo y piedritas sueltas que cubre Marte. Es rojo porque tiene óxido de hierro: ¡Marte está oxidado como un clavo viejo!',
        uso: 'Blindaje: se guarda en la base y con él construyes las secciones que protegen el hábitat de la radiación (cada una cuesta 3 o 4 bolsas; tecla B).',
      },
      roca: {
        nombre: 'Roca marciana', icono: '🪨', color: '#b06cff',
        que: 'Muchas rocas de Marte son basalto, de volcanes antiguos. En NE Syrtis hay rocas con olivino que el agua transformó en carbonato: pistas de que hubo agua y quizás vida antigua.',
        uso: 'Ciencia: el laboratorio la analiza → +6 de ciencia.',
      },
      hielo: {
        nombre: 'Hielo de agua', icono: '🧊', color: '#9be7ff',
        que: 'En Marte hay hielo de agua escondido bajo el suelo, sobre todo lejos del ecuador. Derretido da agua; con electricidad se separa en hidrógeno y oxígeno.',
        uso: 'Oxígeno: el soporte vital lo convierte en aire → +8 de oxígeno.',
      },
    },
  },
  // Tripulación: cada astronauta lleva su propio dosímetro. Colores = los de los astronautas 3D
  // (src/world3d/mundo.js _initAstronautas). El límite de radiación se aplica por persona.
  tripulacion: [
    { id: 'lia', nombre: 'Lía', color: 0xe2673a },
    { id: 'kofi', nombre: 'Kofi', color: 0x2f7de1 },
    { id: 'mei', nombre: 'Mei', color: 0x49c45e },
    { id: 'teo', nombre: 'Teo', color: 0xffc93c },
  ],
  // Modo construcción (tecla B): el blindaje del hábitat se arma por SECCIONES que gastan regolito.
  // Con todas las secciones entra el 40 % de la radiación (= RADIACION.atenuacionBlindaje): 4 × 15 % = 60 % menos.
  construccion: {
    secciones: {
      norte: { nombre: 'Pared norte', nombre_en: 'North wall', icono: '⬆️', costo: 3, proteccion: 0.15 },
      sur:   { nombre: 'Pared sur', nombre_en: 'South wall', icono: '⬇️', costo: 3, proteccion: 0.15 },
      lados: { nombre: 'Paredes este y oeste', nombre_en: 'East and west walls', icono: '↔️', costo: 4, proteccion: 0.15 },
      techo: { nombre: 'Techo', nombre_en: 'Roof', icono: '🔼', costo: 4, proteccion: 0.15 },
    },
  },
  // Guion de referencia (modo demo y valores por defecto). En una partida normal, motor.sortearGuion()
  // cambia los días de cada emergencia para que ninguna partida sea igual.
  guion: { 2: 'llamarada', 4: 'reciclador', 6: 'tormenta', 9: 'remolino', 12: 'llamarada' },
  // Avisos de la tormenta: se envían 2 sols y 1 sol antes de que llegue (el día lo decide el sorteo).
  avisosTormenta: ['⚠️ El satélite MRO ve una gran tormenta de polvo. Llegará en 2 sols y durará 3. ¡Carguen las baterías!',
                   'La tormenta llega mañana. Ahorren energía.'],
  avisos: {
    1: ['¡Bienvenida, tripulación! Cada mensaje tarda unos 12 minutos en llegar. En una emergencia, ustedes deciden.',
        'Misión científica: exploren con el rover y hagan experimentos, pero sin arriesgar a la tripulación.'],
    4: ['⚠️ El satélite MRO ve una gran tormenta de polvo. Llegará en 2 sols y durará 3. ¡Carguen las baterías!'],
    5: ['La tormenta llega mañana. Ahorren energía.'],
    9: ['⚠️ En los sols 10 y 11 el Sol quedará entre Marte y la Tierra (conjunción solar). No podremos hablar. ¡Estarán solos!'],
    12: ['¡Volvimos a escucharlos! Buen trabajo durante la conjunción.'],
    14: ['La nave de relevo ya está en órbita. ¡Aguanten un sol más!'],
  },
};

// Sistemas que consumen energía. Cada uno vive en un edificio del mapa 3D.
export const SISTEMAS = {
  vital: {
    nombre: 'Soporte vital', icono: '🫁', edificio: 'habitat', costo: 2.5, max: 3,
    desc: 'Fabrica oxígeno, recicla el agua y mantiene la base calentita (afuera hay -60 °C).',
    niveles: ['¡Apagado! El oxígeno baja muy rápido y hace frío', 'Bajo: el oxígeno baja', 'Normal: oxígeno estable', 'Alto: el oxígeno sube'],
  },
  invernadero: {
    nombre: 'Invernadero', icono: '🌱', edificio: 'invernadero', costo: 2, max: 3,
    desc: 'Luces especiales y agua para cultivar papas, lechugas y frijoles.',
    niveles: ['Apagado: no crece nada', 'Poca cosecha', 'Cosecha normal', '¡Cosecha grande!'],
  },
  radio: {
    nombre: 'Comunicaciones', icono: '📡', edificio: 'antena', costo: 1, max: 2,
    desc: 'Recibe avisos de Control de Misión en la Tierra (con 12 minutos de retraso).',
    niveles: ['Apagadas: no recibes avisos', 'Normal: recibes avisos', 'Videollamadas: la tripulación se anima'],
  },
  lab: {
    nombre: 'Laboratorio', icono: '🔬', edificio: 'lab', costo: 2, max: 2,
    desc: 'Analiza rocas y suelo marciano. Da puntos de ciencia… pero gasta energía.',
    niveles: ['Apagado: sin experimentos', 'Experimentos: +4 ciencia por sol', 'A toda máquina: +8 ciencia por sol'],
  },
};

export const RECURSOS = [
  { id: 'bateria', nombre: 'Energía', icono: '⚡', unidad: 'kWh', max: () => MISION.bateriaMax, ayuda: 'La batería guarda energía para la noche y las tormentas.' },
  { id: 'o2', nombre: 'Oxígeno', icono: '🫁', unidad: '%', max: () => 100, ayuda: 'Lo fabrica el soporte vital. ¡Sin oxígeno no se respira!' },
  { id: 'comida', nombre: 'Comida', icono: '🥔', unidad: '%', max: () => 100, ayuda: 'La tripulación come cada sol. El invernadero produce más.' },
  { id: 'rad', nombre: 'Radiación', icono: '☢️', unidad: 'mSv', max: () => MISION.radLimite, inverso: true, ayuda: 'Radiación acumulada (mSv = milisievert, la unidad para medir radiación). Si llega al límite, la misión vuelve a la Tierra.' },
  { id: 'salud', nombre: 'Tripulación', icono: '❤️', unidad: '%', max: () => 100, ayuda: 'Baja si falta oxígeno, comida o calor.' },
];
