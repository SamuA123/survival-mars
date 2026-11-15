// Pruebas de las mecánicas nuevas: construcción por secciones, dosis por astronauta y mochila/depósito.
// Solo simulación (src/sim) y datos (src/data): sin DOM ni Three.js.
// Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crearPartida, construirSeccion, motivoNoConstruir, factorBlindaje, seccionesHechas,
  radiacionInterior, simularSol, iniciarEVA, terminarEVA, dosisLlamarada, EVENTOS,
} from '../src/sim/motor.js';
import { MISION } from '../src/sim/config.js';
import { RADIACION } from '../src/data/radiacion.js';

const SECC = MISION.construccion.secciones;
const COSTOS = { norte: 3, sur: 3, lados: 4, techo: 4 };
const cerca = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const sinItems = { hielo: 0, roca: 0, regolito: 0, pieza: 0 };
const caminata = (extra = {}) => ({ items: { ...sinItems }, rad: 0, rescate: false, limpio: false, segundos: 60, ...extra });

// ---------------------------------------------------------------- 1) Construcción
test('Construcción: las secciones cuestan 3/3/4/4 bolsas de regolito', () => {
  for (const [id, costo] of Object.entries(COSTOS)) assert.equal(SECC[id].costo, costo, id);
});

test('Construcción: cada sección descuenta exactamente su costo', () => {
  const S = crearPartida('Test');
  S.regolito = 20;
  let quedan = 20;
  for (const [id, costo] of Object.entries(COSTOS)) {
    const r = construirSeccion(S, id);
    assert.equal(r.ok, true, id);
    quedan -= costo;
    assert.equal(S.regolito, quedan, `regolito tras ${id}`);
    assert.equal(S.secciones[id], true);
  }
  assert.equal(S.regolito, 20 - 14);
  assert.equal(seccionesHechas(S), 4);
});

test('Construcción: sin bolsas suficientes no se construye ni se gasta nada', () => {
  const S = crearPartida('Test');
  S.regolito = 2;
  assert.equal(motivoNoConstruir(S, 'norte'), 'faltaRegolito');
  const r = construirSeccion(S, 'norte');
  assert.deepEqual(r, { ok: false, motivo: 'faltaRegolito' });
  assert.equal(S.regolito, 2);
  assert.equal(S.secciones.norte, false);
  S.regolito = 3;                                   // justo 3 alcanza para norte, no para techo (4)
  assert.equal(construirSeccion(S, 'techo').ok, false);
  assert.equal(construirSeccion(S, 'norte').ok, true);
  assert.equal(S.regolito, 0);
});

test('Construcción: no se puede construir dos veces la misma sección', () => {
  const S = crearPartida('Test');
  S.regolito = 10;
  assert.equal(construirSeccion(S, 'sur').ok, true);
  const r = construirSeccion(S, 'sur');
  assert.deepEqual(r, { ok: false, motivo: 'construida' });
  assert.equal(S.regolito, 7);                      // el segundo intento no cobra
});

test('Construcción: una sección que no existe se rechaza', () => {
  const S = crearPartida('Test');
  S.regolito = 10;
  assert.deepEqual(construirSeccion(S, 'sotano'), { ok: false, motivo: 'noExiste' });
  assert.equal(S.regolito, 10);
});

test('Construcción: con las 4 secciones entra el 40 % (= RADIACION.atenuacionBlindaje)', () => {
  const S = crearPartida('Test');
  assert.equal(factorBlindaje(S), 1);
  S.regolito = 14;
  const factores = [];
  for (const id of Object.keys(COSTOS)) { construirSeccion(S, id); factores.push(factorBlindaje(S)); }
  for (let i = 1; i < factores.length; i++) assert.ok(factores[i] < factores[i - 1], 'cada sección baja el factor');
  assert.ok(cerca(factorBlindaje(S), RADIACION.atenuacionBlindaje), `factor ${factorBlindaje(S)}`);
  assert.equal(S.blindaje, 3);
});

test('Construcción: la dosis diaria dentro baja en consecuencia', () => {
  const S = crearPartida('Test');
  const sinBlindaje = radiacionInterior(S).diaria;
  assert.ok(cerca(sinBlindaje, Math.round(MISION.radDiaria * 100) / 100, 0.011));
  S.regolito = 14;
  const r = construirSeccion(S, 'norte');
  assert.ok(r.despues.diaria < r.antes.diaria, 'norte baja la dosis diaria');
  for (const id of ['sur', 'lados', 'techo']) construirSeccion(S, id);
  assert.ok(cerca(radiacionInterior(S).diaria, MISION.radDiaria * RADIACION.atenuacionBlindaje, 0.011));

  // Y en un sol real: la tripulación protegida recibe el 40 % del fondo
  const A = crearPartida('A'), B = crearPartida('B');
  B.regolito = 14; for (const id of Object.keys(COSTOS)) construirSeccion(B, id);
  simularSol(A); simularSol(B);
  const dA = A.tripulacion[0].dosis, dB = B.tripulacion[0].dosis;
  assert.ok(dA > 0 && dB > 0);
  assert.ok(cerca(dB / dA, RADIACION.atenuacionBlindaje, 0.05), `proporción ${dB / dA}`);
});

// ---------------------------------------------------------------- 2) Dosis por astronauta
test('Dosis: tras la caminata solo suma dosis quien salió (S.evaAstronauta)', () => {
  const S = crearPartida('Test');
  assert.ok(S.tripulacion.length >= 2);
  const quien = S.tripulacion[1].id;
  S.evaAstronauta = quien;
  const antes = Object.fromEntries(S.tripulacion.map(a => [a.id, a.dosis]));
  iniciarEVA(S);
  terminarEVA(S, caminata({ rad: 1.25 }));
  for (const a of S.tripulacion) {
    if (a.id === quien) assert.ok(cerca(a.dosis, antes[a.id] + 1.25, 0.01), `${a.id} sumó la caminata`);
    else assert.equal(a.dosis, antes[a.id], `${a.id} no salió y no debe sumar`);
  }
});

test('Dosis: S.rad sigue siendo la dosis individual más alta', () => {
  const S = crearPartida('Test');
  S.tripulacion[0].dosis = 2;                       // alguien ya tenía dosis previa
  S.evaAstronauta = S.tripulacion[2].id;
  terminarEVA(S, caminata({ rad: 0.5 }));
  assert.equal(S.rad, 2, 'la caminata chica no supera al de más dosis');
  S.evaHecha = false; S.evaAstronauta = S.tripulacion[2].id;
  terminarEVA(S, caminata({ rad: 3 }));
  const max = Math.max(...S.tripulacion.map(a => a.dosis));
  assert.ok(cerca(S.rad, max, 0.05), `S.rad ${S.rad} vs máx ${max}`);
  assert.ok(cerca(S.tripulacion[2].dosis, 3.5, 0.01));
});

test('Dosis: el rescate también irradia solo a quien salió', () => {
  const S = crearPartida('Test');
  const quien = S.tripulacion[0].id;
  S.evaAstronauta = quien;
  terminarEVA(S, caminata({ rad: 0.8, rescate: true }));
  for (const a of S.tripulacion) assert.equal(a.dosis, a.id === quien ? 0.8 : 0, a.id);
});

// ---------------------------------------------------------------- 3) Mochila y depósito
test('Mochila: el regolito traído se suma a S.regolito y al inventario', () => {
  const S = crearPartida('Test');
  S.regolito = 2;
  S.evaAstronauta = S.tripulacion[0].id;
  terminarEVA(S, caminata({ items: { ...sinItems, regolito: 3, roca: 1 }, rad: 0.2 }));
  assert.equal(S.regolito, 5);
  assert.equal(S.inventario.hoy.regolito, 3);
  assert.equal(S.inventario.total.regolito, 3);
  assert.equal(S.inventario.hoy.roca, 1);
});

test('Mochila: lo depositado alcanza para construir (caminata → construcción)', () => {
  const S = crearPartida('Test');
  S.evaAstronauta = S.tripulacion[0].id;
  terminarEVA(S, caminata({ items: { ...sinItems, regolito: 4 } }));
  assert.equal(construirSeccion(S, 'techo').ok, true);
  assert.equal(S.regolito, 0);
});

test('Mochila: un rescate no deposita nada', () => {
  const S = crearPartida('Test');
  S.regolito = 1;
  const antes = { o2: S.o2, ciencia: S.ciencia, repuestos: S.repuestos, inv: JSON.stringify(S.inventario) };
  S.evaAstronauta = S.tripulacion[0].id;
  terminarEVA(S, caminata({ items: { regolito: 4, roca: 2, hielo: 1, pieza: 1 }, rad: 0.5, rescate: true }));
  assert.equal(S.regolito, 1);
  assert.equal(S.ciencia, antes.ciencia);
  assert.equal(S.o2, antes.o2);
  assert.equal(S.repuestos, antes.repuestos);
  assert.equal(JSON.stringify(S.inventario), antes.inv);
});

// ---------------------------------------------------------------- 4) Cada sección tiene su razón
test('Secciones: con las 4 entra el 40 % tanto en el fondo diario como en las llamaradas', () => {
  const suma = campo => Object.values(SECC).reduce((a, s) => a + s[campo], 0);
  assert.ok(cerca(1 - suma('proteccion'), RADIACION.atenuacionBlindaje), 'fondo');
  assert.ok(cerca(1 - suma('proteccionLlamarada'), RADIACION.atenuacionBlindaje), 'llamaradas');
  const S = crearPartida('Test');
  S.regolito = 14; for (const id of Object.keys(COSTOS)) construirSeccion(S, id);
  assert.ok(cerca(factorBlindaje(S, 'llamarada'), RADIACION.atenuacionBlindaje));
});

test('Secciones: techo vs. paredes (mismo costo) gana uno u otro según haya llamarada', () => {
  assert.equal(SECC.techo.costo, SECC.lados.costo);
  const conTecho = crearPartida('Techo'), conParedes = crearPartida('Paredes');
  conTecho.regolito = 4; conParedes.regolito = 4;
  assert.equal(construirSeccion(conTecho, 'techo').ok, true);
  assert.equal(construirSeccion(conParedes, 'lados').ok, true);

  // Sol tranquilo (sin llamarada): las paredes frenan más la radiación de fondo
  simularSol(conTecho); simularSol(conParedes);
  const fondoTecho = conTecho.tripulacion[0].dosis, fondoParedes = conParedes.tripulacion[0].dosis;
  assert.ok(fondoParedes < fondoTecho, `fondo: paredes ${fondoParedes} < techo ${fondoTecho}`);

  // Llamarada sin refugio: el techo frena mucho más (las partículas llegan desde arriba)
  for (const S of [conTecho, conParedes]) { S.llamarada = { clase: 'X1.0' }; EVENTOS.llamarada.alAgotarse(S); }
  const llamTecho = conTecho.tripulacion[0].dosis - fondoTecho, llamParedes = conParedes.tripulacion[0].dosis - fondoParedes;
  assert.ok(llamTecho < llamParedes, `llamarada: techo ${llamTecho} < paredes ${llamParedes}`);
  assert.equal(dosisLlamarada(conTecho, 'X1.0') < dosisLlamarada(conParedes, 'X1.0'), true);
  assert.ok(radiacionInterior(conTecho).llamarada < radiacionInterior(conParedes).llamarada);
  assert.ok(radiacionInterior(conParedes).diaria < radiacionInterior(conTecho).diaria);
});

test('Secciones: la pared barata ya no es siempre la mejor primera opción', () => {
  const pared = crearPartida('P'), techo = crearPartida('T');
  pared.regolito = 4; techo.regolito = 4;
  construirSeccion(pared, 'norte'); construirSeccion(techo, 'techo');
  // la pared de 3 bolsas protege más del fondo; el techo de 4, de las llamaradas
  assert.ok(radiacionInterior(pared).diaria < radiacionInterior(techo).diaria);
  assert.ok(radiacionInterior(techo).llamarada < radiacionInterior(pared).llamarada);
});

// ---------------------------------------------------------------- Colisiones (mundo 3D, sin Three.js)
test('Colisiones: el personaje no atraviesa círculos ni rectángulos y resbala por el borde', async () => {
  const { empujarFuera, libre } = await import('../src/world3d/colisiones.js');
  const habitat = { x: 0, z: 0, r: 4.6 }, lab = { x: -3, z: -9, hx: 3.6, hz: 1.9 };
  const p = { x: 1, z: 1 };
  assert.equal(empujarFuera(p, 0.6, [habitat]), true);
  assert.ok(Math.hypot(p.x, p.z) >= 4.6 + 0.6 - 1e-9, 'queda fuera de la cúpula');
  const q = { x: -3, z: -8.5 };   // dentro del laboratorio
  empujarFuera(q, 0.6, [lab]);
  assert.ok(q.z >= -9 + 1.9 + 0.6 - 1e-9 || q.z <= -9 - 1.9 - 0.6 + 1e-9 || Math.abs(q.x + 3) >= 3.6 + 0.6 - 1e-9, 'sale del rectángulo');
  // Caminar en diagonal contra una pared: se conserva el avance a lo largo del borde
  const r = { x: 0.5, z: -6.5 };
  empujarFuera(r, 0.6, [lab]);
  assert.ok(Math.abs(r.x - 0.5) < 1e-9, 'resbala sin perder el avance lateral');
  assert.equal(libre(20, 20, 0.6, [habitat, lab]), true);
  assert.equal(libre(0, 3, 0.6, [habitat]), false);
});

test('Rutas de los compañeros: ningún tramo atraviesa un edificio (ni en las esquinas entre edificios)', async () => {
  const { crearRed, buscarRuta, libre, empujarFuera } = await import('../src/world3d/colisiones.js');
  const c = (x, z, r) => ({ x, z, r }), b = (x, z, hx, hz) => ({ x, z, hx, hz });
  // Las mismas formas que src/world3d/mundo.js (_initColisiones) + el rover estacionado
  const obst = [c(0, 0, 4.6), b(0, 4.4, 0.85, 0.75), b(5.6, 0.5, 1.7, 0.95), c(10, 1, 3.9), b(-3, -9, 3.6, 1.9), b(6, -8, 2.1, 1.3),
    c(-13, 15, 0.6), c(17, -14, 2.6), ...[-4.2, 0, 4.2].flatMap(dx => [-2.3, 2.3].map(dz => c(-13 + dx, 4 + dz, 1.7))), c(8, 10, 1.9)];
  const puntos = [[0, 6], [10, 5.5], [-3, -6.2], [-13, 0], [6, -5.8], [-11, 13], [8, 7.6]].map(([x, z]) => { const p = { x, z }; empujarFuera(p, 0.7, obst); return p; });
  const red = crearRed(obst, 0.55, puntos);
  const tramoLibre = (a, q) => { for (let t = 0; t <= 1; t += 0.02) if (!libre(a.x + (q.x - a.x) * t, a.z + (q.z - a.z) * t, 0.5, obst)) return false; return true; };
  // Incluye el caso de la captura: rodear la unión cúpula-túnel-invernadero
  const casos = [...puntos.flatMap(p => puntos.filter(q => q !== p).map(q => [p, q])), [{ x: 7, z: -3 }, { x: 4, z: 6 }]];
  for (const [desde, hasta] of casos) {
    const ruta = buscarRuta(red, desde, hasta);
    let previo = desde;
    for (const p of ruta) { assert.ok(tramoLibre(previo, p), `tramo bloqueado de (${previo.x.toFixed(1)},${previo.z.toFixed(1)}) a (${p.x.toFixed(1)},${p.z.toFixed(1)})`); previo = p; }
    assert.ok(Math.hypot(previo.x - hasta.x, previo.z - hasta.z) < 1e-6, 'llega a la meta');
  }
});
