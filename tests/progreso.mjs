// Pruebas de lo que mantiene el interés a mitad de partida: obras extra con regolito,
// inventos del laboratorio (la ciencia sirve después de la meta) y oportunidades en sols tranquilos.
// Run: node --test tests/progreso.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crearPartida, construirObra, motivoNoObra, construirSeccion, quedaPorConstruir, preverSol, simularSol, iniciarSol,
  inventosPorElegir, proximoInvento, pasoInvento, eventoInvento, elegirInvento, opcionesInvento, elegirEvento,
  terminarEVA, EVENTOS, consumo,
} from '../src/sim/motor.js';
import { MISION, INVENTOS } from '../src/sim/config.js';
// i18n.js toca el DOM al cargarse: un documento mínimo alcanza para traducir en Node
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document ??= { createElement: () => ({}), head: { appendChild() {} }, documentElement: {}, body: { classList: { toggle() {} } },
  querySelectorAll: () => [], querySelector: () => null, addEventListener() {} };
globalThis.MutationObserver ??= class { observe() {} };
const { tr, setIdioma } = await import('../src/ui/i18n.js');

const sinItems = { hielo: 0, roca: 0, regolito: 0, pieza: 0 };

test('Obras extra: gastan regolito, no se repiten y el plan sigue pidiendo regolito hasta terminar todo', () => {
  const S = crearPartida('t');
  S.regolito = 100;
  for (const id of Object.keys(MISION.construccion.secciones)) construirSeccion(S, id);
  assert.equal(quedaPorConstruir(S), true, 'después del blindaje todavía quedan obras');
  for (const [id, o] of Object.entries(MISION.construccion.obras)) {
    const antes = S.regolito;
    assert.equal(construirObra(S, id).ok, true, id);
    assert.equal(S.regolito, antes - o.costo, id);
    assert.equal(motivoNoObra(S, id), 'construida');
  }
  assert.equal(quedaPorConstruir(S), false);
  const pobre = crearPartida('t'); pobre.regolito = 1;
  assert.equal(construirObra(pobre, 'camas').motivo, 'faltaRegolito');
});

test('Camas de cultivo y túnel cambian la cosecha; la plataforma trae la nave de carga al sol siguiente', () => {
  const S = crearPartida('t');
  const base = preverSol(S).cosecha;
  S.regolito = 20;
  construirObra(S, 'camas');
  assert.equal(preverSol(S).cosecha, base + 1);
  S.refugio = true;
  const enRefugio = preverSol(S).cosecha;
  construirObra(S, 'tunel');
  assert.ok(preverSol(S).cosecha > enRefugio, 'con túnel el refugio no corta la cosecha a la mitad');
  S.refugio = false;
  const c0 = S.comida, r0 = S.repuestos;
  S.comida = 30;
  construirObra(S, 'plataforma');
  simularSol(S, null, null); S.sol++; iniciarSol(S);
  assert.equal(S.repuestos, r0 + 1);
  assert.ok(S.comida > 30 - MISION.consumoComida, 'llegó comida');
  assert.equal(S.cargaSol, null);
  void c0;
});

test('Inventos: un hito cada pasoInvento puntos, también después de la meta, y elegir uno descuenta el pendiente', () => {
  const S = crearPartida('t');
  const p = pasoInvento();
  S.ciencia = p - 1; assert.equal(inventosPorElegir(S), 0);
  S.ciencia = MISION.metaCiencia + p * 2;   // muy por encima de la meta
  const n = inventosPorElegir(S);
  assert.ok(n >= 4, 'la ciencia sobre la meta sigue dando inventos');
  const ev = eventoInvento(S);
  assert.equal(ev.opciones.length, 2);
  ev.opciones[0].efecto(S);
  assert.equal(inventosPorElegir(S), n - 1);
  assert.equal(S.inventos.length, 1);
  assert.ok(proximoInvento(S) > S.ciencia || inventosPorElegir(S) > 0);
  // nunca se ofrece un invento que ya tienes
  for (let i = 0; i < 20; i++) assert.ok(!opcionesInvento(S).includes(S.inventos[0]));
});

test('Inventos: cada efecto cambia la simulación', () => {
  const con = id => { const S = crearPartida('t'); elegirInvento(S, id); return S; };
  const S0 = crearPartida('t');
  assert.equal(preverSol(con('led')).cosecha, preverSol(S0).cosecha + 1);
  const rec = con('reciclador'); rec.o2 = S0.o2 = 50;   // con el tanque lleno no se nota la subida
  assert.equal(preverSol(rec).oxigeno, preverSol(S0).oxigeno + 2);
  const r = con('labRefugio'); r.niveles.lab = 2; r.refugio = true;
  assert.equal(preverSol(r).ciencia, 4);
  const t = con('taladro'); terminarEVA(t, { items: { ...sinItems, roca: 1 }, rad: 0, rescate: false, limpio: false, segundos: 10 });
  assert.equal(t.ciencia, MISION.eva.valores.roca + 2);
  const a = con('aislante'), b = crearPartida('t'); a.polvoSols = b.polvoSols = 2;
  assert.equal(consumo(a), consumo(b) - MISION.frioTormenta);
  assert.equal(con('impresora').repuestos, MISION.repuestos + 2);
});

test('Sols tranquilos: casi siempre hay una emergencia o una oportunidad, y las oportunidades tienen costo', () => {
  let vacios = 0, oport = 0;
  for (let i = 0; i < 400; i++) {
    const S = crearPartida('t'); S.sol = 3; S.guion = {};
    const id = elegirEvento(S);
    if (!id) vacios++; else if (EVENTOS[id].oportunidad) oport++;
  }
  assert.ok(vacios < 400 * 0.25, `sols sin nada: ${vacios}/400`);
  assert.ok(oport > 400 * 0.3, `oportunidades: ${oport}/400`);
  for (const [id, ev] of Object.entries(EVENTOS).filter(([, e]) => e.oportunidad)) {
    assert.equal(ev.tiempo, 0, `${id} no tiene reloj`);
    assert.equal(ev.opciones.length, 2, id);
  }
});

test('Textos nuevos en inglés', () => {
  setIdioma('en');
  try {
    const S = crearPartida('t'); S.cumpleanero = 'Mei';
    for (const [id, ev] of Object.entries(EVENTOS).filter(([, e]) => e.oportunidad)) {
      // Los textos solo con íconos y números (ej. "−4 ⚡ · +6 ❤️") sirven en los dos idiomas
      const conPalabras = s => /\p{L}{2,}/u.test(String(s).replace(/<[^>]+>/g, '').replace(/kWh|mSv/g, ''));
      for (const s of [ev.titulo, ev.texto(S), ...ev.opciones.flatMap(o => [o.texto, o.detalle])].filter(conPalabras))
        assert.notEqual(tr(s), s, `${id}: ${s}`);
      for (const o of ev.opciones) { const R = crearPartida('t'); R.bateria = 30; const res = o.efecto(R); assert.notEqual(tr(res), res, `${id}: ${res}`); }
    }
    for (const I of Object.values(INVENTOS)) { assert.notEqual(tr(I.nombre), I.nombre); assert.notEqual(tr(I.detalle), I.detalle); assert.notEqual(tr(I.dato), I.dato); assert.notEqual(tr(`${I.icono} ${I.nombre}`), `${I.icono} ${I.nombre}`); }
    const ev = eventoInvento(S);
    assert.notEqual(tr(ev.titulo), ev.titulo); assert.notEqual(tr(ev.texto(S)), ev.texto(S));
    const res = ev.opciones[0].efecto(S); assert.match(tr(res), /^Invention ready: /);
  } finally { setIdioma('es'); }
});
