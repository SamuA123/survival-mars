// =====================================================================
//  MOTOR DE SIMULACIÓN — lógica pura (sin DOM, sin Three.js).
//  La UI llama a estas funciones; la escena 3D solo LEE el estado.
// =====================================================================
import { MISION, SISTEMAS } from './config.js';
import { RADIACION } from '../data/radiacion.js';
import { LLAMARADAS_RESPALDO } from '../data/donki.js';
import { DATOS } from '../data/datos-curiosos.js';
import { HALLAZGOS } from '../data/salud.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const r1 = v => Math.round(v * 10) / 10;

// Clima espacial (lo llena main.js con DONKI)
export const CLIMA = { real: false, tranquilo: false, flares: LLAMARADAS_RESPALDO, riesgo: 1, resumen: 'cargando…' };
export function setClima(c) { Object.assign(CLIMA, c); }

// ---------------------------------------------------------------------
export function crearPartida(nombre = 'Comandante') {
  return {
    nombre, sol: 1, fase: 'planear',
    bateria: MISION.bateriaInicial, o2: 100, comida: 60, salud: 100, rad: 0, ciencia: 0,
    niveles: { vital: 2, invernadero: 2, radio: 1, lab: 0 },
    paneles: true, eficiencia: 1, invSalud: 1,
    repuestos: MISION.repuestos, botiquin: MISION.botiquin,
    blindaje: 0, construir: false,
    polvoSols: 0, eva: false, expedicion: false, refugio: false, ocupados: false,
    evaHecha: false, enEVA: false, regolito: 0,
    energiaOk: true, pendientes: [], aprendidos: [], ultimoEvento: null,
    llamarada: null, evento: null, historial: [], log: [],
  };
}

export const enTormenta = S => S.polvoSols > 0;
export const enConjuncion = S => MISION.conjuncion.includes(S.sol);

export function log(S, texto, tipo = '') { S.log.unshift({ sol: S.sol, texto, tipo }); }
export function aprender(S, clave) { if (clave && DATOS[clave] && !S.aprendidos.includes(clave)) S.aprendidos.push(clave); }

// ---------------------------------------------------------------------
//  ENERGÍA
// ---------------------------------------------------------------------
export function solarHoy(S) {
  if (!S.paneles) return 0;
  return MISION.solarBase * S.eficiencia * (enTormenta(S) ? 0.25 : 1);
}
export function consumo(S, niv = S.niveles, construir = S.construir) {
  let c = MISION.consumoBase;
  for (const id in SISTEMAS) c += niv[id] * SISTEMAS[id].costo;
  if (construir) c += 3;
  if (enTormenta(S) && niv.vital > 0) c += MISION.frioTormenta;
  return c;
}
export function balance(S) {
  const solar = solarHoy(S), nuclear = MISION.nuclear, gen = solar + nuclear, cons = consumo(S);
  const bal = gen - cons;
  return { solar, nuclear, gen, cons, bal, manana: clamp(S.bateria + bal, 0, MISION.bateriaMax), apagon: S.bateria + bal < 0 };
}

// ---------------------------------------------------------------------
//  ACCIONES (todas tienen un costo)
// ---------------------------------------------------------------------
export const ACCIONES = {
  paneles: {
    edificio: 'paneles',
    texto: S => S.paneles ? '🔽 Retraer paneles' : '🔼 Desplegar paneles',
    detalle: S => S.paneles ? 'Los protege del polvo, pero dejan de generar' : '¡Vuelven a generar energía solar!',
    visible: () => true, activo: () => true,
    hacer(S) { S.paneles = !S.paneles; log(S, S.paneles ? '🔼 Paneles desplegados.' : '🔽 Paneles retraídos.'); },
  },
  limpiar: {
    edificio: 'paneles',
    texto: () => '🧹 Salir a limpiar los paneles',
    detalle: S => enTormenta(S) ? 'No se puede salir en plena tormenta' : '+30% eficiencia · cuesta +1,5 mSv de radiación',
    visible: S => S.eficiencia < 1, activo: S => !enTormenta(S) && !S.eva,
    hacer(S) { S.eva = true; S.rad = r1(S.rad + 1.5); S.eficiencia = Math.min(1, S.eficiencia + 0.3); aprender(S, 'eva'); log(S, '🧑‍🚀 Una astronauta salió a limpiar los paneles (+1,5 mSv).'); },
  },
  blindaje: {
    edificio: 'habitat',
    texto: S => S.construir ? '⏸️ Pausar construcción del blindaje' : `🧱 Construir blindaje de regolito (${S.blindaje}/3)`,
    detalle: () => 'Cubrir el hábitat con tierra marciana: –60% de radiación. Cuesta +3 kWh por sol durante 3 sols.',
    visible: S => S.blindaje < 3, activo: () => true,
    hacer(S) { S.construir = !S.construir; },
  },
  // La caminata la controla el jugador en 3D: main.js intercepta esta acción.
  eva: {
    edificio: 'habitat',
    texto: () => '🧑‍🚀 ¡Salir a explorar! (caminata espacial)',
    detalle: S => motivoNoEVA(S) || `Recoge hielo, rocas y más. Cuesta ${MISION.eva.costoO2Base} de oxígeno de la base; afuera recibes radiación.`,
    visible: () => true, activo: S => !motivoNoEVA(S),
    hacer() {},
  },
  reparar: {
    edificio: 'invernadero',
    texto: () => '🔧 Reparar invernadero',
    detalle: S => `Usa 1 repuesto (te quedan ${S.repuestos})`,
    visible: S => S.invSalud < 1, activo: S => S.repuestos > 0,
    hacer(S) { S.repuestos--; S.invSalud = 1; log(S, '🔧 Invernadero reparado.'); },
  },
};

// ---------------------------------------------------------------------
//  CAMINATA ESPACIAL (EVA) — el jugador controla a un astronauta en 3D
// ---------------------------------------------------------------------
export function motivoNoEVA(S) {
  if (S.evaHecha) return 'Ya hiciste la caminata de hoy. ¡Mañana otra!';
  if (enTormenta(S)) return 'No se puede salir en plena tormenta de polvo';
  if (S.o2 < 20) return 'Hay muy poco oxígeno en la base para llenar el traje';
  if (S.bateria < MISION.eva.costoBateria) return 'No hay energía para cargar el traje';
  return '';
}

export function iniciarEVA(S) {
  S.o2 -= MISION.eva.costoO2Base;
  S.bateria = r1(S.bateria - MISION.eva.costoBateria);
  S.evaHecha = true; S.enEVA = true;
  aprender(S, 'eva');
}

// r = { items: {hielo, roca, regolito, pieza}, rad, rescate, limpio, segundos }
export function terminarEVA(S, r) {
  const V = MISION.eva.valores, lineas = [];
  S.enEVA = false;
  S.rad = r1(S.rad + r.rad);
  lineas.push(`⏱️ Estuviste afuera ${Math.round(r.segundos)} segundos y recibiste <b>${r1(r.rad)} mSv</b> de radiación.`);
  if (r.rescate) {
    S.salud = clamp(S.salud - MISION.eva.saludRescate, 0, 100);
    lineas.push(`🆘 ¡Se acabó el oxígeno del traje! Tus compañeros te rescataron, pero perdiste todo lo recolectado y la salud bajó (-${MISION.eva.saludRescate}).`);
    log(S, '🆘 Rescate en la caminata: se acabó el oxígeno del traje.', 'mal');
    return lineas;
  }
  const it = r.items;
  if (it.regolito) {
    S.regolito = (S.regolito || 0) + it.regolito;
    while (S.regolito >= MISION.eva.regolitoPorNivel && S.blindaje < 3) { S.regolito -= MISION.eva.regolitoPorNivel; S.blindaje++; }
    lineas.push(`🟫 <b>${it.regolito} de regolito</b> (la tierra roja y suelta de Marte) → cubre el hábitat: blindaje ${S.blindaje}/3.`); aprender(S, 'regolito');
  }
  if (it.roca) { S.ciencia += it.roca * V.roca; lineas.push(`🪨 <b>${it.roca} roca(s) marciana(s)</b> de basalto → el laboratorio las analiza: +${it.roca * V.roca} de ciencia.`); }
  if (it.hielo) { S.o2 = clamp(S.o2 + it.hielo * V.hielo, 0, 100); lineas.push(`🧊 <b>${it.hielo} bloque(s) de hielo de agua</b> → el agua se separa en hidrógeno y oxígeno: +${it.hielo * V.hielo} de oxígeno.`); aprender(S, 'hielo'); }
  if (it.pieza) { S.repuestos += it.pieza; lineas.push(`🔩 ${it.pieza} pieza(s) de una sonda vieja → +${it.pieza} repuesto(s).`); }
  if (r.limpio) { S.eficiencia = Math.min(1, S.eficiencia + 0.3); lineas.push('🧹 Limpiaste los paneles solares: +30% de eficiencia.'); }
  if (!it.hielo && !it.roca && !it.regolito && !it.pieza && !r.limpio) lineas.push('No recolectaste nada esta vez.');
  log(S, '🧑‍🚀 Caminata: ' + lineas.slice(1).map(l => l.split('→')[0]).join(' · ').replace(/<[^>]+>/g, ''));
  return lineas;
}

export function cambiarNivel(S, id, d) {
  S.niveles[id] = clamp(S.niveles[id] + d, 0, SISTEMAS[id].max);
}

// ---------------------------------------------------------------------
//  LLAMARADAS (DONKI)
// ---------------------------------------------------------------------
function elegirLlamarada() {
  const lista = CLIMA.flares?.length ? CLIMA.flares : LLAMARADAS_RESPALDO;
  const fuertes = lista.filter(f => 'MX'.includes(f.clase[0]));
  const pool = fuertes.length ? fuertes : lista;
  return pool[Math.floor(Math.random() * pool.length)];
}
export function dosisLlamarada(S, clase) {
  const base = RADIACION.llamarada[clase[0]] ?? 8;
  const mag = Math.min(parseFloat(clase.slice(1)) || 1, 5);
  const escudo = S.blindaje >= 3 ? RADIACION.atenuacionBlindaje : 1;
  return Math.round(base * (0.8 + mag / 10) * RADIACION.atenuacionAtmosfera * escudo);
}

// ---------------------------------------------------------------------
//  EVENTOS. tiempo = segundos para decidir (0 = sin prisa).
//  efecto(S) devuelve el texto del resultado. fx = efecto visual 3D.
// ---------------------------------------------------------------------
export const EVENTOS = {
  tormenta: {
    icono: '🌪️', titulo: '¡Llegó la tormenta de polvo!', fx: 'tormenta', tiempo: 10, dato: 'polvo',
    texto: () => 'Una tormenta gigante cubre el cielo. El viento lleva polvo que tapa y raya los paneles solares. Durará 3 sols.',
    consejo: 'Retraigan los paneles. Perder energía solar unos días es mejor que dañarlos para siempre.',
    inicio(S) { S.polvoSols = 3; },
    opciones: [
      { texto: '🔽 Retraer paneles', detalle: 'Sin energía solar, pero los paneles quedan a salvo',
        efecto(S) { S.paneles = false; return 'Paneles protegidos. Solo tendrás el reactor y la batería. ¡Despliégalos cuando pase la tormenta!'; } },
      { texto: '☀️ Dejarlos afuera', detalle: 'Generan un poquito, pero el polvo los raya',
        efecto() { return 'Los paneles siguen afuera. Generan muy poco y el polvo los raya cada sol.'; } },
    ],
    alAgotarse() { return 'Los paneles se quedaron afuera en plena tormenta.'; },
  },
  polvo: {
    icono: '💨', titulo: '¡Ráfaga de polvo!', fx: 'tormenta', tiempo: 10, dato: 'polvo',
    texto: () => 'Una pequeña tormenta local se acerca. Durará solo hoy.',
    consejo: 'Para una tormenta corta, retraer los paneles es lo más seguro.',
    inicio(S) { S.polvoSols = Math.max(S.polvoSols, 1); },
    opciones: [
      { texto: '🔽 Retraer paneles', detalle: 'Pierdes la energía solar de hoy', efecto(S) { S.paneles = false; return 'Paneles a salvo. ¡Recuerda desplegarlos mañana!'; } },
      { texto: '☀️ Dejarlos afuera', detalle: 'Sigues generando un poco, pero se ensucian', efecto() { return 'Los paneles se quedan afuera y se ensucian.'; } },
    ],
    alAgotarse() { return 'Los paneles se quedaron afuera.'; },
  },
  llamarada: {
    icono: '☀️', titulo: '¡Alerta de llamarada solar!', fx: 'llamarada', tiempo: 10, dato: 'llamarada', real: true,
    texto: S => {
      const f = S.llamarada;
      const origen = CLIMA.real && !CLIMA.tranquilo
        ? `🛰️ Basada en una llamarada <b>real</b> que la NASA detectó el ${f.fecha} (DONKI, en vivo).`
        : `📚 Basada en una llamarada histórica real del ${f.fecha} (archivo NASA DONKI).`;
      return `Los satélites detectaron una llamarada clase <b>${f.clase}</b>. Una lluvia de partículas de alta energía viene hacia Marte.<br><small class="real">${origen}</small>`;
    },
    consejo: 'Todos al refugio. La salud de la tripulación es primero; los experimentos pueden esperar.',
    inicio(S) { S.llamarada = elegirLlamarada(); },
    opciones: [
      { texto: '🛡️ ¡Todos al refugio!', detalle: 'Nadie trabaja hoy: sin ciencia y menos cosecha',
        efecto(S) { S.refugio = true; S.rad += 0.3; return 'La tripulación se protegió en el refugio. Hoy no hubo ciencia y se cosechó menos, pero todos están a salvo.'; } },
      { texto: '🔬 Seguir con los experimentos', detalle: '+10 ciencia… pero mucha radiación',
        efecto(S) { const d = dosisLlamarada(S, S.llamarada.clase); S.rad += d; S.ciencia += 10; return `Siguieron trabajando: +10 ciencia, pero recibieron <b>${d} mSv</b> extra de radiación.`; } },
    ],
    alAgotarse(S) { const d = dosisLlamarada(S, S.llamarada.clase); S.rad += d; return `Nadie dio la orden y la tripulación recibió <b>${d} mSv</b> de radiación.`; },
  },
  meteorito: {
    icono: '☄️', titulo: '¡Impacto de micrometeorito!', fx: 'meteorito', tiempo: 10, dato: 'meteorito',
    texto: () => 'Un granito de roca espacial perforó el techo del invernadero. ¡Se está escapando el aire!',
    consejo: 'Si tienen repuestos, parchen el agujero. Si no, cierren la escotilla del invernadero.',
    opciones: [
      { texto: '🧰 Parchar el agujero', detalle: 'Usa 1 repuesto', disponible: S => S.repuestos > 0,
        efecto(S) { S.repuestos--; S.o2 -= 3; return 'Parchaste el agujero. Solo se perdió un poquito de aire.'; } },
      { texto: '🚪 Cerrar el invernadero', detalle: 'Sin perder aire, pero producirá la mitad',
        efecto(S) { S.invSalud = Math.min(S.invSalud, 0.5); S.o2 -= 5; return 'Cerraste la escotilla. El invernadero producirá la mitad hasta que lo repares.'; } },
    ],
    alAgotarse(S) { S.o2 -= 15; S.invSalud = Math.min(S.invSalud, 0.5); return 'Mientras nadie decidía se escapó mucho aire (-15 de oxígeno).'; },
  },
  reciclador: {
    icono: '🚰', titulo: '¡Falla el reciclador de agua!', fx: 'alarma', tiempo: 10, dato: 'agua',
    texto: () => 'La máquina que recicla el agua (¡y ayuda a fabricar oxígeno!) hace un ruido extraño y gotea.',
    consejo: 'Cambien la pieza con un repuesto. Repararla a mano funciona a veces, pero ocupa a toda la tripulación.',
    opciones: [
      { texto: '🔩 Cambiar la pieza', detalle: 'Usa 1 repuesto: arreglo seguro', disponible: S => S.repuestos > 0,
        efecto(S) { S.repuestos--; return '¡El reciclador funciona como nuevo!'; } },
      { texto: '🛠️ Repararla a mano', detalle: 'Gratis, pero ocupa el día y puede fallar',
        efecto(S) { S.ocupados = true; if (Math.random() < 0.65) return '¡La reparación funcionó! Hoy se trabajó menos.'; S.o2 -= 12; return 'La reparación salió mal (-12 de oxígeno). Hoy se trabajó menos.'; } },
    ],
    alAgotarse(S) { S.o2 -= 15; return 'El reciclador siguió fallando todo el día (-15 de oxígeno).'; },
  },
  plaga: {
    icono: '🐛', titulo: 'Plantas enfermas', fx: null, tiempo: 10, dato: 'invernadero',
    texto: () => 'Algunas plantas del invernadero tienen manchas raras en las hojas.',
    consejo: 'Quiten las plantas enfermas antes de que contagien a las demás.',
    opciones: [
      { texto: '✂️ Quitar las enfermas', detalle: 'Pierdes un poco de comida ahora', efecto(S) { S.comida -= 6; return 'Quitaste las plantas enfermas (-6 de comida). El resto está sano.'; } },
      { texto: '🤞 Esperar a ver', detalle: 'Puede que se curen… o no', efecto: esperarPlaga },
    ],
    alAgotarse: esperarPlaga,
  },
  fiebre: {
    icono: '🤒', titulo: 'Un astronauta tiene fiebre', fx: null, tiempo: 10, dato: null,
    texto: () => 'Uno de tus astronautas se siente mal y tiene fiebre.',
    consejo: 'Si queda medicina en el botiquín, úsenla. Si no, que descanse.',
    opciones: [
      { texto: '💊 Medicina del botiquín', detalle: S => `Quedan ${S.botiquin}`, disponible: S => S.botiquin > 0,
        efecto(S) { S.botiquin--; return 'La medicina funcionó. ¡Se siente mejor!'; } },
      { texto: '🛏️ Que descanse', detalle: 'Hoy hay menos manos trabajando', efecto(S) { S.ocupados = true; return 'Descansó y se recuperó, pero hoy se trabajó menos.'; } },
    ],
    alAgotarse(S) { S.salud -= 8; return 'Nadie lo atendió y la salud de la tripulación bajó (-8).'; },
  },
  remolino: {
    icono: '🌀', titulo: '¡Un remolino de polvo!', fx: 'remolino', tiempo: 0, dato: 'remolino',
    texto: () => 'Un "diablo de polvo" pasó sobre los paneles solares… ¡y los sopló hasta dejarlos más limpios!',
    opciones: [{ texto: '¡Qué suerte! 🎉', efecto(S) { S.eficiencia = Math.min(1, S.eficiencia + 0.3); return 'Los paneles recuperaron eficiencia.'; } }],
  },
  hielo: {
    icono: '🧊', titulo: '¡El rover encontró hielo!', fx: null, tiempo: 0, dato: 'hielo',
    texto: () => 'Bajo una capa de polvo hay hielo de agua. Con él se puede fabricar oxígeno.',
    opciones: [{ texto: '¡A usarlo! 💧', efecto(S) { S.o2 = Math.min(100, S.o2 + 12); S.ciencia += 5; return '+12 de oxígeno y +5 de ciencia.'; } }],
  },
};

function esperarPlaga(S) {
  if (Math.random() < 0.6) { S.invSalud = Math.max(0.3, S.invSalud - 0.3); return 'La enfermedad se contagió. El invernadero producirá menos.'; }
  return '¡Las plantas se recuperaron solas! Esta vez hubo suerte.';
}

export function elegirEvento(S) {
  const g = MISION.guion[S.sol];
  if (g) return g;
  if (S.sol < 2 || Math.random() > 0.38) return null;
  const pool = [
    ['meteorito', 1], ['reciclador', 0.7], ['plaga', 1], ['fiebre', 0.7],
    ['llamarada', CLIMA.riesgo], ['polvo', enTormenta(S) ? 0 : 1],
    ['hielo', 0.3], ['remolino', S.eficiencia < 0.9 ? 1 : 0],
  ].filter(([id, p]) => p > 0 && id !== S.ultimoEvento);
  let r = Math.random() * pool.reduce((a, [, p]) => a + p, 0);
  for (const [id, p] of pool) if ((r -= p) <= 0) return id;
  return null;
}

// ---------------------------------------------------------------------
//  INICIO DE SOL: llegan (o no) los mensajes de la Tierra
// ---------------------------------------------------------------------
export function iniciarSol(S) {
  S.fase = 'planear';
  const avisos = MISION.avisos[S.sol] || [];
  const llegan = S.pendientes.filter(p => p.sol <= S.sol);
  S.pendientes = S.pendientes.filter(p => p.sol > S.sol);
  if (enConjuncion(S)) {
    log(S, '🌞 <b>Conjunción solar:</b> el Sol está entre Marte y la Tierra. No hay comunicación. ¡Están solos!', 'aviso');
    aprender(S, 'conjuncion');
    const despues = MISION.conjuncion[MISION.conjuncion.length - 1] + 1;
    S.pendientes.push(...llegan.map(p => ({ ...p, sol: despues })));
  } else if (S.niveles.radio > 0) {
    for (const a of avisos) log(S, `📡 <b>Control de Misión</b> <small>(enviado hace ${MISION.delayMin} min)</small>: ${a}`, 'tierra');
    for (const p of llegan) log(S, `📡 <b>Respuesta a tu pregunta del Sol ${p.desde}</b>: ${p.texto}`, 'tierra');
  } else if (avisos.length || llegan.length) {
    log(S, '📡 Había mensajes de la Tierra… pero las comunicaciones estaban <b>apagadas</b>. ¡No los recibiste!', 'mal');
  }
  if (S.sol === 1) aprender(S, 'sol');
}

// Pedir ayuda durante una emergencia: la respuesta llega TARDE (retraso real).
export function pedirAyuda(S, ev) {
  aprender(S, 'retraso');
  if (enConjuncion(S)) return '🌞 El Sol está entre Marte y la Tierra: la señal no puede pasar. ¡Decide tú!';
  if (S.niveles.radio === 0) return '📡 Tus comunicaciones están apagadas. Nadie puede escucharte.';
  S.pendientes.push({ sol: S.sol + 1, desde: S.sol, texto: ev.consejo });
  return `📨 Mensaje enviado… pero tarda <b>${MISION.delayMin} minutos</b> en llegar a la Tierra y otros ${MISION.delayMin} en volver. ¡La emergencia es <b>ahora</b>! Tendrás que decidir tú. (La respuesta llegará mañana.)`;
}

export const foto = S => ({ bateria: S.bateria, o2: S.o2, comida: S.comida, rad: S.rad, salud: S.salud, ciencia: S.ciencia });

// ---------------------------------------------------------------------
//  SIMULAR EL SOL
// ---------------------------------------------------------------------
export function simularSol(S, resultadoEvento, ev) {
  const lineas = [];
  if (resultadoEvento) lineas.push(`${ev.icono} ${resultadoEvento}`);

  // 1) Energía: si no alcanza, se apagan sistemas (primero lo menos vital)
  const gen = solarHoy(S) + MISION.nuclear;
  const niv = { ...S.niveles };
  let construir = S.construir;
  const disponible = S.bateria + gen;
  const apagados = [];
  if (construir && consumo(S, niv, construir) > disponible) { construir = false; apagados.push('la construcción'); }
  for (const id of ['lab', 'radio', 'invernadero', 'vital']) {
    while (consumo(S, niv, construir) > disponible + 1e-9 && niv[id] > 0) {
      niv[id]--;
      const nom = SISTEMAS[id].nombre.toLowerCase();
      if (!apagados.includes(nom)) apagados.push(nom);
    }
  }
  S.bateria = r1(clamp(S.bateria + gen - consumo(S, niv, construir), 0, MISION.bateriaMax));
  S.energiaOk = apagados.length === 0;
  if (apagados.length) { lineas.push(`🔌 <b>¡Apagón!</b> La energía no alcanzó y se apagó o bajó: ${apagados.join(', ')}.`); aprender(S, 'bateria'); }

  const trabajan = !S.refugio && !S.ocupados;

  // 2) Soporte vital: oxígeno y calor
  S.o2 += [-20, -8, 0, 4][niv.vital];
  if (niv.vital < 2) {
    S.salud -= 4 * (2 - niv.vital);
    lineas.push('🥶 El soporte vital trabajó poco: bajó el oxígeno y hizo frío.');
    aprender(S, 'oxigeno');
  }

  // 3) Comida
  let cosecha = [0, 2, 4, 6][niv.invernadero] * S.invSalud * (trabajan ? 1 : 0.5);
  S.comida += cosecha - 5;

  // 4) Ciencia
  if (niv.lab > 0) {
    const c = trabajan ? [0, 4, 8][niv.lab] : 0;
    S.ciencia += c;
    if (c) lineas.push(`🔬 El laboratorio hizo experimentos: +${c} ciencia.`);
    else lineas.push('🔬 Hoy nadie pudo trabajar en el laboratorio.');
  }

  // 5) Comunicaciones
  if (niv.radio >= 2 && !enConjuncion(S)) S.salud += 2;

  // 6) Radiación de fondo (en Marte siempre hay un poco)
  S.rad += MISION.radDiaria * (S.blindaje >= 3 ? RADIACION.atenuacionBlindaje : 1);

  // 7) Polvo
  if (enTormenta(S) && S.paneles) {
    S.eficiencia = Math.max(0.2, S.eficiencia - 0.15);
    lineas.push('🌪️ El polvo rayó y cubrió los paneles: ahora generan menos.');
  }

  // 8) Blindaje
  if (construir) {
    S.blindaje++;
    if (S.blindaje >= 3) { S.construir = false; lineas.push('🧱 <b>¡Blindaje terminado!</b> La radiación ahora les afecta mucho menos.'); aprender(S, 'regolito'); }
    else lineas.push(`🧱 Construcción del blindaje: ${S.blindaje}/3.`);
  }

  // 9) Salud según recursos
  let sano = niv.vital >= 2;
  if (S.o2 < 25) { S.salud -= 10; sano = false; lineas.push('⚠️ ¡Queda poco oxígeno! La tripulación se siente mareada.'); }
  if (S.comida <= 0) { S.salud -= 10; sano = false; lineas.push('⚠️ ¡Se acabó la comida!'); }
  if (sano) S.salud += 2;

  for (const k of ['o2', 'comida', 'salud']) S[k] = clamp(Math.round(S[k]), 0, 100);
  S.rad = r1(S.rad);

  const habiaPolvo = S.polvoSols > 0;
  S.polvoSols = Math.max(0, S.polvoSols - 1);
  if (habiaPolvo && S.polvoSols === 0) lineas.push('🌤️ El polvo se asentó.' + (S.paneles ? '' : ' <b>¡Despliega los paneles!</b>'));
  S.refugio = false; S.ocupados = false; S.eva = false; S.expedicion = false; S.evaHecha = false;

  // Dato educativo y hallazgo de salud real (OSDR)
  let dato = ev?.dato;
  if (!dato && apagados.length) dato = 'bateria';
  if (!dato || S.aprendidos.includes(dato)) {
    const nuevos = Object.keys(DATOS).filter(k => !S.aprendidos.includes(k));
    dato = nuevos.length ? nuevos[Math.floor(Math.random() * nuevos.length)] : dato;
  }
  aprender(S, dato);
  const tema = ev?.dato === 'llamarada' ? 'radiacion' : S.comida < 30 ? 'comida' : S.o2 < 50 ? 'oxigeno' : null;
  const hallazgo = tema ? HALLAZGOS.find(h => h.tema === tema) : null;

  S.historial.push({ sol: S.sol, ...foto(S) });
  lineas.forEach(l => log(S, l, l.includes('⚠️') || l.includes('Apagón') ? 'mal' : ''));
  return { lineas, dato, hallazgo };
}

export function finDePartida(S) {
  if (S.o2 <= 0) return { gano: false, icono: '🫁', texto: 'Se acabó el oxígeno.' };
  if (S.salud <= 0) return { gano: false, icono: '❤️', texto: 'La salud de la tripulación llegó a cero.' };
  if (S.rad >= MISION.radLimite) return { gano: false, icono: '☢️', texto: `La tripulación recibió demasiada radiación (${S.rad} mSv).` };
  if (S.sol >= MISION.maxSol) {
    // ⭐ sobrevivir · ⭐ cumplir la meta de ciencia · ⭐ lograr la ciencia SIN arriesgar a la tripulación
    let estrellas = 1;
    if (S.ciencia >= MISION.metaCiencia) {
      estrellas++;
      if (S.rad < MISION.radLimite / 2 && S.salud >= 70) estrellas++;
    }
    return { gano: true, estrellas };
  }
  return null;
}
