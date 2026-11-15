// No dependencies: run a local HTTP server and Chrome with --remote-debugging-port=9222.
// node tests/browser.mjs
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const target = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0;
const pending = new Map(), errors = [];
ws.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.id) {
    const request = pending.get(msg.id); pending.delete(msg.id);
    if (msg.error) request.reject(new Error(JSON.stringify(msg.error))); else request.resolve(msg.result);
  }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
};
const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const js = async expression => {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, replMode: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const wait = async (expression, timeout = 20000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await js(expression)) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Timed out: ' + expression);
};
const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click()`);
const tap = async selector => {
  await js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);
  await wait(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })()`);
  const point = await js(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
};
const text = selector => js(`document.querySelector(${JSON.stringify(selector)}).innerText`);
const screenshot = async name => {
  await new Promise(resolve => setTimeout(resolve, 400)); // let panel entry animations settle
  const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await mkdir('node_modules/qa', { recursive: true });
  await writeFile(`node_modules/qa/${name}.png`, Buffer.from(data, 'base64'));
};

try {
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('survivalMars.tutorialVisto','1'); localStorage.removeItem('survivalMars.tutorialVisto.v2'); localStorage.setItem('survivalMars.ligero','1');` });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:5500/?demo=1&lang=es' });
  await wait(`!!document.querySelector('#btnEmpezar')`);
  await js(`document.querySelector('#inNombre').value = 'Test Pilot'`);
  await click('#idiomaModal');
  assert.match(await text('.intro'), /Three-sol demo/);
  assert.equal(await js(`document.querySelector('#inNombre').value`), 'Test Pilot');
  assert.equal(await js(`document.documentElement.lang`), 'en');
  await wait(`!!document.querySelector('.ubic-link')`);
  await click('.ubic-link');
  assert.match(await text('.ubic-caja'), /Terrain and the radiation challenge/);
  assert.doesNotMatch(await text('.ubic-caja'), /Tu base|Ubicación|Topografía|Fuente:/);
  await click('.ubic-idioma'); assert.match(await text('.ubic-caja'), /Topografía/);
  await click('.ubic-idioma'); await click('.ubic-ok');
  assert.match(await text('#btnAprender'), /Learn to play/);
  await click('#btnAprender');
  await wait(`!document.querySelector('#modal').classList.contains('oculto') === false`);
  assert.equal(await js(`juego.S.nombre`), 'Test Pilot');
  await wait(`!!document.querySelector('.tuto-globo')`);
  const paso = n => wait(`document.querySelector('.tuto-pie > span')?.textContent === '${n}/9'`);
  await tap('.tuto-sig'); await paso(2);
  await tap('.tuto-abrir'); await paso(3);
  assert.equal(await js(`document.querySelectorAll('#panel .sis').length`), 1);
  await tap('.tuto-sig'); await paso(4);
  await tap('.tuto-abrir'); await paso(5);
  await tap('[data-sis="lab"][data-d="1"]'); await paso(6);
  await tap('.tuto-sig'); await paso(7);
  await tap('.tuto-sig'); await paso(8);
  await tap('.tuto-abrir'); await paso(9);
  await tap('#btnSol'); await wait(`!!document.querySelector('#btnSig')`);
  assert.equal(await js(`localStorage.getItem('survivalMars.tutorialVisto.v2')`), '1');
  await click('#btnSig');
  await wait(`document.querySelector('#modal').classList.contains('oculto')`);
  await click('#btnBase');
  assert.match(await text('#panel'), /If you end the sol now/);
  assert.doesNotMatch(await text('#panel'), /Meseta|Soporte vital|Recolección/);
  for (const [building, system] of [['habitat', 'vital'], ['invernadero', 'invernadero'], ['lab', 'lab'], ['antena', 'radio']]) {
    await click(`[data-sel="${building}"]`);
    assert.equal(await js(`document.querySelectorAll('#panel .sis').length`), 1);
    assert.equal(await js(`document.querySelector('#panel .sis').dataset.foco`), system);
    if (building === 'invernadero') assert.match(await text('#panel'), /You harvest.*you use/s);
    if (building === 'antena') assert.match(await text('#panel'), /Message inbox/);
    await click('.panel-volver');
  }
  await click('[data-sel="tripulacion"]'); assert.equal(await js(`document.querySelectorAll('#panel [data-sis]').length`), 0);
  await click('.panel-volver');
  await click('[data-sel="inventario"]'); assert.match(await text('#panel'), /Martian rock/);
  await click('.panel-volver');
  await screenshot('english-base');
  await click('#btnBase');

  // Every event, including dynamic results and switching languages mid-emergency.
  await js(`window.qaMotor = await import('/src/sim/motor.js'); window.qaModales = await import('/src/ui/modales.js'); window.qaIdioma = await import('/src/ui/i18n.js');`);
  const ids = await js(`Object.keys(qaMotor.EVENTOS)`);
  for (const id of ids) {
    await js(`window.qaState = qaMotor.crearPartida(); window.qaEvent = qaMotor.EVENTOS[${JSON.stringify(id)}]; qaEvent.inicio?.(qaState); window.qaTime = qaEvent.tiempo; qaEvent.tiempo = 0; window.qaDone = qaModales.mostrarEvento(qaState, qaEvent); void 0;`);
    const content = await text('.evento');
    assert.doesNotMatch(content, /Los satélites|Una tormenta|llamarada|invernadero|repuesto|¿/);
    await click('.opcion:not(:disabled)');
    const state = await js(`JSON.stringify(qaState)`);
    await click('#idiomaModal'); await click('#idiomaModal');
    assert.equal(await js(`JSON.stringify(qaState)`), state, 'Language switch repeated an event effect');
    assert.doesNotMatch(await text('#resultado'), /La tripulación|Los paneles|reciclador|Quitaste|Cerraste|¡/);
    await click('#btnSeguir');
    await js(`await qaDone; qaEvent.tiempo = qaTime`);
  }
  console.log('PASS: intro, location, base console and all event results in English');

  // Timer and help must survive a language change without resetting or queueing twice.
  await js(`qaState = qaMotor.crearPartida(); qaEvent = qaMotor.EVENTOS.reciclador; qaTime = qaEvent.tiempo; qaEvent.tiempo = 6; qaDone = qaModales.mostrarEvento(qaState, qaEvent); void 0;`);
  await click('#btnAyuda');
  await wait(`Number(document.querySelector('#relojNum').textContent) < 6`);
  const seconds = await js(`Number(document.querySelector('#relojNum').textContent)`);
  await click('#idiomaModal'); await click('#idiomaModal');
  assert.ok(await js(`Number(document.querySelector('#relojNum').textContent)`) <= seconds);
  assert.equal(await js(`qaState.pendientes.length`), 1);
  await wait(`!!document.querySelector('#btnSeguir')`, 9000);
  assert.match(await text('#resultado'), /Time's up/);
  await click('#btnSeguir'); await js(`await qaDone; qaEvent.tiempo = qaTime`);

  await click('#btnDatos'); assert.match(await text('#modalCaja'), /HISTORICAL ARCHIVE/);
  assert.doesNotMatch(await text('#modalCaja'), /clima espacial|Estación Espacial|Mapa topográfico|Marte \(Curiosity\)/);
  await screenshot('english-nasa'); await click('#btnCerrarDatos');

  // A complete three-sol demo, including the final review.
  for (let sol = await js(`juego.S.sol`); sol <= 3; sol++) {
    await click('#btnSol');
    await wait(`!!document.querySelector('.opcion') || !!document.querySelector('#btnSig')`);
    if (await js(`!!document.querySelector('.opcion')`)) { await click('.opcion:not(:disabled)'); await click('#btnSeguir'); }
    await wait(`!!document.querySelector('#btnSig')`);
    assert.doesNotMatch(await text('#modalCaja'), /La tripulación|El laboratorio|Paneles protegidos|¿Sabías/);
    await click('#btnSig');
  }
  await wait(`!!document.querySelector('.repaso')`);
  for (const [i, value] of [0, 1, 0].entries()) await click(`[data-pregunta="${i}"][value="${value}"]`);
  assert.match(await text('.repaso-puntos'), /3\/3 correct/);
  await click('#idiomaModal'); assert.match(await text('.repaso-puntos'), /3\/3 correctas/);
  await click('#idiomaModal'); assert.equal(await js(`document.querySelectorAll('.repaso input:checked').length`), 3);
  await screenshot('english-final');
  console.log('PASS: emergency timer, help, NASA provenance, complete demo and bilingual review');

  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot('mobile-final');
  assert.ok(await js(`document.documentElement.scrollWidth <= innerWidth`), 'Mobile page overflows horizontally');
  await click('#btnOtra'); await wait(`!!document.querySelector('#btnEmpezar')`);
  await screenshot('mobile-intro');
  assert.equal(await js(`document.querySelector('#modalCaja').scrollWidth <= document.querySelector('#modalCaja').clientWidth`), true);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `const realFetch = window.fetch; window.fetch = (url, options) => /DONKI/.test(String(url)) ? Promise.resolve(new Response('[]', {status: 200, headers: {'Content-Type': 'application/json'}})) : realFetch(url, options); localStorage.removeItem('survivalMars.donki');` });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:5500/?lang=en' });
  await wait(`!!document.querySelector('[data-dif="cadete"]')`);
  await click('[data-dif="cadete"]'); assert.match(await text('.intro'), /10 sols/);
  await click('[data-dif="comandante"]'); assert.match(await text('.intro'), /15 sols/);
  await click('#btnAprender'); await wait(`!!document.querySelector('.tuto-saltar')`); await click('.tuto-saltar');
  assert.equal(await js(`localStorage.getItem('survivalMars.tutorialVisto.v2')`), null);
  await wait(`document.querySelector('#modal').classList.contains('oculto')`);
  assert.equal(await js(`(await import('/src/sim/config.js')).MISION.maxSol`), 15);
  assert.equal(await js(`juego.S.demo`), false);
  await click('#btnDatos');
  assert.match(await text('#modalCaja'), /no flares/);
  assert.equal(await js(`document.querySelectorAll('.flares li').length`), 0);
  await click('#btnCerrarDatos');
  await click('#btnBase'); await click('[data-sel="rover"]'); await click('[data-accion="eva"]');
  await wait(`!!document.querySelector('#evaHud')`);
  await js(`(await import('/src/ui/eva-hud.js')).tarjetaObjeto('roca')`);
  await click('#btnIdioma'); assert.match(await text('#evaHud'), /Roca marciana/);
  await click('#btnIdioma'); assert.match(await text('#evaHud'), /Martian rock/);
  assert.match(await text('#evaTarjeta'), /\+1 Martian rock/);
  assert.match(await text('#evaTarjeta'), /science when you return/);
  assert.equal(await js(`juego.mundo.eva.activo`), true);
  for (const [width, height, mobile] of [[1440, 1000, false], [390, 844, true], [844, 390, true]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await js(`(await import('/src/ui/eva-hud.js')).tarjetaObjeto('roca')`);
    await wait(`getComputedStyle(document.querySelector('#evaTarjeta')).visibility === 'visible'`);
    assert.ok(await js(`(() => {
      const r = document.querySelector('#evaTarjeta').getBoundingClientRect();
      return [...document.querySelectorAll('.hud-top, .eva-top, .eva-base, .eva-botones, .joystick, .botones-top')].every(el => {
        const b = el.getBoundingClientRect();
        return !b.width || !b.height || getComputedStyle(el).visibility === 'hidden' || r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom;
      });
    })()`), `Pickup overlaps HUD at ${width}x${height}`);
    await screenshot(`pickup-${width}x${height}`);
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await screenshot('english-spacewalk');
  await js(`juego.mundo.eva.terminar(false)`);
  await wait(`!!document.querySelector('#btnEvaOk')`);
  assert.match(await text('#modalCaja'), /Back at the base|Back to the base/);
  await click('#btnEvaOk');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click('#btnBase'); await click('[data-sel="invernadero"]');
  assert.equal(await js(`document.querySelector('#panel').scrollWidth <= document.querySelector('#panel').clientWidth`), true);
  assert.ok(await js(`document.querySelector('.t-comida small').getBoundingClientRect().height > 0`), 'Food label and value should remain visible on mobile');
  assert.ok(await js(`(() => { const r = document.querySelector('#btnSol').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })()`), 'End sol button is clipped');
  await screenshot('mobile-greenhouse');
  console.log('PASS: normal difficulty settings, empty NASA query and live spacewalk language switching');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('PASS: mobile layout and no browser exceptions');
} finally {
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`).catch(() => {});
  ws.close();
}
