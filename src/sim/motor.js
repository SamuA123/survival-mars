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
export const CLIMA = { real: false, tranquilo: false, origen: 'cargando', consultadoEn: null, flares: LLAMARADAS_RESPALDO, riesgo: 1, resumen: 'cargando…' };
export function setClima(c) { Object.assign(CLIMA, c); }

// ---------------------------------------------------------------------
export function crearPartida(nombre = 'Comandante') {
  return {
    nombre, sol: 1, fase: 'planear',
    bateria: MISION.bateriaInicial, o2: 100, comida: MISION.comidaInicial, salud: 100, rad: 0, ciencia: 0,
    niveles: { vital: 2, invernadero: 2, radio: 1, lab: 0 },
    paneles: true, eficiencia: 1, invSalud: 1,
    repuestos: MISION.repuestos, botiquin: MISION.botiquin,
    blindaje: 0, construir: false,
    tripulacion: MISION.tripulacion.map(t => ({ ...t, dosis: 0 })), evaAstronauta: null,
    secciones: Object.fromEntries(Object.keys(MISION.construccion.secciones).map(id => [id, false])),
    polvoSols: 0, eva: false, expedicion: false, refugio: false, ocupados: false,
    evaHecha: false, enEVA: false, regolito: 0,
    inventario: { hoy: { regolito: 0, roca: 0, hielo: 0 }, total: { regolito: 0, roca: 0, hielo: 0 } },
    plan: null, planesCumplidos: 0, planesEnviados: 0,
    energiaOk: true, pendientes: [], mensajes: [], aprendidos: [], ultimoEvento: null,
    llamarada: null, evento: null, historial: [], log: [],
    ...sortearGuion(),
  };
}

// ---------------------------------------------------------------------
//  GUION SORTEADO: las emergencias grandes cambian de día en cada partida.
//  - Tormenta de polvo de 3 sols, avisada 2 sols y 1 sol antes, siempre antes de la conjunción.
//  - Remolino que limpia los paneles al terminar la tormenta.
//  - Una llamarada al principio y (en misiones largas) otra después de la conjunción.
//  - Falla del reciclador en un día libre.
//  El modo demo (MISION.guionFijo) mantiene su guion para que el video sea siempre igual.
// ---------------------------------------------------------------------
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export function sortearGuion() {
  if (MISION.guionFijo) return { guion: { ...MISION.guion }, avisos: MISION.avisos, diasTormenta: [] };
  const max = MISION.maxSol, conj = MISION.conjuncion;
  const finLibre = conj.length ? conj[0] - 1 : max - 2;            // la tormenta termina antes de la conjunción
  const t = entre(4, Math.max(4, finLibre - 2));                    // inicio: avisos en t-2 (>= sol 2) y t-1
  const guion = { [t]: 'tormenta' };
  if (t + 3 < max) guion[t + 3] = 'remolino';
  const libres = (a, b) => { const d = []; for (let s = a; s <= b; s++) if (!guion[s] && s >= 2 && s < max) d.push(s); return d; };
  const azar = lista => lista[Math.floor(Math.random() * lista.length)];
  const l1 = azar(libres(2, Math.min(3, t - 1))); if (l1) guion[l1] = 'llamarada';
  if (max >= 12) { const l2 = azar(libres((conj.at(-1) ?? t + 3) + 1, max - 1)); if (l2) guion[l2] = 'llamarada'; }
  const rec = azar(libres(3, max - 1)); if (rec) guion[rec] = 'reciclador';

  // Avisos: los fijos (bienvenida, conjunción, relevo) se quedan; los de la tormenta se mueven a su día.
  const deTormenta = new Set(MISION.avisosTormenta || []);
  const avisos = {};
  for (const [sol, lista] of Object.entries(MISION.avisos)) {
    const quedan = lista.filter(a => !deTormenta.has(a));
    if (quedan.length) avisos[sol] = quedan;
  }
  const [aviso2, aviso1] = MISION.avisosTormenta || [];
  if (aviso2) (avisos[t - 2] ||= []).push(aviso2);
  if (aviso1) (avisos[t - 1] ||= []).push(aviso1);
  return { guion, avisos, diasTormenta: [t, t + 1, t + 2] };
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

// Shared by the preview and the actual simulation. Future events are not predicted.
export function preverSol(S) {
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
  const trabajan = !S.refugio && !S.ocupados;
  return {
    niv, construir, apagados,
    bateria: r1(clamp(S.bateria + gen - consumo(S, niv, construir), 0, MISION.bateriaMax)),
    oxigeno: clamp(Math.round(S.o2 + [-20, -8, 0, 4][niv.vital]), 0, 100) - S.o2,
    cosecha: r1(MISION.cosecha[niv.invernadero] * S.invSalud * (trabajan ? 1 : 0.5)),
    comida: clamp(Math.round(S.comida + MISION.cosecha[niv.invernadero] * S.invSalud * (trabajan ? 1 : 0.5) - MISION.consumoComida), 0, 100) - S.comida,
    ciencia: trabajan ? [0, 4, 8][niv.lab] : 0,
  };
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
    hacer(S) { S.eva = true; dosisA(S, menorDosis(S)?.id, 1.5); S.eficiencia = Math.min(1, S.eficiencia + 0.3); aprender(S, 'eva'); log(S, '🧑‍🚀 Una astronauta salió a limpiar los paneles (+1,5 mSv).'); },
  },
  // El blindaje ahora se construye por secciones en el modo construcción (src/ui/construccion.js, tecla B).
  // Esta acción queda oculta para no tener dos formas distintas de construir.
  blindaje: {
    edificio: 'habitat',
    texto: S => `🧱 Construir blindaje de regolito (${S.blindaje}/3)`,
    detalle: () => '',
    visible: () => false, activo: () => true,
    hacer() {},
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
//  TRIPULACIÓN CON DOSÍMETROS
//  Fondo diario y llamaradas: a TODOS. Caminata: solo a quien sale.
//  S.rad = la dosis más alta (el límite de la misión aplica por persona). Repartir las
//  caminatas mantiene a todos más seguros: es lo que hace la NASA de verdad.
// ---------------------------------------------------------------------
const recalcularRad = S => { if (S.tripulacion?.length) S.rad = r1(Math.max(...S.tripulacion.map(a => a.dosis))); };
export function dosisATodos(S, d) {
  if (!S.tripulacion?.length) { S.rad += d; return; }
  for (const a of S.tripulacion) a.dosis = Math.round((a.dosis + d) * 100) / 100;
  recalcularRad(S);
}
export function dosisA(S, id, d) {
  const a = S.tripulacion?.find(x => x.id === id) || menorDosis(S);
  if (!a) { S.rad += d; return; }
  a.dosis = Math.round((a.dosis + d) * 100) / 100;
  recalcularRad(S);
}
export const menorDosis = S => S.tripulacion?.reduce((m, a) => (!m || a.dosis < m.dosis ? a : m), null) || null;
export const astronauta = (S, id) => S.tripulacion?.find(a => a.id === id) || null;

// ---------------------------------------------------------------------
//  BLINDAJE POR SECCIONES (modo construcción, tecla B)
//  Cada sección gasta regolito de la base y reduce DE VERDAD la radiación interior
//  (dosis diaria y llamaradas). S.blindaje (0..3) se deriva para el resto del código.
// ---------------------------------------------------------------------
const SECCIONES = () => MISION.construccion.secciones;

// Parte de la radiación que entra al hábitat: 1 = sin blindaje, 0.4 = completo
export function factorBlindaje(S) {
  const p = Object.entries(SECCIONES()).reduce((a, [id, s]) => a + (S.secciones?.[id] ? s.proteccion : 0), 0);
  return r1(Math.max(0, 1 - p) * 100) / 100;
}
// Fracción de radiación que ENTRA al hábitat (0..1). La usa el panel de radiación de la caminata (eva-hud.js).
export const proteccionHabitat = S => factorBlindaje(S);
export const seccionesHechas = S => Object.keys(SECCIONES()).filter(id => S.secciones?.[id]).length;
const nivelBlindaje = S => Math.round(seccionesHechas(S) * 3 / Object.keys(SECCIONES()).length);

// Radiación interior de un sol tranquilo y de una llamarada de ejemplo (para mostrar el antes/después)
export function radiacionInterior(S, claseEjemplo = 'X1.0') {
  return { diaria: Math.round(MISION.radDiaria * factorBlindaje(S) * 100) / 100, llamarada: dosisLlamarada(S, claseEjemplo) };
}

// '' si se puede; si no, el motivo (código): 'construida' | 'faltaRegolito' | 'noExiste'
export function motivoNoConstruir(S, id) {
  const s = SECCIONES()[id];
  if (!s) return 'noExiste';
  if (S.secciones?.[id]) return 'construida';
  if ((S.regolito || 0) < s.costo) return 'faltaRegolito';
  return '';
}

export function construirSeccion(S, id) {
  const motivo = motivoNoConstruir(S, id);
  if (motivo) return { ok: false, motivo };
  const antes = radiacionInterior(S);
  S.regolito -= SECCIONES()[id].costo;
  S.secciones[id] = true;
  S.blindaje = nivelBlindaje(S);
  aprender(S, 'regolito');
  return { ok: true, antes, despues: radiacionInterior(S) };
}

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
  dosisA(S, S.evaAstronauta, r.rad);   // la caminata solo irradia a quien salió
  lineas.push(`⏱️ Estuviste afuera ${Math.round(r.segundos)} segundos y recibiste <b>${r1(r.rad)} mSv</b> de radiación.`);
  if (r.rescate) {
    S.salud = clamp(S.salud - MISION.eva.saludRescate, 0, 100);
    lineas.push(`🆘 ¡Se acabó el oxígeno del traje! Tus compañeros te rescataron, pero perdiste todo lo recolectado y la salud bajó (-${MISION.eva.saludRescate}).`);
    log(S, '🆘 Rescate en la caminata: se acabó el oxígeno del traje.', 'mal');
    return lineas;
  }
  const it = r.items;
  if (it.regolito) {
    // Se guarda en la base; el jugador decide qué sección construir (modo construcción, tecla B)
    S.regolito = (S.regolito || 0) + it.regolito;
    lineas.push(`🟫 <b>${it.regolito} de regolito</b> (la tierra roja y suelta de Marte) → guardado en la base: ${S.regolito} bolsas para construir el blindaje (tecla B).`); aprender(S, 'regolito');
  }
  if (it.roca) { S.ciencia += it.roca * V.roca; lineas.push(`🪨 <b>${it.roca} roca(s) marciana(s)</b> de basalto → el laboratorio las analiza: +${it.roca * V.roca} de ciencia.`); }
  if (it.hielo) { S.o2 = clamp(S.o2 + it.hielo * V.hielo, 0, 100); lineas.push(`🧊 <b>${it.hielo} bloque(s) de hielo de agua</b> → el agua se separa en hidrógeno y oxígeno: +${it.hielo * V.hielo} de oxígeno.`); aprender(S, 'hielo'); }
  if (it.pieza) { S.repuestos += it.pieza; lineas.push(`🔩 ${it.pieza} pieza(s) de una sonda vieja → +${it.pieza} repuesto(s).`); }
  if (r.limpio) { S.eficiencia = Math.min(1, S.eficiencia + 0.3); lineas.push('🧹 Limpiaste los paneles solares: +30% de eficiencia.'); }
  if (!it.hielo && !it.roca && !it.regolito && !it.pieza && !r.limpio) lineas.push('No recolectaste nada esta vez.');

  // Inventario: lo recolectado hoy y en toda la misión
  for (const k of TIPOS_RECOLECTABLES) {
    S.inventario.hoy[k] += it[k] || 0;
    S.inventario.total[k] += it[k] || 0;
  }
  const lp = revisarPlan(S);
  if (lp) lineas.push(lp);

  log(S, '🧑‍🚀 Caminata: ' + lineas.slice(1).map(l => l.split('→')[0]).join(' · ').replace(/<[^>]+>/g, ''));
  return lineas;
}

// ---------------------------------------------------------------------
//  INVENTARIO Y PLAN DEL SOL
//  El plan es un objetivo OPCIONAL: cumplirlo da bono, no cumplirlo no castiga.
//  Así la caminata sigue siendo una decisión (riesgo vs. recompensa).
// ---------------------------------------------------------------------
export const TIPOS_RECOLECTABLES = ['regolito', 'roca', 'hielo'];
const inventarioVacio = () => ({ regolito: 0, roca: 0, hielo: 0 });

// Elige qué pedir según lo que la base necesita (como un plan real de operaciones)
export function generarPlan(S) {
  S.plan = null;
  if (enTormenta(S)) return { estado: 'tormenta' };
  if (enConjuncion(S)) return { estado: 'conjuncion' };
  if (S.niveles.radio === 0) return { estado: 'sinRadio' };
  const pesos = {
    hielo: S.o2 < 70 ? 3 : 1,
    regolito: S.blindaje < 3 ? 2 : 0,
    roca: S.ciencia < MISION.metaCiencia ? 2 : 1,
  };
  let r = Math.random() * Object.values(pesos).reduce((a, b) => a + b, 0), tipo = 'roca';
  for (const [k, p] of Object.entries(pesos)) if ((r -= p) <= 0) { tipo = k; break; }
  const motivo = {
    hielo: S.o2 < 70 ? 'El oxígeno de la base está bajando.' : 'Siempre conviene tener reservas de agua.',
    regolito: 'Necesitamos más protección contra la radiación.',
    roca: 'Los científicos en la Tierra quieren estudiar más rocas de NE Syrtis.',
  }[tipo];
  S.plan = { tipo, cantidad: MISION.plan.cantidad[tipo], cumplido: false, motivo };
  return { estado: 'ok', plan: S.plan };
}

// Si ya se juntó lo pedido, da el bono (una sola vez)
export function revisarPlan(S) {
  const p = S.plan;
  if (!p || p.cumplido || S.inventario.hoy[p.tipo] < p.cantidad) return null;
  p.cumplido = true;
  const B = MISION.plan.bono;
  S.ciencia += B.ciencia;
  S.salud = clamp(S.salud + B.salud, 0, 100);
  S.planesCumplidos++;
  log(S, '✅ <b>¡Plan del sol cumplido!</b> Control de Misión felicita a la tripulación.', 'tierra');
  return `✅ <b>¡Plan del sol cumplido!</b> Bono: +${B.ciencia} de ciencia y +${B.salud} de salud (la tripulación está orgullosa).`;
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
  const escudo = factorBlindaje(S);   // cada sección construida protege desde ya
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
        ? `🛰️ Basada en una llamarada <b>real</b> que la NASA detectó el ${f.fecha} (consulta NASA DONKI).`
        : `📚 Basada en una llamarada histórica real del ${f.fecha} (archivo NASA DONKI).`;
      return `Ejercicio: llamarada clase <b>${f.clase}</b>. En este escenario simulado, una tormenta de partículas llega a Marte. ¿Proteges a la tripulación o sigues trabajando?<br><small class="real">${origen}</small>`;
    },
    consejo: 'Todos al refugio. La salud de la tripulación es primero; los experimentos pueden esperar.',
    inicio(S) { S.llamarada = elegirLlamarada(); },
    opciones: [
      { texto: '🛡️ ¡Todos al refugio!', detalle: 'Nadie trabaja hoy: sin ciencia y menos cosecha',
        efecto(S) { S.refugio = true; dosisATodos(S, 0.3); return 'La tripulación se protegió en el refugio. Hoy no hubo ciencia y se cosechó menos, pero todos están a salvo.'; } },
      { texto: '🔬 Seguir con los experimentos', detalle: '+10 ciencia… pero mucha radiación',
        efecto(S) { const d = dosisLlamarada(S, S.llamarada.clase); dosisATodos(S, d); S.ciencia += 10; return `Siguieron trabajando: +10 ciencia, pero recibieron <b>${d} mSv</b> extra de radiación.`; } },
    ],
    alAgotarse(S) { const d = dosisLlamarada(S, S.llamarada.clase); dosisATodos(S, d); return `Nadie dio la orden y la tripulación recibió <b>${d} mSv</b> de radiación.`; },
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
  const g = (S.guion || MISION.guion)[S.sol];
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
  const avisos = (S.avisos || MISION.avisos)[S.sol] || [];
  const llegan = S.pendientes.filter(p => p.sol <= S.sol);
  S.pendientes = S.pendientes.filter(p => p.sol > S.sol);
  if (enConjuncion(S)) {
    log(S, '🌞 <b>Conjunción solar:</b> el Sol está entre Marte y la Tierra. No hay comunicación. ¡Están solos!', 'aviso');
    aprender(S, 'conjuncion');
    const despues = MISION.conjuncion[MISION.conjuncion.length - 1] + 1;
    S.pendientes.push(...llegan.map(p => ({ ...p, sol: despues })));
  } else if (S.niveles.radio > 0) {
    S.mensajes.push(...avisos.map(texto => ({ sol: S.sol, texto, tipo: 'aviso' })), ...llegan.map(p => ({ sol: S.sol, texto: p.texto, tipo: 'respuesta' })));
    S.mensajes = S.mensajes.slice(-12);
    for (const a of avisos) log(S, `📡 <b>Control de Misión</b> <small>(enviado hace ${MISION.delayMin} min)</small>: ${a}`, 'tierra');
    for (const p of llegan) log(S, `📡 <b>Respuesta a tu pregunta del Sol ${p.desde}</b>: ${p.texto}`, 'tierra');
  } else if (avisos.length || llegan.length) {
    S.pendientes.push(...llegan.map(p => ({ ...p, sol: S.sol + 1 })));
    log(S, '📡 Había mensajes de la Tierra… pero las comunicaciones estaban <b>apagadas</b>. ¡No los recibiste!', 'mal');
  }
  if (S.sol === 1) aprender(S, 'sol');

  // Plan del sol (solo llega si hay comunicación)
  const g = generarPlan(S);
  if (g.estado === 'ok') {
    S.planesEnviados++;
    const O = MISION.eva.objetos[g.plan.tipo];
    log(S, `📋 <b>Plan del sol</b>: trae ${g.plan.cantidad} ${O.icono} ${O.nombre}. ${g.plan.motivo} <small>(opcional, da bono)</small>`, 'tierra');
  } else if (g.estado === 'sinRadio') {
    log(S, '📋 Control de Misión envió el plan del sol, pero las comunicaciones están apagadas.', 'mal');
  }
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
  const { niv, construir, apagados, bateria } = preverSol(S);
  S.bateria = bateria;
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
  const cosecha = MISION.cosecha[niv.invernadero] * S.invSalud * (trabajan ? 1 : 0.5);
  S.comida += cosecha - MISION.consumoComida;
  lineas.push(`🥔 Cosecha: ${r1(cosecha)} · consumo: ${MISION.consumoComida} · reservas: ${clamp(Math.round(S.comida), 0, 100)}.`);

  // 4) Ciencia
  if (niv.lab > 0) {
    const c = trabajan ? [0, 4, 8][niv.lab] : 0;
    S.ciencia += c;
    if (c) lineas.push(`🔬 El laboratorio hizo experimentos: +${c} ciencia.`);
    else lineas.push('🔬 Hoy nadie pudo trabajar en el laboratorio.');
  }

  // 5) Comunicaciones
  if (niv.radio >= 2 && !enConjuncion(S)) {
    const recuperacion = Math.min(2, 100 - S.salud);
    S.salud += recuperacion;
    if (recuperacion > 0) lineas.push(`📡 Videollamada con la Tierra: +${recuperacion} de salud.`);
  }

  // 6) Radiación de fondo (en Marte siempre hay un poco)
  dosisATodos(S, MISION.radDiaria * factorBlindaje(S));   // fondo diario: a toda la tripulación

  // 7) Polvo
  if (enTormenta(S) && S.paneles) {
    S.eficiencia = Math.max(0.2, S.eficiencia - 0.15);
    lineas.push('🌪️ El polvo rayó y cubrió los paneles: ahora generan menos.');
  }

  // 8) Blindaje: se construye por secciones en el modo construcción (construirSeccion), no aquí.

  // 9) Salud según recursos
  let sano = niv.vital >= 2;
  if (S.o2 < 25) { S.salud -= 10; sano = false; lineas.push('⚠️ ¡Queda poco oxígeno! La tripulación se siente mareada.'); }
  if (S.comida <= 0) { S.salud -= 10; sano = false; lineas.push('⚠️ ¡Se acabó la comida!'); }
  else if (S.comida <= MISION.comidaBaja) {
    S.salud -= MISION.penalizacionHambre; sano = false;
    lineas.push(`⚠️ Queda poca comida: la tripulación tiene hambre (-${MISION.penalizacionHambre} de salud). Aumenta la cosecha o ahorra reservas.`);
  }
  if (sano) S.salud += 2;

  for (const k of ['o2', 'comida', 'salud']) S[k] = clamp(Math.round(S[k]), 0, 100);
  S.rad = r1(S.rad);

  const habiaPolvo = S.polvoSols > 0;
  S.polvoSols = Math.max(0, S.polvoSols - 1);
  if (habiaPolvo && S.polvoSols === 0) lineas.push('🌤️ El polvo se asentó.' + (S.paneles ? '' : ' <b>¡Despliega los paneles!</b>'));
  // Recordar cómo fue el día ANTES de reiniciar las banderas (lo usa el hallazgo de salud)
  const encerrados = S.refugio || S.ocupados || habiaPolvo;
  S.solsSinSalir = S.evaHecha ? 0 : (S.solsSinSalir || 0) + 1;
  S.refugio = false; S.ocupados = false; S.eva = false; S.expedicion = false; S.evaHecha = false;

  // Dato educativo y hallazgo de salud real (OSDR)
  let dato = ev?.dato;
  if (!dato && apagados.length) dato = 'bateria';
  if (!dato || S.aprendidos.includes(dato)) {
    const nuevos = Object.keys(DATOS).filter(k => !S.aprendidos.includes(k));
    dato = nuevos.length ? nuevos[Math.floor(Math.random() * nuevos.length)] : dato;
  }
  aprender(S, dato);
  const tema = temaDeSalud(S, ev, encerrados);
  const hallazgo = tema ? elegirHallazgo(S, tema) : null;

  // Inventario del día para el resumen; luego se reinicia para el sol siguiente
  const recolectado = { ...S.inventario.hoy };
  const plan = S.plan ? { ...S.plan, logrado: S.inventario.hoy[S.plan.tipo] } : null;
  S.inventario.hoy = inventarioVacio();
  S.plan = null;

  S.historial.push({ sol: S.sol, ...foto(S) });
  lineas.forEach(l => log(S, l, l.includes('⚠️') || l.includes('Apagón') ? 'mal' : ''));
  return { lineas, dato, hallazgo, recolectado, plan };
}

// ---------------------------------------------------------------------
//  HALLAZGOS DE SALUD (OSDR): qué tema corresponde a lo que pasó hoy
//  Prioridad: llamarada > plaga > poca comida > poco oxígeno > encierro (ejercicio)
// ---------------------------------------------------------------------
function temaDeSalud(S, ev, encerrados) {
  if (ev?.dato === 'llamarada') return 'radiacion';
  if (S.ultimoEvento === 'plaga') return 'plaga';
  if (S.comida < 30) return 'comida';
  if (S.o2 < 50) return 'oxigeno';
  if (encerrados || S.solsSinSalir >= 3) return 'ejercicio';
  return null;
}

// Varía: primero los hallazgos del tema que aún no se mostraron; si ya se vieron todos, uno al azar.
// Nunca repite el mismo hallazgo antes de NO_REPETIR sols (si no hay otro, ese día no se muestra).
const NO_REPETIR = 4;
function elegirHallazgo(S, tema) {
  S.hallazgosVistos ||= [];
  S.hallazgoSol ||= {};
  const delTema = HALLAZGOS.filter(h => h.tema === tema && !(S.sol - (S.hallazgoSol[h.id] ?? -99) < NO_REPETIR));
  if (!delTema.length) return null;
  const nuevos = delTema.filter(h => !S.hallazgosVistos.includes(h.id));
  const pool = nuevos.length ? nuevos : delTema;
  const h = pool[Math.floor(Math.random() * pool.length)];
  if (!S.hallazgosVistos.includes(h.id)) S.hallazgosVistos.push(h.id);
  S.hallazgoSol[h.id] = S.sol;
  return h;
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
