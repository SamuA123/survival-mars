// =====================================================================
//  SURVIVAL MARS — lógica principal
//  Flujo de cada sol:
//    1. iniciarSol()  -> llegan mensajes de la Tierra, el jugador planea
//    2. avanzar()     -> puede saltar una EMERGENCIA con cuenta regresiva
//    3. simular()     -> se calculan energía, oxígeno, comida, radiación…
//    4. resumen       -> el jugador ve las consecuencias + "¿Sabías que?"
// =====================================================================
'use strict';

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;

let S = null;                       // estado de la partida
let CLIMA = { real: false, flares: LLAMARADAS_RESPALDO, riesgo: 1, resumen: 'cargando…' };
let sonido = true, cuenta = null;

// ---------------------------------------------------------------------
//  Estado inicial
// ---------------------------------------------------------------------
function nuevaPartida(nombre) {
  S = {
    nombre: nombre || 'Comandante',
    sol: 1,
    bateria: MISION.bateriaInicial, o2: 100, agua: 100, comida: 60, salud: 100, moral: 80, rad: 0,
    niveles: { vital: 2, invernadero: 2, calor: 2, radio: 1 },
    paneles: true, eficiencia: 1, invSalud: 1,
    repuestos: MISION.repuestos, botiquin: MISION.botiquin,
    blindaje: 0, construir: false,
    polvoSols: 0, eva: false, refugio: false, ocupados: false,
    energiaOk: true, pendientes: [], aprendidos: [], ultimoEvento: null,
    historial: [],
  };
  $('#bitacora').innerHTML = '';
}

// ---------------------------------------------------------------------
//  Energía
// ---------------------------------------------------------------------
const enTormenta = () => S.polvoSols > 0;
const enConjuncion = () => MISION.conjuncion.includes(S.sol);

function solarHoy() {
  if (!S.paneles) return 0;
  return MISION.solarBase * S.eficiencia * (enTormenta() ? 0.25 : 1);
}
const generacion = () => solarHoy() + MISION.nuclear;

function consumo(niv = S.niveles, construir = S.construir) {
  let c = 1; // computadoras y luces básicas
  for (const s of SISTEMAS) c += niv[s.id] * s.costo;
  if (construir) c += 4;
  return c;
}

// ---------------------------------------------------------------------
//  Bitácora
// ---------------------------------------------------------------------
function log(texto, tipo = '') {
  const li = document.createElement('li');
  li.className = tipo;
  li.innerHTML = `<span class="log-sol">Sol ${S.sol}</span> ${texto}`;
  $('#bitacora').prepend(li);
}

function aprender(clave) {
  if (clave && DATOS[clave] && !S.aprendidos.includes(clave)) S.aprendidos.push(clave);
}

// ---------------------------------------------------------------------
//  Sonido (pitidos simples con WebAudio, sin archivos)
// ---------------------------------------------------------------------
let actx = null;
function beep(f = 660, d = 0.08, tipo = 'square') {
  if (!sonido) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = tipo; o.frequency.value = f; g.gain.value = 0.05;
    o.connect(g); g.connect(actx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.stop(actx.currentTime + d + 0.02);
  } catch (e) { /* sin audio */ }
}

// ---------------------------------------------------------------------
//  Llamaradas reales (DONKI)
// ---------------------------------------------------------------------
function elegirLlamarada() {
  const lista = CLIMA.flares && CLIMA.flares.length ? CLIMA.flares : LLAMARADAS_RESPALDO;
  // Preferimos las más fuertes para que el evento se sienta importante
  const fuertes = lista.filter(f => 'MX'.includes(f.clase[0]));
  const pool = fuertes.length ? fuertes : lista;
  return pool[Math.floor(Math.random() * pool.length)];
}

function dosisLlamarada(clase) {
  const base = { X: 50, M: 25, C: 8, B: 3, A: 2 }[clase[0]] || 8;
  const mag = Math.min(parseFloat(clase.slice(1)) || 1, 5);
  const escudo = S.blindaje >= 3 ? 0.4 : 1;
  return Math.round(base * (0.8 + mag / 10) * MISION.flareMult * escudo);
}

// ---------------------------------------------------------------------
//  EVENTOS / EMERGENCIAS
//  tiempo: segundos para decidir (0 = sin prisa)
//  alAgotarse: qué pasa si no decides a tiempo
// ---------------------------------------------------------------------
const EVENTOS = {
  tormenta: {
    icono: '🌪️', titulo: '¡Llegó la tormenta de polvo!',
    texto: () => 'Una tormenta gigante cubre el cielo. El viento lleva polvo que tapa y raya los paneles solares. Durará 3 sols.',
    tiempo: 10, dato: 'polvo',
    consejo: 'Retraigan los paneles. Perder energía solar unos días es mejor que dañarlos para siempre. Usen la batería y el reactor.',
    inicio() { S.polvoSols = 3; },
    opciones: [
      { texto: '🔽 Retraer paneles', detalle: 'Sin energía solar, pero los paneles quedan a salvo',
        efecto() { S.paneles = false; return 'Retrajiste los paneles: están protegidos. Hoy solo tendrás la energía del reactor y la batería. ¡Despliégalos cuando pase la tormenta!'; } },
      { texto: '☀️ Dejarlos afuera', detalle: 'Generan un poquito, pero el polvo los raya',
        efecto() { return 'Los paneles siguen afuera. Generan muy poco y el polvo los está rayando cada sol.'; } },
    ],
    alAgotarse() { return 'Los paneles se quedaron afuera en plena tormenta.'; },
  },

  polvo: {
    icono: '💨', titulo: '¡Ráfaga de polvo!',
    texto: () => 'Una pequeña tormenta local se acerca a la base. Durará solo hoy.',
    tiempo: 10, dato: 'polvo',
    consejo: 'Para una tormenta corta, retraer los paneles es lo más seguro.',
    inicio() { S.polvoSols = Math.max(S.polvoSols, 1); },
    opciones: [
      { texto: '🔽 Retraer paneles', detalle: 'Pierdes la energía solar de hoy',
        efecto() { S.paneles = false; return 'Paneles a salvo. ¡Recuerda desplegarlos mañana!'; } },
      { texto: '☀️ Dejarlos afuera', detalle: 'Sigues generando un poco, pero se ensucian',
        efecto() { return 'Los paneles se quedan afuera. Se ensuciarán un poco.'; } },
    ],
    alAgotarse() { return 'Los paneles se quedaron afuera.'; },
  },

  llamarada: {
    icono: '☀️', titulo: '¡Alerta de llamarada solar!',
    texto: () => {
      const f = S.llamarada;
      const origen = CLIMA.real && !CLIMA.tranquilo
        ? `Basada en una llamarada <b>real</b> que la NASA detectó el ${f.fecha}.`
        : `Basada en una llamarada histórica real del ${f.fecha}.`;
      return `Los satélites detectaron una llamarada clase <b>${f.clase}</b>. Una lluvia de partículas de alta energía viene hacia Marte.<br><small class="real">📡 ${origen}</small>`;
    },
    tiempo: 10, dato: 'llamarada',
    consejo: 'Todos al refugio, ya. La salud de la tripulación es primero; el trabajo puede esperar.',
    inicio() { S.llamarada = elegirLlamarada(); Escena.destello(); },
    opciones: [
      { texto: '🛡️ ¡Todos al refugio!', detalle: 'Hoy se trabaja menos, pero todos a salvo',
        efecto() { S.refugio = true; S.rad += 0.5; aprender('radiacion'); return 'La tripulación se protegió en el refugio. El invernadero produjo menos hoy, pero todos están a salvo. ¡Buena decisión!'; } },
      { texto: '🔧 Seguir trabajando', detalle: 'No pierdes trabajo… pero hay radiación',
        efecto() { const d = dosisLlamarada(S.llamarada.clase); S.rad += d; aprender('radiacion'); return `La tripulación siguió trabajando y recibió <b>${d} mSv</b> extra de radiación.`; } },
    ],
    alAgotarse() { const d = dosisLlamarada(S.llamarada.clase); S.rad += d; return `Nadie dio la orden y la tripulación recibió <b>${d} mSv</b> de radiación.`; },
  },

  meteorito: {
    icono: '☄️', titulo: '¡Impacto de micrometeorito!',
    texto: () => 'Un granito de roca espacial perforó el techo del invernadero. ¡Se está escapando el aire!',
    tiempo: 10, dato: 'micrometeorito',
    consejo: 'Si tienen repuestos, parchen el agujero. Si no, cierren la escotilla del invernadero.',
    inicio() { Escena.sacudir(); beep(120, 0.4, 'sawtooth'); },
    opciones: [
      { texto: '🧰 Parchar el agujero', detalle: 'Usa 1 repuesto', disponible: () => S.repuestos > 0,
        efecto() { S.repuestos--; S.o2 -= 3; aprender('repuestos'); return 'Parchaste el agujero con un repuesto. Solo se perdió un poquito de aire.'; } },
      { texto: '🚪 Cerrar el invernadero', detalle: 'Sin aire perdido, pero produce la mitad',
        efecto() { S.invSalud = Math.min(S.invSalud, 0.5); S.o2 -= 5; return 'Cerraste la escotilla. El invernadero producirá la mitad hasta que lo repares.'; } },
    ],
    alAgotarse() { S.o2 -= 15; S.invSalud = Math.min(S.invSalud, 0.5); return 'Mientras nadie decidía se escapó mucho aire (-15 de oxígeno) y el invernadero quedó dañado.'; },
  },

  reciclador: {
    icono: '🚰', titulo: '¡Falla el reciclador de agua!',
    texto: () => 'La máquina que limpia y recicla el agua hace un ruido extraño y gotea.',
    tiempo: 10, dato: 'agua',
    consejo: 'Cambien la pieza con un repuesto. Repararla a mano funciona a veces, pero ocupa a toda la tripulación.',
    opciones: [
      { texto: '🔩 Cambiar la pieza', detalle: 'Usa 1 repuesto, arreglo seguro', disponible: () => S.repuestos > 0,
        efecto() { S.repuestos--; aprender('repuestos'); return 'Cambiaste la pieza. ¡El reciclador funciona como nuevo!'; } },
      { texto: '🛠️ Repararla a mano', detalle: 'Gratis, pero ocupa el día y puede fallar',
        efecto() {
          S.ocupados = true;
          if (Math.random() < 0.65) return 'Después de mucho trabajo, ¡la reparación funcionó! Hoy se cultivó menos.';
          S.agua -= 12; return 'La reparación no salió bien y se perdió agua (-12). Hoy se cultivó menos.';
        } },
    ],
    alAgotarse() { S.agua -= 15; return 'El reciclador siguió goteando todo el día (-15 de agua).'; },
  },

  plaga: {
    icono: '🐛', titulo: 'Plantas enfermas',
    texto: () => 'Algunas plantas del invernadero tienen manchas raras en las hojas.',
    tiempo: 10, dato: 'invernadero',
    consejo: 'Quiten las plantas enfermas antes de que contagien a las demás.',
    opciones: [
      { texto: '✂️ Quitar las enfermas', detalle: 'Pierdes un poco de comida ahora',
        efecto() { S.comida -= 6; return 'Quitaste las plantas enfermas (-6 de comida). El resto del invernadero está sano.'; } },
      { texto: '🤞 Esperar a ver', detalle: 'Puede que se curen… o no',
        efecto() { return esperarPlaga(); } },
    ],
    alAgotarse() { return esperarPlaga(); },
  },

  fiebre: {
    icono: '🤒', titulo: 'Un astronauta tiene fiebre',
    texto: () => 'Uno de tus astronautas se siente mal y tiene fiebre.',
    tiempo: 10, dato: 'moral',
    consejo: 'Si queda medicina en el botiquín, úsenla. Si no, que descanse.',
    opciones: [
      { texto: '💊 Medicina del botiquín', detalle: () => `Quedan ${S.botiquin}`, disponible: () => S.botiquin > 0,
        efecto() { S.botiquin--; return 'La medicina funcionó. ¡Se siente mejor!'; } },
      { texto: '🛏️ Que descanse', detalle: 'Hoy hay menos manos trabajando',
        efecto() { S.ocupados = true; S.moral -= 2; return 'El astronauta descansó y se recuperó, pero hoy se trabajó menos.'; } },
    ],
    alAgotarse() { S.salud -= 8; return 'Nadie lo atendió y la salud de la tripulación bajó (-8).'; },
  },

  remolino: {
    icono: '🌀', titulo: '¡Un remolino de polvo!',
    texto: () => 'Un "diablo de polvo" pasó justo sobre los paneles solares… ¡y los sopló hasta dejarlos más limpios!',
    tiempo: 0, dato: 'remolino',
    opciones: [{ texto: '¡Qué suerte! 🎉', efecto() { S.eficiencia = Math.min(1, S.eficiencia + 0.3); return 'Los paneles recuperaron eficiencia.'; } }],
  },

  hielo: {
    icono: '🧊', titulo: '¡Encontraron hielo!',
    texto: () => 'Mientras instalaban un sensor, la tripulación encontró hielo de agua bajo el suelo.',
    tiempo: 0, dato: 'hielo',
    opciones: [{ texto: '¡A derretirlo! 💧', efecto() { S.agua += 15; return 'Derritieron y filtraron el hielo: +15 de agua.'; } }],
  },
};

function esperarPlaga() {
  if (Math.random() < 0.6) { S.invSalud = Math.max(0.3, S.invSalud - 0.3); return 'La enfermedad se contagió. El invernadero quedó dañado y producirá menos.'; }
  return '¡Las plantas se recuperaron solas! Esta vez hubo suerte.';
}

function elegirEvento() {
  const guion = MISION.guion[S.sol];
  if (guion) return guion;
  if (S.sol < 2 || Math.random() > 0.35) return null;
  const pool = [
    ['meteorito', 1], ['reciclador', 0.8], ['plaga', 1], ['fiebre', 0.8],
    ['llamarada', CLIMA.riesgo], ['polvo', enTormenta() ? 0 : 1], ['hielo', 0.5], ['remolino', S.eficiencia < 0.9 ? 1 : 0],
  ].filter(([id, p]) => p > 0 && id !== S.ultimoEvento);
  let total = pool.reduce((a, [, p]) => a + p, 0), r = Math.random() * total;
  for (const [id, p] of pool) { if ((r -= p) <= 0) return id; }
  return null;
}

// ---------------------------------------------------------------------
//  Inicio de cada sol
// ---------------------------------------------------------------------
function iniciarSol() {
  const radioOn = S.niveles.radio > 0;
  const avisos = MISION.avisos[S.sol] || [];
  const llegan = S.pendientes.filter(p => p.sol <= S.sol);
  S.pendientes = S.pendientes.filter(p => p.sol > S.sol);

  if (enConjuncion()) {
    log('🌞 <b>Conjunción solar:</b> el Sol está entre Marte y la Tierra. No hay comunicación. ¡Están solos!', 'aviso');
    aprender('conjuncion');
    S.pendientes.push(...llegan.map(p => ({ ...p, sol: MISION.conjuncion[MISION.conjuncion.length - 1] + 1 })));
  } else if (radioOn) {
    for (const a of avisos) log(`📡 <b>Control de Misión</b> <small>(enviado hace ${MISION.delayMin} min)</small>: ${a}`, 'tierra');
    for (const p of llegan) log(`📡 <b>Respuesta a tu pregunta del Sol ${p.desde}</b>: ${p.texto}`, 'tierra');
  } else if (avisos.length || llegan.length) {
    log('📡 Había mensajes de la Tierra… pero tus comunicaciones estaban <b>apagadas</b>. ¡No los recibiste!', 'mal');
    aprender('comunicaciones');
  }
  if (S.sol === 1) aprender('sol');
  render();
  $('#btnAvanzar').disabled = false;
}

// ---------------------------------------------------------------------
//  Terminar el sol
// ---------------------------------------------------------------------
function avanzar() {
  $('#btnAvanzar').disabled = true;
  const antes = foto();
  const id = elegirEvento();
  S.ultimoEvento = id;
  if (id) mostrarEvento(EVENTOS[id], res => simular(antes, res, EVENTOS[id]));
  else simular(antes, null, null);
}

const foto = () => ({ o2: S.o2, agua: S.agua, comida: S.comida, salud: S.salud, moral: S.moral, bateria: S.bateria, rad: S.rad });

function simular(antes, resultadoEvento, ev) {
  const lineas = [];
  if (resultadoEvento) lineas.push(`${ev.icono} ${resultadoEvento}`);

  // 1) ENERGÍA: si no alcanza, se apagan sistemas solos (primero lo menos vital)
  const gen = generacion();
  const niv = { ...S.niveles };
  let construir = S.construir;
  const disponible = S.bateria + gen;
  let apagados = [];
  if (consumo(niv, construir) > disponible && construir) { construir = false; apagados.push('la construcción'); }
  for (const id of ['radio', 'invernadero', 'calor', 'vital']) {
    while (consumo(niv, construir) > disponible + 1e-9 && niv[id] > 0) {
      niv[id]--;
      const nom = SISTEMAS.find(s => s.id === id).nombre.toLowerCase();
      if (!apagados.includes(nom)) apagados.push(nom);
    }
  }
  const cons = consumo(niv, construir);
  S.bateria = clamp(S.bateria + gen - cons, 0, MISION.bateriaMax);
  S.energiaOk = apagados.length === 0;
  if (apagados.length) {
    lineas.push(`🔌 <b>¡Apagón!</b> La energía no alcanzó y se apagó/bajó: ${apagados.join(', ')}.`);
    aprender('bateria');
  }

  // 2) SOPORTE VITAL: oxígeno y agua
  S.o2 += [-20, -8, 0, 4][niv.vital];
  S.agua += [-10, -4, -1, 1][niv.vital];
  if (niv.vital < 2) { lineas.push('🫁 El soporte vital trabajó poco: bajó el oxígeno.'); aprender('oxigeno'); }

  // 3) COMIDA
  let cosecha = [0, 2, 4, 6][niv.invernadero] * S.invSalud;
  if (S.refugio || S.ocupados) cosecha *= 0.5;
  if (S.moral < 30) { cosecha *= 0.7; lineas.push('😞 La tripulación está desanimada y trabajó menos.'); }
  S.comida += cosecha - 5;

  // 4) CALOR
  const falta = MISION.calorNecesario - niv.calor;
  if (falta > 0) {
    S.salud -= 4 * falta; S.moral -= 6 * falta;
    lineas.push('🥶 Hizo frío en la base: bajaron la salud y el ánimo.');
    aprender('calor');
  }

  // 5) COMUNICACIONES Y ÁNIMO
  if (enConjuncion()) S.moral -= 2;
  else if (niv.radio === 0) { S.moral -= 4; lineas.push('📡 Sin comunicaciones, la tripulación se siente sola.'); }
  else if (niv.radio >= 2) S.moral += 3;
  if (S.refugio) S.moral -= 4;

  // 6) RADIACIÓN de fondo (siempre hay un poco en Marte)
  S.rad += MISION.radDiaria * (S.blindaje >= 3 ? 0.4 : 1);

  // 7) POLVO sobre los paneles
  if (enTormenta() && S.paneles) {
    S.eficiencia = Math.max(0.2, S.eficiencia - 0.15);
    lineas.push('🌪️ El polvo rayó y cubrió los paneles: ahora generan menos.');
  }

  // 8) CONSTRUCCIÓN del blindaje
  if (construir) {
    S.blindaje++;
    if (S.blindaje >= 3) { S.construir = false; lineas.push('🧱 <b>¡Blindaje de regolito terminado!</b> Ahora la radiación les afecta mucho menos.'); aprender('regolito'); }
    else lineas.push(`🧱 Construcción del blindaje: ${S.blindaje}/3.`);
  }

  // 9) SALUD según recursos
  let sano = true;
  if (S.o2 < 25) { S.salud -= 10; sano = false; lineas.push('⚠️ ¡Queda poco oxígeno! La tripulación se siente mareada.'); }
  if (S.agua < 20) { S.salud -= 6; sano = false; lineas.push('⚠️ Queda poca agua.'); }
  if (S.comida <= 0) { S.salud -= 10; sano = false; lineas.push('⚠️ ¡Se acabó la comida!'); }
  if (S.moral < 20) { S.salud -= 3; sano = false; }
  if (sano && falta <= 0) S.salud += 2;

  for (const k of ['o2', 'agua', 'comida', 'salud', 'moral']) S[k] = clamp(S[k], 0, 100);
  S.rad = r1(S.rad);

  // Fin del día: limpiar banderas
  const tormentaAntes = S.polvoSols > 0;
  S.polvoSols = Math.max(0, S.polvoSols - 1);
  if (tormentaAntes && S.polvoSols === 0) lineas.push('🌤️ El polvo se asentó. ' + (S.paneles ? '' : '<b>¡Despliega los paneles!</b>'));
  S.refugio = false; S.ocupados = false; S.eva = false;

  // Dato educativo
  let dato = ev && ev.dato;
  if (!dato && apagados.length) dato = 'bateria';
  if (!dato || S.aprendidos.includes(dato)) {
    const nuevos = Object.keys(DATOS).filter(k => !S.aprendidos.includes(k));
    dato = nuevos.length ? nuevos[Math.floor(Math.random() * nuevos.length)] : dato;
  }
  aprender(dato);

  S.historial.push({ sol: S.sol, ...foto() });
  lineas.forEach(l => log(l, l.includes('⚠️') || l.includes('Apagón') ? 'mal' : ''));
  render();
  mostrarResumen(antes, lineas, dato);
}

function motivoDerrota() {
  if (S.o2 <= 0) return { icono: '🫧', texto: 'Se acabó el oxígeno.' };
  if (S.salud <= 0) return { icono: '❤️', texto: 'La salud de la tripulación llegó a cero.' };
  if (S.rad >= MISION.radLimite) return { icono: '☢️', texto: `La tripulación recibió demasiada radiación (${S.rad} mSv).` };
  return null;
}

// ---------------------------------------------------------------------
//  Acciones del jugador
// ---------------------------------------------------------------------
function cambiarNivel(id, d) {
  const sis = SISTEMAS.find(s => s.id === id);
  S.niveles[id] = clamp(S.niveles[id] + d, 0, sis.max);
  beep(d > 0 ? 880 : 440, 0.05);
  render();
}

const ACCIONES = [
  {
    id: 'paneles',
    texto: () => S.paneles ? '🔽 Retraer paneles' : '🔼 Desplegar paneles',
    detalle: () => S.paneles ? 'Los protege del polvo, pero no generan' : '¡Vuelve a generar energía solar!',
    visible: () => true, activo: () => true,
    hacer() { S.paneles = !S.paneles; log(S.paneles ? '🔼 Paneles desplegados.' : '🔽 Paneles retraídos.'); },
  },
  {
    id: 'limpiar',
    texto: () => '🧹 Limpiar paneles (caminata espacial)',
    detalle: () => enTormenta() ? 'No se puede salir en plena tormenta' : `+30% eficiencia · +1,5 mSv de radiación`,
    visible: () => S.eficiencia < 1, activo: () => !enTormenta() && !S.eva,
    hacer() {
      S.eva = true; S.rad = r1(S.rad + 1.5); S.eficiencia = Math.min(1, S.eficiencia + 0.3);
      aprender('eva'); log('🧑‍🚀 Una astronauta salió a limpiar los paneles.');
    },
  },
  {
    id: 'blindaje',
    texto: () => S.construir ? '⏸️ Pausar construcción del blindaje' : `🧱 Construir blindaje de regolito (${S.blindaje}/3)`,
    detalle: () => 'Cubre el hábitat con tierra marciana: –60% de radiación. Cuesta +4 kWh por sol, 3 sols.',
    visible: () => S.blindaje < 3, activo: () => true,
    hacer() { S.construir = !S.construir; },
  },
  {
    id: 'reparar',
    texto: () => '🔧 Reparar invernadero',
    detalle: () => `Usa 1 repuesto (te quedan ${S.repuestos})`,
    visible: () => S.invSalud < 1, activo: () => S.repuestos > 0,
    hacer() { S.repuestos--; S.invSalud = 1; log('🔧 Invernadero reparado.'); },
  },
];

// ---------------------------------------------------------------------
//  RENDER
// ---------------------------------------------------------------------
function render() {
  $('#solBadge').textContent = `Sol ${S.sol} / ${MISION.maxSol}`;

  // Recursos
  $('#recursos').innerHTML = RECURSOS.map(r => {
    const max = r.id === 'bateria' ? MISION.bateriaMax : r.id === 'rad' ? MISION.radLimite : 100;
    const v = S[r.id], pct = clamp(v / max * 100, 0, 100);
    const malo = r.inverso ? pct > 70 : pct < 25;
    const medio = r.inverso ? pct > 45 : pct < 50;
    return `<div class="rec ${malo ? 'peligro' : medio ? 'medio' : ''}" title="${r.ayuda}">
      <div class="rec-top"><span>${r.icono} ${r.nombre}</span><b>${r1(v)}${r.unidad || ''}${r.id === 'rad' ? ' / ' + max : ''}</b></div>
      <div class="barra"><div style="width:${pct}%"></div></div></div>`;
  }).join('');

  // Energía
  const sol = solarHoy(), gen = sol + MISION.nuclear, cons = consumo(), bal = gen - cons;
  const manana = clamp(S.bateria + bal, 0, MISION.bateriaMax);
  const falta = S.bateria + bal < 0;
  const escala = Math.max(gen, cons, 1);
  $('#energia').innerHTML = `
    <div class="en-fila"><span>☀️ Solar ${S.paneles ? '' : '(retraídos)'}</span><b>${r1(sol)} kWh</b></div>
    <div class="en-fila"><span>⚛️ Reactor</span><b>${MISION.nuclear} kWh</b></div>
    <div class="en-barras">
      <div><small>Produces</small><div class="barra verde"><div style="width:${gen / escala * 100}%"></div></div><b>${r1(gen)}</b></div>
      <div><small>Gastas</small><div class="barra naranja"><div style="width:${cons / escala * 100}%"></div></div><b>${r1(cons)}</b></div>
    </div>
    <div class="en-balance ${bal >= 0 ? 'pos' : 'neg'}">Balance: ${bal >= 0 ? '+' : ''}${r1(bal)} kWh · 🔋 mañana: <b>${r1(manana)}</b> / ${MISION.bateriaMax}</div>
    ${falta ? '<div class="alerta">⚠️ ¡No alcanza la energía! Habrá un apagón y se apagarán sistemas.</div>' : ''}
    ${S.paneles ? '' : '<div class="alerta suave">Los paneles están retraídos: no producen energía solar.</div>'}`;

  // Sistemas
  $('#sistemas').innerHTML = SISTEMAS.map(s => {
    const n = S.niveles[s.id];
    let hint = s.niveles[n];
    if (s.id === 'calor') hint += n < MISION.calorNecesario ? ` — necesitas nivel ${MISION.calorNecesario}` : '';
    const pips = Array.from({ length: s.max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    return `<div class="sis">
      <div class="sis-icono">${s.icono}</div>
      <div class="sis-info"><b>${s.nombre}</b> <small>${s.desc} · ${s.costo} kWh/nivel</small>
        <div class="pips">${pips}</div><small class="hint ${n < (s.id === 'calor' ? MISION.calorNecesario : s.id === 'vital' ? 2 : 1) ? 'malo' : ''}">${hint}</small></div>
      <div class="sis-ctrl">
        <button data-sis="${s.id}" data-d="-1" ${n <= 0 ? 'disabled' : ''} aria-label="Bajar">−</button>
        <button data-sis="${s.id}" data-d="1" ${n >= s.max ? 'disabled' : ''} aria-label="Subir">+</button>
      </div></div>`;
  }).join('');

  // Acciones
  $('#acciones').innerHTML = ACCIONES.filter(a => a.visible()).map(a =>
    `<button class="accion ${a.id === 'blindaje' && S.construir ? 'activa' : ''}" data-accion="${a.id}" ${a.activo() ? '' : 'disabled'}>
      <span>${a.texto()}</span><small>${a.detalle()}</small></button>`).join('')
    + `<div class="inventario">🧰 Repuestos: <b>${S.repuestos}</b> · 💊 Botiquín: <b>${S.botiquin}</b> · Paneles: <b>${Math.round(S.eficiencia * 100)}%</b></div>`;

  // Etiquetas sobre la escena
  const tags = [];
  if (enTormenta()) tags.push('🌪️ Tormenta de polvo');
  if (enConjuncion()) tags.push('🌞 Conjunción solar: sin contacto');
  if (!S.paneles) tags.push('🔽 Paneles retraídos');
  if (S.blindaje >= 3) tags.push('🧱 Blindaje listo');
  else if (S.construir) tags.push(`🧱 Construyendo ${S.blindaje}/3`);
  $('#escenaTags').innerHTML = tags.map(t => `<span>${t}</span>`).join('');
}

// ---------------------------------------------------------------------
//  MODALES
// ---------------------------------------------------------------------
function abrirModal(html, clase = '') {
  $('#modalCaja').className = 'modal-caja ' + clase;
  $('#modalCaja').innerHTML = html;
  $('#modal').classList.remove('oculto');
}
const cerrarModal = () => $('#modal').classList.add('oculto');

function mostrarEvento(ev, fin) {
  ev.inicio && ev.inicio();
  render();
  beep(ev.tiempo ? 520 : 880, 0.25, 'triangle');
  const tiempo = ev.tiempo || 0;
  const ops = ev.opciones.map((o, i) => {
    const ok = !o.disponible || o.disponible();
    const det = typeof o.detalle === 'function' ? o.detalle() : (o.detalle || '');
    return `<button class="opcion" data-op="${i}" ${ok ? '' : 'disabled'}><span>${o.texto}</span>${det ? `<small>${ok ? det : 'No disponible'}</small>` : ''}</button>`;
  }).join('');

  abrirModal(`
    <div class="evento">
      <div class="ev-cabeza">
        <div class="ev-icono">${ev.icono}</div>
        <h2>${ev.titulo}</h2>
        ${tiempo ? `<div class="reloj" id="reloj"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle id="relojArco" cx="20" cy="20" r="17"/></svg><b id="relojNum">${tiempo}</b></div>` : ''}
      </div>
      <p>${ev.texto()}</p>
      <div class="opciones">${ops}</div>
      ${ev.consejo ? `<button class="btn-ayuda" id="btnAyuda">📞 Pedir ayuda a Control de Misión</button><div id="ayuda" class="ayuda"></div>` : ''}
      <div id="resultado"></div>
    </div>`, tiempo ? 'urgente' : '');

  let restante = tiempo, terminado = false;
  const terminar = texto => {
    if (terminado) return; terminado = true;
    clearInterval(cuenta);
    $('#modalCaja').classList.remove('urgente');
    document.querySelectorAll('.opcion, #btnAyuda').forEach(b => b.disabled = true);
    $('#resultado').innerHTML = `<div class="res">${texto}</div><button class="btn-grande" id="btnSeguir">Continuar ▶</button>`;
    $('#btnSeguir').onclick = () => { cerrarModal(); fin(texto); };
    $('#btnSeguir').focus();
  };

  document.querySelectorAll('.opcion').forEach(b => b.onclick = () => {
    beep(990, 0.08);
    terminar(ev.opciones[+b.dataset.op].efecto());
  });

  const ayudaBtn = $('#btnAyuda');
  if (ayudaBtn) ayudaBtn.onclick = () => {
    ayudaBtn.disabled = true;
    aprender('retraso');
    let txt;
    if (enConjuncion()) txt = '🌞 El Sol está entre Marte y la Tierra: la señal no puede pasar. ¡Decide tú!';
    else if (S.niveles.radio === 0) txt = '📡 Tus comunicaciones están apagadas. Nadie puede escucharte.';
    else {
      txt = `📨 Mensaje enviado… pero tarda <b>${MISION.delayMin} minutos</b> en llegar a la Tierra y otros ${MISION.delayMin} en volver. ¡La emergencia es <b>ahora</b>! Tendrás que decidir tú. (La respuesta llegará mañana a la bitácora.)`;
      S.pendientes.push({ sol: S.sol + 1, desde: S.sol, texto: ev.consejo });
    }
    $('#ayuda').innerHTML = txt;
  };

  if (tiempo) {
    const arco = $('#relojArco'), L = 2 * Math.PI * 17;
    arco.style.strokeDasharray = L;
    cuenta = setInterval(() => {
      restante--;
      $('#relojNum').textContent = restante;
      arco.style.strokeDashoffset = L * (1 - restante / tiempo);
      beep(restante <= 3 ? 880 : 660, 0.06);
      if (restante <= 3) $('#reloj').classList.add('rojo');
      if (restante <= 0) {
        const r = ev.alAgotarse ? ev.alAgotarse() : ev.opciones[ev.opciones.length - 1].efecto();
        beep(200, 0.4, 'sawtooth');
        terminar('⏰ <b>¡Se acabó el tiempo!</b> ' + r);
      }
    }, 1000);
  }
}

function mostrarResumen(antes, lineas, dato) {
  const deltas = RECURSOS.map(r => {
    const d = r1(S[r.id] - antes[r.id]);
    const bueno = r.inverso ? d <= 0 : d >= 0;
    const flecha = d === 0 ? '＝' : d > 0 ? '▲' : '▼';
    return `<div class="delta ${d === 0 ? '' : bueno ? 'bien' : 'mal'}"><span>${r.icono} ${r.nombre}</span><b>${flecha} ${d > 0 ? '+' : ''}${d}</b></div>`;
  }).join('');
  const derrota = motivoDerrota();
  abrirModal(`
    <h2>📋 Resumen del Sol ${S.sol}</h2>
    <div class="deltas">${deltas}</div>
    ${lineas.length ? `<ul class="lineas">${lineas.map(l => `<li>${l}</li>`).join('')}</ul>` : '<p class="tranqui">Un sol tranquilo en la base. ¡Todo funcionó!</p>'}
    ${dato ? `<div class="dato">💡 <b>¿Sabías que…?</b> ${DATOS[dato]}</div>` : ''}
    <button class="btn-grande" id="btnSig">${derrota ? 'Ver qué pasó…' : S.sol >= MISION.maxSol ? '¡Llegó la nave de relevo! 🚀' : 'Siguiente sol ▶'}</button>`);
  $('#btnSig').onclick = () => {
    cerrarModal();
    if (derrota) return pantallaFinal(false, derrota);
    if (S.sol >= MISION.maxSol) return pantallaFinal(true);
    S.sol++;
    iniciarSol();
  };
}

function pantallaFinal(gano, motivo) {
  let estrellas = 0;
  if (gano) {
    estrellas = 1;
    if (S.salud >= 70 && S.moral >= 50) estrellas++;
    if (S.rad < MISION.radLimite * 0.5) estrellas++;
  }
  const aprendidos = S.aprendidos.map(k => `<li>${DATOS[k]}</li>`).join('');
  abrirModal(`
    <div class="final">
      <div class="ev-icono grande">${gano ? '🚀' : motivo.icono}</div>
      <h1>${gano ? '¡Misión cumplida!' : '¡Misión abortada!'}</h1>
      <p>${gano
        ? `Comandante <b>${escapar(S.nombre)}</b>: tu tripulación sobrevivió ${MISION.maxSol} sols en Marte y la nave de relevo los recogió.`
        : `${motivo.texto} La tripulación tuvo que volver a la Tierra en el Sol ${S.sol}. ¡Cada misión enseña algo para la próxima!`}</p>
      ${gano ? `<div class="estrellas">${'⭐'.repeat(estrellas)}${'☆'.repeat(3 - estrellas)}</div>
        <small class="criterios">⭐ Sobrevivir · ⭐ Salud ≥ 70 y ánimo ≥ 50 · ⭐ Radiación menor a ${MISION.radLimite / 2} mSv</small>` : ''}
      <div class="final-stats">❤️ ${S.salud} · 😊 ${S.moral} · ☢️ ${S.rad} mSv · 🔋 ${r1(S.bateria)} kWh</div>
      <h3>🧠 Lo que aprendiste (${S.aprendidos.length})</h3>
      <ul class="aprendidos">${aprendidos}</ul>
      <button class="btn-grande" id="btnOtra">Jugar otra vez 🔄</button>
    </div>`, 'ancho');
  beep(gano ? 1046 : 220, 0.5, 'triangle');
  $('#btnOtra').onclick = pantallaInicio;
}

const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------
//  Pantalla de inicio
// ---------------------------------------------------------------------
function climaHTML() {
  const fuente = CLIMA.real ? '🛰️ <b>Datos reales de hoy</b> — NASA DONKI' : '📚 Datos históricos de la NASA';
  return `<div class="clima-tit">☀️ Clima espacial</div><div>${CLIMA.resumen}</div><small>${fuente}. ¡La actividad real del Sol cambia qué tan arriesgada es tu misión!</small>`;
}

function pantallaInicio() {
  abrirModal(`
    <div class="intro">
      <div class="ev-icono grande">🔴</div>
      <h1>Survival Mars</h1>
      <p class="sub">Entrenador de Misiones para Astronautas Junior</p>
      <p>Eres comandante de la primera base en <b>Marte</b>. Tu meta: mantener a tu tripulación a salvo durante
        <b>${MISION.maxSol} sols</b> hasta que llegue la nave de relevo.</p>
      <label class="nombre">¿Cómo te llamas, comandante?
        <input id="inNombre" maxlength="16" placeholder="Tu nombre" autocomplete="off"></label>
      <ol class="como">
        <li>⚡ Reparte la <b>energía</b> entre los sistemas: no alcanza para todo.</li>
        <li>▶ Pulsa <b>Terminar el Sol</b> y mira las consecuencias.</li>
        <li>⏱️ En una <b>emergencia</b> tienes 10 segundos para decidir. ¡La Tierra está a ${MISION.delayMin} minutos de distancia!</li>
      </ol>
      <div class="clima-box" id="climaIntro">${climaHTML()}</div>
      <button class="btn-grande" id="btnEmpezar">¡Comenzar misión! 🚀</button>
    </div>`, 'ancho');
  $('#btnEmpezar').onclick = () => {
    beep(880, 0.1);
    nuevaPartida($('#inNombre').value.trim());
    cerrarModal();
    log(`🚀 Comandante <b>${escapar(S.nombre)}</b> al mando de la Base Marciana. ¡Buena suerte!`, 'tierra');
    iniciarSol();
  };
}

// ---------------------------------------------------------------------
//  Arranque
// ---------------------------------------------------------------------
document.addEventListener('click', e => {
  const sis = e.target.closest('[data-sis]');
  if (sis && S) return cambiarNivel(sis.dataset.sis, +sis.dataset.d);
  const ac = e.target.closest('[data-accion]');
  if (ac && S) { ACCIONES.find(a => a.id === ac.dataset.accion).hacer(); beep(700, 0.05); render(); }
});
$('#btnAvanzar').onclick = () => S && avanzar();
$('#btnSonido').onclick = () => { sonido = !sonido; $('#btnSonido').textContent = sonido ? '🔊' : '🔇'; };

Escena.init($('#escena'), () => S && {
  polvo: enTormenta(), conjuncion: enConjuncion(), paneles: S.paneles, eficiencia: S.eficiencia,
  niveles: S.niveles, blindaje: S.blindaje, invSalud: S.invSalud, energia: S.energiaOk,
  eva: S.eva, refugio: S.refugio,
});

nuevaPartida('');
render();
pantallaInicio();

cargarClimaEspacial().then(c => {
  CLIMA = c;
  $('#climaBadge').innerHTML = `${c.real ? '🛰️' : '📚'} ${c.resumen}`;
  const box = $('#climaIntro'); if (box) box.innerHTML = climaHTML();
});
