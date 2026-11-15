// Run: node --test tests/guardado.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPartida, iniciarSol, simularSol, finDePartida, iniciarEVA, terminarEVA } from '../src/sim/motor.js';
import { guardarPartida, cargarPartida, borrarPartida, usarAlmacen } from '../src/sim/guardado.js';

// localStorage falso en memoria
function memoria() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}

function jugarSols(n) {
  const S = crearPartida('Ana');
  iniciarSol(S);
  for (let i = 0; i < n; i++) { simularSol(S, null, null); if (finDePartida(S)) break; S.sol++; iniciarSol(S); }
  return S;
}

test('Guardar y cargar devuelve exactamente la misma partida', () => {
  usarAlmacen(memoria());
  const S = jugarSols(4);
  S.evaAstronauta = S.tripulacion[1].id;
  iniciarEVA(S);
  terminarEVA(S, { items: { regolito: 3, roca: 1, hielo: 1 }, rad: 0.4, rescate: false, limpio: false, segundos: 40 });
  assert.equal(guardarPartida(S, 'comandante'), true);
  const g = cargarPartida();
  assert.equal(g.dificultad, 'comandante');
  assert.deepEqual(g.S, JSON.parse(JSON.stringify(S)));
  assert.equal(g.S.regolito, S.regolito);
  assert.equal(g.S.tripulacion[1].dosis, S.tripulacion[1].dosis);
});

test('Una partida cargada se puede seguir jugando hasta el final', () => {
  usarAlmacen(memoria());
  guardarPartida(jugarSols(3), 'cadete');
  const { S } = cargarPartida();
  let fin = null, vueltas = 0;
  while (!fin && vueltas++ < 40) { simularSol(S, null, null); fin = finDePartida(S); if (!fin) { S.sol++; iniciarSol(S); } }
  assert.ok(fin, 'la partida termina');
  for (const k of ['o2', 'comida', 'salud', 'bateria', 'rad', 'ciencia']) assert.ok(Number.isFinite(S[k]), k);
});

test('No se guarda en modo demo ni durante una caminata', () => {
  const mem = memoria(); usarAlmacen(mem);
  const S = jugarSols(1);
  S.demo = true;
  assert.equal(guardarPartida(S, 'cadete'), false);
  S.demo = false; S.enEVA = true;
  assert.equal(guardarPartida(S, 'cadete'), false);
  assert.equal(cargarPartida(), null);
});

test('Datos dañados o de otra versión se ignoran sin romper el juego', () => {
  const mem = memoria(); usarAlmacen(mem);
  mem.setItem('survivalMars.partida', '{esto no es json');
  assert.equal(cargarPartida(), null);
  mem.setItem('survivalMars.partida', JSON.stringify({ v: 999, S: crearPartida() }));
  assert.equal(cargarPartida(), null);
  mem.setItem('survivalMars.partida', JSON.stringify({ v: 1, S: { sol: 'x' } }));
  assert.equal(cargarPartida(), null);
});

test('Borrar elimina la partida guardada', () => {
  usarAlmacen(memoria());
  guardarPartida(jugarSols(2), 'cadete');
  assert.ok(cargarPartida());
  borrarPartida();
  assert.equal(cargarPartida(), null);
});

test('Sin almacenamiento disponible, guardar falla en silencio', () => {
  usarAlmacen({ getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } });
  assert.equal(guardarPartida(jugarSols(1), 'cadete'), false);
  assert.equal(cargarPartida(), null);
  assert.doesNotThrow(() => borrarPartida());
});
