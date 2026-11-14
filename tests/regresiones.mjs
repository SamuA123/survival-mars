// Run: node --experimental-default-type=module --test tests/regresiones.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { cargarClimaEspacial } from '../src/data/donki.js';
import { crearPartida, preverSol, simularSol } from '../src/sim/motor.js';
import { HALLAZGOS } from '../src/data/salud.js';
import { DATOS } from '../src/data/datos-curiosos.js';
import { SITIO } from '../src/data/sitio.js';

const cache = new Map();
globalThis.localStorage = {
  getItem: key => cache.get(key) ?? null,
  setItem: (key, value) => cache.set(key, value),
};

test('DONKI: zero observed events stays empty and never masquerades as historical flares', async () => {
  cache.clear();
  globalThis.fetch = async () => ({ ok: true, json: async () => [] });
  const result = await cargarClimaEspacial();
  assert.equal(result.real, true);
  assert.equal(result.tranquilo, true);
  assert.deepEqual(result.flares, []);
  assert.equal(result.origen, 'consulta');
  assert.ok(Date.parse(result.consultadoEn));
  assert.match(result.resumen_en, /no flares/);
});

test('DONKI: cache retains the original query time and is explicitly labelled', async () => {
  cache.clear();
  const timestamp = Date.now() - 3600000;
  cache.set('survivalMars.donki', JSON.stringify({ t: timestamp, flares: [{ clase: 'M2.3', fecha: '2026-11-10' }] }));
  globalThis.fetch = () => { throw new Error('Cache should not call the network'); };
  const result = await cargarClimaEspacial();
  assert.equal(result.origen, 'cache');
  assert.equal(result.consultadoEn, new Date(timestamp).toISOString());
  assert.equal(result.flares.length, 1);
  assert.doesNotMatch(result.resumen, /En vivo/);
});

test('DONKI: invalid cache and invalid payloads fall back to an honest historical archive', async () => {
  cache.set('survivalMars.donki', JSON.stringify({ t: Date.now(), flares: 'invalid' }));
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ error: 'bad data' }) }; };
  const result = await cargarClimaEspacial();
  assert.equal(calls, 2);
  assert.equal(result.real, false);
  assert.equal(result.origen, 'historico');
  assert.equal(result.consultadoEn, null);
  assert.ok(result.flares.length > 0);
});

test('DONKI: a failed primary endpoint can use the secondary endpoint', async () => {
  cache.clear(); let calls = 0;
  globalThis.fetch = async () => ++calls === 1
    ? { ok: false, status: 429 }
    : { ok: true, json: async () => [{ classType: 'X1.1', peakTime: '2026-11-10T12:00Z' }] };
  const result = await cargarClimaEspacial();
  assert.equal(result.real, true);
  assert.equal(result.origen, 'consulta');
  assert.equal(calls, 2);
  assert.deepEqual(result.flares, [{ clase: 'X1.1', fecha: '2026-11-10' }]);
});

test('Power preview is pure and matches actual battery, oxygen, food and science for 864 plans', () => {
  let cases = 0;
  for (const bateria of [0, 5, 40]) for (const polvoSols of [0, 3])
    for (let vital = 0; vital <= 3; vital++) for (let invernadero = 0; invernadero <= 3; invernadero++)
      for (let radio = 0; radio <= 2; radio++) for (let lab = 0; lab <= 2; lab++) {
        const S = crearPartida();
        Object.assign(S, { bateria, polvoSols, o2: 50, comida: 50, construir: true });
        S.niveles = { vital, invernadero, radio, lab };
        const before = structuredClone(S), preview = preverSol(S);
        assert.deepEqual(S, before);
        simularSol(S);
        assert.equal(S.bateria, preview.bateria);
        assert.equal(S.o2, 50 + preview.oxigeno);
        assert.equal(S.comida, 50 + preview.comida);
        assert.equal(S.ciencia, preview.ciencia);
        assert.equal(S.energiaOk, preview.apagados.length === 0);
        cases++;
      }
  assert.equal(cases, 864);
});

test('Shelter visibly trades work and harvest for protection', () => {
  const S = crearPartida(); S.niveles.lab = 1; S.refugio = true;
  const preview = preverSol(S);
  assert.equal(preview.ciencia, 0);
  assert.equal(preview.comida, -3);
});

test('Preview respects full tanks, empty stores and a damaged greenhouse', () => {
  for (const o2 of [0, 5, 100]) for (const comida of [0, 4, 100]) for (const invSalud of [0.3, 0.5, 1]) {
    const S = crearPartida(); Object.assign(S, { o2, comida, invSalud });
    S.niveles.vital = 3;
    const preview = preverSol(S); simularSol(S);
    assert.equal(S.o2 - o2, preview.oxigeno);
    assert.equal(S.comida - comida, preview.comida);
  }
});

test('Learning content and every location section have English counterparts', () => {
  for (const item of HALLAZGOS) assert.ok(item.texto_en, item.id);
  for (const [key, item] of Object.entries(DATOS)) assert.ok(item.texto_en, key);
  assert.ok(SITIO.nombre_en && SITIO.nombreCompleto_en && SITIO.texto_en);
  for (const section of SITIO.resumen) {
    assert.ok(section.titulo_en);
    assert.equal(section.puntos_en.length, section.puntos.length);
  }
  for (const map of SITIO.mapas) assert.ok(map.texto_en);
});
