// Modales: inicio, emergencias con cuenta regresiva, resumen del sol, final y fuentes NASA.
// Textos: t() interfaz · tr() textos de src/sim · txt()/fuente*() datos con *_en · L(es, en) textos del rediseño (ver i18n.js).
import { MISION, RECURSOS } from '../sim/config.js';
import { pedirAyuda, r1, CLIMA, EVENTOS, enTormenta, enConjuncion } from '../sim/motor.js';
import { seccionesHechas } from '../sim/motor.js';
import { DATOS } from '../data/datos-curiosos.js';
import { FUENTES } from '../data/fuentes.js';
import { SITIO } from '../data/sitio.js';
import { RADIACION } from '../data/radiacion.js';
import { beep } from './sonido.js';
import { evaluarLogros, logrosHTML } from './logros.js';
import { informeHTML } from './informe.js';
import { repasoHTML, conectarRepaso } from './aprendizaje.js';
import { esDemo } from '../sim/demostracion.js';
import { t, tr, txt, fuenteNombre, fuenteUso, esEN, onIdioma, setIdioma, idioma, resumenClima, estadoClima, fechaClima } from './i18n.js';

const $ = s => document.querySelector(s);
let redibujarModal = null;
onIdioma(() => {
  if (!$('#modal').classList.contains('oculto')) {
    const scroll = $('#modalCaja').scrollTop;
    redibujarModal?.();
    $('#modalCaja').scrollTop = scroll;
  }
});
const L = (es, en) => esEN() ? en : es;
// Nombre que se pone solo si el jugador no escribe nada (en cualquiera de los dos idiomas)
export const nombrePorDefecto = n => !n || ['comandante', 'commander'].includes(String(n).trim().toLowerCase());
export const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function abrir(html, clase = '') {
  $('#modalCaja').className = 'modal-caja ' + clase;
  $('#modalCaja').innerHTML = `<div class="modal-idioma"><button type="button" id="idiomaModal" class="chip-btn" aria-label="${t('top.idioma.t')}">${idioma === 'es' ? '🌐 English' : '🌐 Español'}</button></div>` + html;
  $('#idiomaModal').onclick = () => setIdioma(idioma === 'es' ? 'en' : 'es');
  $('#modal').classList.remove('oculto');
}
export const cerrar = () => { $('#modal').classList.add('oculto'); redibujarModal = null; };

const fuenteChip = clave => FUENTES[clave] ? `<a class="fuente" href="${FUENTES[clave].url}" target="_blank" rel="noopener">${t('fuente')} ${fuenteNombre(FUENTES[clave])}</a>` : '';
const estudioChip = h => h.url ? `<a class="fuente" href="${h.url}" target="_blank" rel="noopener">${L('Estudio NASA', 'NASA study')} ${h.estudio || 'OSDR'} ↗</a>` : fuenteChip(h.fuente);

// El clima carga después de abrir la pantalla de inicio: main.js llama a esto cuando llega DONKI.
const textoClima = () => `${CLIMA.real ? '🛰️' : '📚'} <b>${t('intro.clima')}</b> ${resumenClima(CLIMA)}<br>
  <small>${estadoClima(CLIMA)}${CLIMA.consultadoEn ? ' · ' + fechaClima(CLIMA) : ''}</small><br>
  <small>${t('intro.climaSub')}</small>`;
export function refrescarClimaInicio() { const el = document.querySelector('#climaInicio'); if (el) el.innerHTML = textoClima(); }

// ------------------------------------------------------------------
export function pantallaInicio() {
  return new Promise(res => {
    let nombre = '';
    const dibujar = () => {
      nombre = $('#inNombre')?.value ?? nombre;
      abrir(`
        <div class="intro">
          <div class="logo">🔴</div>
          <h1>Survival Mars</h1>
          ${esDemo ? `<p class="demo-aviso">${L('🎬 Demostración de 3 sols · datos históricos · 30 segundos por emergencia', '🎬 Three-sol demo · historical data · 30 seconds per emergency')}</p>` : ''}
          <p class="sub">${t('intro.sub')}</p>
          <p>${txt(SITIO)}</p>
          <p>${t('intro.p2', { sols: MISION.maxSol })}</p>
          <label class="nombre">${t('intro.nombre')}<input id="inNombre" maxlength="16" placeholder="${t('intro.ph')}" autocomplete="off"></label>
          <div class="como">
            <div>①<b>${L('Abre un edificio', 'Open a building')}</b><small>${L('Descubre su función y sus controles', 'Discover its purpose and controls')}</small></div>
            <div>②<b>${L('Reparte energía', 'Share the power')}</b><small>${L('Aire y comida para sobrevivir; laboratorio para hacer ciencia', 'Air and food to survive; a lab to do science')}</small></div>
            <div>③<b>${L('Termina el sol', 'End the sol')}</b><small>${L('Mira las consecuencias y planea el siguiente', 'See the results and plan the next one')}</small></div>
          </div>
          <div class="clima-box" id="climaInicio">${textoClima()}</div>
          <div class="inicio-acciones">
            <button class="btn-grande" id="btnAprender">${L('Aprender a jugar, paso a paso 🚀', 'Learn to play, step by step 🚀')}</button>
            <button class="btn-secundario" id="btnEmpezar">${L('Ya sé jugar · empezar sin guía', 'I know how to play · start without a guide')}</button>
          </div>
          <p class="controles">${t('intro.controles')}</p>
        </div>`, 'ancho');
      $('#inNombre').value = nombre;
      const empezar = guiar => { beep(880, 0.1); const n = $('#inNombre').value.trim(); cerrar(); res({ nombre: n || t('intro.defecto'), guiar }); };
      $('#btnAprender').onclick = () => empezar(true);
      $('#btnEmpezar').onclick = () => empezar(false);
    };
    redibujarModal = dibujar;
    dibujar();
  });
}

// ------------------------------------------------------------------
let cuenta = null;
export function mostrarEvento(S, ev) {
  return new Promise(res => {
    beep(ev.tiempo ? 520 : 880, 0.25, 'triangle');
    const tiempo = ev.tiempo || 0;
    let restante = tiempo, hecho = false, resultado = '', ayuda = null;
    const actualizarReloj = () => {
      if (!tiempo || hecho) return;
      const arco = $('#relojArco'), longitud = 2 * Math.PI * 17;
      $('#relojNum').textContent = restante;
      arco.style.strokeDasharray = longitud;
      arco.style.strokeDashoffset = longitud * (1 - restante / tiempo);
      $('#reloj').classList.toggle('rojo', restante <= 3);
    };
    const terminar = txtRes => {
      if (hecho) return;
      hecho = true; resultado = txtRes;
      clearInterval(cuenta);
      dibujar();
    };
    const dibujar = () => {
      const ops = ev.opciones.map((o, i) => {
        const ok = !o.disponible || o.disponible(S);
        const det = typeof o.detalle === 'function' ? o.detalle(S) : (o.detalle || '');
        return `<button class="opcion" data-op="${i}" ${ok && !hecho ? '' : 'disabled'}><span>${tr(o.texto)}</span>${det ? `<small>${ok ? tr(det) : t('ev.noDisp')}</small>` : ''}</button>`;
      }).join('');
      abrir(`
        <div class="evento">
          <div class="ev-cab">
            <div class="ev-icono">${ev.icono}</div><h2>${tr(ev.titulo)}</h2>
            ${tiempo ? `<div class="reloj" id="reloj"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle id="relojArco" cx="20" cy="20" r="17"/></svg><b id="relojNum">${tiempo}</b></div>` : ''}
          </div>
          <p>${tr(ev.texto(S))}</p>
          <div class="opciones">${ops}</div>
          ${ev.consejo ? `<button class="btn-ayuda" id="btnAyuda" ${hecho || ayuda !== null ? 'disabled' : ''}>${t('ev.ayuda')}</button><div id="ayuda" class="ayuda">${ayuda === null ? '' : tr(ayuda)}</div>` : ''}
          <div id="resultado">${hecho ? `<div class="res">${tr(resultado)}</div><button class="btn-grande" id="btnSeguir">${t('continuar')}</button>` : ''}</div>
        </div>`, tiempo && !hecho ? 'urgente' : '');
      if (hecho) $('#btnSeguir').onclick = () => { cerrar(); res(resultado); };
      document.querySelectorAll('.opcion:not(:disabled)').forEach(b => b.onclick = () => { beep(990, 0.08); terminar(ev.opciones[+b.dataset.op].efecto(S)); });
      const ay = $('#btnAyuda');
      if (ay) ay.onclick = () => { ayuda = pedirAyuda(S, ev); dibujar(); };
      actualizarReloj();
    };
    redibujarModal = dibujar;
    dibujar();
    if (tiempo) {
      cuenta = setInterval(() => {
        restante--;
        actualizarReloj();
        beep(restante <= 3 ? 880 : 660, 0.06);
        if (restante <= 0) { beep(200, 0.4, 'sawtooth'); terminar('⏰ <b>¡Se acabó el tiempo!</b> ' + ev.alAgotarse(S)); }
      }, 1000);
    }
  });
}

// ------------------------------------------------------------------
export function mostrarResumen(S, antes, r, fin) {
  return new Promise(res => {
    const dibujar = () => {
      // Solo se muestra lo que cambió: un niño no necesita leer seis "＝".
      const filas = [...RECURSOS, { id: 'ciencia', nombre: 'Ciencia', icono: '🔬' }].map(rc => {
        const d = r1(S[rc.id] - antes[rc.id]);
        if (d === 0) return '';
        const bueno = rc.inverso ? d < 0 : d > 0;
        return `<div class="delta ${bueno ? 'bien' : 'mal'}" title="${tr(rc.nombre)}">${rc.icono}<b>${d > 0 ? '+' + d : d}</b></div>`;
      }).join('');
      // Una sola tarjeta de aprendizaje: si hay un estudio real relacionado, gana al dato curioso.
      const dato = r.dato && DATOS[r.dato];
      const aprende = r.hallazgo
        ? `<div class="dato salud">🧬 <b>${L('Ciencia real:', 'Real science:')}</b> ${txt(r.hallazgo)} ${estudioChip(r.hallazgo)}</div>`
        : dato ? `<div class="dato">${t('res.sabias')} ${txt(dato)} ${fuenteChip(dato.fuente)}</div>` : '';
      const boton = fin ? (fin.gano ? t('res.gano') : t('res.perdio')) : t('res.sig');
      abrir(`
        <h2>🌅 ${L('Resumen del sol', 'Sol summary')} ${S.sol}</h2>
        ${filas ? `<div class="deltas">${filas}</div>` : ''}
        ${r.lineas.length ? `<ul class="lineas">${r.lineas.map(l => `<li>${tr(l)}</li>`).join('')}</ul>` : `<p class="tranqui">${t('res.tranqui')}</p>`}
        ${bloqueRecolectado(r)}
        ${aprende}
        <button class="btn-grande" id="btnSig">${boton}</button>`);
      $('#btnSig').onclick = () => { cerrar(); res(); };
    };
    redibujarModal = dibujar;
    dibujar();
  });
}

// ------------------------------------------------------------------
export function mostrarResumenEVA(res, lineas) {
  return new Promise(ok => {
    const dibujar = () => {
      abrir(`
        <div class="ev-cab"><div class="ev-icono">${res.rescate ? '🆘' : '🧑‍🚀'}</div>
          <h2>${res.rescate ? t('eva.rescate') : t('eva.vuelta')}</h2></div>
        <ul class="lineas">${lineas.map(l => `<li>${tr(l)}</li>`).join('')}</ul>
        <div class="dato">${t('res.sabias')} ${txt(DATOS.eva)} ${t('eva.sabiasExtra')} ${fuenteChip(DATOS.eva.fuente)}</div>
        <button class="btn-grande" id="btnEvaOk">${t('continuar')}</button>`);
      $('#btnEvaOk').onclick = () => { cerrar(); ok(); };
    };
    redibujarModal = dibujar;
    dibujar();
  });
}

// ------------------------------------------------------------------
export function pantallaFinal(S, fin) {
  return new Promise(res => {
    const respuestas = {};
    const e = fin.estrellas || 0;
    const nuevos = S.demo ? [] : evaluarLogros(S, fin);   // no guardar insignias de la demo
    const dibujar = () => {
      const aprendidos = S.aprendidos.map(k => `<li>${txt(DATOS[k])}</li>`).join('');
      abrir(`
        <div class="final">
          <div class="logo">${fin.gano ? '🚀' : fin.icono}</div>
          <h1>${fin.gano ? t('fin.cumplida') : t('fin.abortada')}</h1>
          <p>${fin.gano
            ? (nombrePorDefecto(S.nombre)   // sin nombre: "Comandante: tu tripulación…" (no "Comandante Comandante")
              ? t('fin.ganoSinNombre', { s: MISION.maxSol })
              : t('fin.gano', { n: escapar(S.nombre), s: MISION.maxSol }))
            : t('fin.perdio', { t: tr(fin.texto), s: S.sol })}</p>
          ${fin.gano ? `<div class="estrellas">${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}</div>
            <small class="criterios">${t('fin.criterios', { c: MISION.metaCiencia, r: MISION.radLimite / 2 })}</small>
            ${S.ciencia < MISION.metaCiencia ? `<p class="tranqui">${t('fin.pocaCiencia', { c: MISION.metaCiencia })}</p>` : ''}` : ''}
          <div class="final-stats">🫁 ${S.o2}% · 🥔 ${S.comida}% · ☢️ ${S.rad} mSv · 🔬 ${S.ciencia} ${t('fin.ciencia')}</div>
          <div class="final-inv">${t('fin.recolectaste')} ${filasInventario(S.inventario.total)}
            <br>${t('fin.planes', { a: S.planesCumplidos, b: S.planesEnviados })}</div>
          ${logrosHTML(nuevos)}
          ${informeHTML(S)}
          ${repasoHTML(S, respuestas)}
          <h3>${t('fin.aprendiste', { n: S.aprendidos.length })}</h3>
          <ul class="aprendidos">${aprendidos}</ul>
          <button class="btn-grande" id="btnOtra">${t('fin.otra')}</button>
        </div>`, 'ancho');
      beep(fin.gano ? 1046 : 220, 0.5, 'triangle');
      $('#btnOtra').onclick = () => { cerrar(); res(); };
      conectarRepaso($('#modalCaja'), S, respuestas);
    };
    redibujarModal = dibujar;
    dibujar();
  });
}

// ------------------------------------------------------------------
//  INVENTARIO de lo recolectado en Marte
// ------------------------------------------------------------------
const OBJ = MISION.eva.objetos;
const filasInventario = inv => Object.entries(OBJ).map(([k, o]) => `<b>${inv[k]}</b> ${o.icono} ${tr(o.nombre)}`).join(' · ');

function bloqueRecolectado(r) {
  const total = Object.values(r.recolectado || {}).reduce((a, b) => a + b, 0);
  const p = r.plan;
  let plan = '';
  if (p) {
    const o = OBJ[p.tipo];
    plan = p.cumplido
      ? `<div class="plan-res ok">${t('inv.planOk', { c: p.cantidad, i: o.icono, n: tr(o.nombre) })}</div>`
      : `<div class="plan-res">${t('inv.planNo', { c: p.cantidad, i: o.icono, n: tr(o.nombre), l: p.logrado })}</div>`;
  }
  // Si no salió a explorar, no se le recuerda cada sol lo que no hizo: el pedido era opcional.
  if (!total && !p?.cumplido) return '';
  return `<div class="recolectado"><b>${t('inv.hoyTit')}</b> ${total ? filasInventario(r.recolectado) : t('inv.hoyNada')}${plan}</div>`;
}

// Inventario completo (lo recolectado hoy y en la misión). La consola de la base también lo muestra.
export function panelInventario(S) {
  const dibujar = () => {
    const filas = Object.entries(OBJ).map(([k, o]) => `
      <div class="inv-fila" style="--c:${o.color}">
        <span class="inv-ic">${o.icono}</span>
        <div class="inv-txt"><b>${tr(o.nombre)}</b><small>${tr(o.que)}</small><small class="inv-uso">✅ ${tr(o.uso)}</small></div>
        <div class="inv-num"><b>${S.inventario.hoy[k]}</b><small>${t('inv.hoy')}</small></div>
        <div class="inv-num"><b>${S.inventario.total[k]}</b><small>${t('inv.mision')}</small></div>
      </div>`).join('');
    const p = S.plan, o = p && OBJ[p.tipo];
    abrir(`
      <h2>${t('inv.tit')}</h2>
      <p class="tranqui">${t('inv.desc')}</p>
      <div class="inv-lista">${filas}</div>
      <div class="inv-extra">${t('inv.regolito', { r: S.regolito, n: MISION.eva.regolitoPorNivel, b: S.blindaje, x: seccionesHechas(S) })}</div>
      ${p ? `<div class="plan-res ${p.cumplido ? 'ok' : ''}">${t('inv.planHoy', { c: p.cantidad, i: o.icono, n: tr(o.nombre), h: Math.min(S.inventario.hoy[p.tipo], p.cantidad) })} ${p.cumplido ? '✅' : t('inv.opcional')}</div>` : ''}
      <div class="inv-extra">${t('fin.planes', { a: S.planesCumplidos, b: S.planesEnviados })}</div>
      <button class="btn-grande" id="btnCerrarInv">${t('volver')}</button>`, 'ancho');
    $('#btnCerrarInv').onclick = cerrar;
  };
  redibujarModal = dibujar;
  dibujar();
}

// Tarea del día: el pedido de Control de Misión, por qué lo pide y qué es lo que hay que traer (dato real).
export function panelTarea(S) {
  const dibujar = () => {
    const p = S.plan, o = p && OBJ[p.tipo];
    const sinTarea = enTormenta(S) ? L('🌪️ Hoy no hay tarea: con tormenta de polvo nadie puede salir.', '🌪️ No task today: nobody can go outside during a dust storm.')
      : enConjuncion(S) ? L('🌞 El Sol está entre Marte y la Tierra: hoy no llegó ningún mensaje.', '🌞 The Sun is between Mars and Earth: no message arrived today.')
      : S.niveles.radio === 0 ? L('📡 Control de Misión envió una tarea… pero la antena está apagada. Enciéndela en la consola.', '📡 Mission Control sent a task… but the antenna is off. Turn it on in the console.')
      : L('Hoy no hay tarea.', 'No task today.');
    let cuerpo;
    if (!p) cuerpo = `<p class="tarea-motivo">${sinTarea}</p>`;
    else {
      const hecho = Math.min(S.inventario.hoy[p.tipo], p.cantidad);
      cuerpo = `
        <p class="tarea-de">📡 ${L('Control de Misión', 'Mission Control')} <small>(${L(`mensaje con ${MISION.delayMin} min de retraso`, `message with a ${MISION.delayMin}-minute delay`)})</small></p>
        <div class="tarea-pedido" style="--c:${o.color}">
          <span class="tarea-ic">${o.icono}</span>
          <div><b>${L('Trae', 'Bring')} ${p.cantidad} ${tr(o.nombre).toLowerCase()}</b><small>${tr(p.motivo)}</small></div>
          <div class="tarea-prog">${Array.from({ length: p.cantidad }, (_, i) => `<i class="${i < hecho ? 'on' : ''}">${o.icono}</i>`).join('')}</div>
        </div>
        <p class="tarea-que"><b>${L('¿Qué es?', 'What is it?')}</b> ${tr(o.que)}</p>
        <p class="tarea-que"><b>${L('¿Para qué sirve?', 'What is it for?')}</b> ${tr(o.uso)}</p>
        ${p.cumplido
          ? `<p class="plan-res ok">${L('✅ ¡Cumplida! La tripulación recibió el premio.', '✅ Done! The crew got the reward.')}</p>`
          : `<p class="plan-res">${L(`Es opcional. Premio: +${MISION.plan.bono.ciencia} ciencia y +${MISION.plan.bono.salud} salud. Pero salir cuesta oxígeno y radiación: tú decides si vale la pena.`,
              `It is optional. Reward: +${MISION.plan.bono.ciencia} science and +${MISION.plan.bono.salud} health. But going out costs oxygen and radiation: you decide if it is worth it.`)}</p>`}`;
    }
    abrir(`
      <div class="monitor-cab"><span class="led"></span>${L('Tarea del día', 'Task of the day')} · Sol ${S.sol}</div>
      ${cuerpo}
      <div class="tarea-mision">${L('Tareas cumplidas en la misión:', 'Tasks completed in the mission:')} <b>${S.planesCumplidos}</b> ${L('de', 'of')} ${S.planesEnviados}</div>
      <button class="btn-grande" id="btnCerrarTarea">${L('Entendido', 'Got it')}</button>`, 'monitor');
    $('#btnCerrarTarea').onclick = cerrar;
  };
  redibujarModal = dibujar;
  dibujar();
}

// ¿Qué es real? Cada fuente lleva un sello que dice qué papel juega: cambia la partida, la explica, o es del juego.
export function panelDatos() {
  const dibujar = () => {
    const reciente = CLIMA.real;
    const llamaradas = (CLIMA.flares || []).slice(0, 6).map(f => `<li><b>${f.clase}</b> · ${f.fecha}${f.url ? ` · <a href="${f.url}" target="_blank" rel="noopener">${t('fuente')} NASA ↗</a>` : ''}</li>`).join('');
    const sello = (estampa, clase, titulo, texto, url) => `
      <${url ? `a href="${url}" target="_blank" rel="noopener"` : 'div'} class="sello">
        <span class="estampa ${clase}">${estampa}</span><div><b>${titulo}</b><small>${texto}</small></div></${url ? 'a' : 'div'}>`;
    const R = RADIACION, max = R.marteSuperficie.valor;
    const barra = (nombre, v, txtB) => `<div><span>${nombre}</span><div class="barra"><div style="width:${Math.max(1.5, v / max * 100)}%"></div></div><b>${txtB}</b></div>`;
    const mecanicas = Object.entries(FUENTES).filter(([, f]) => f.papel === 'mecanica');
    const textos = Object.entries(FUENTES).filter(([, f]) => f.papel !== 'mecanica');
    abrir(`
      <h2>${L('¿Qué es real en este juego?', 'What is real in this game?')}</h2>
      <p class="real-intro">${L('Tú tomas las decisiones. Usamos datos NASA y reglas educativas simplificadas.', 'You make the decisions. We use NASA data and simplified learning rules.')}</p>
      <div class="sellos">
        ${sello(estadoClima(CLIMA), reciente ? 'vivo' : 'mecanica', L('Las llamaradas solares de tu partida', 'The solar flares in your game'),
          `${resumenClima(CLIMA)} ${fechaClima(CLIMA)}.${reciente ? '' : L(' Son llamaradas que de verdad ocurrieron, guardadas en el juego.', ' These flares really happened and are stored in the game.')}<ul class="flares">${llamaradas}</ul>`, FUENTES.donki.url)}
        ${mecanicas.filter(([k]) => k !== 'donki').map(([, f]) => sello(L('CAMBIA TU PARTIDA', 'CHANGES YOUR GAME'), 'mecanica', fuenteNombre(f), fuenteUso(f), f.url)).join('')}
        ${sello(L('COMPARA', 'COMPARE'), 'texto', L('Radiación en un día', 'Radiation in one day'), `
          <div class="comparar">
            ${barra(L('Marte (Curiosity)', 'Mars (Curiosity)'), R.marteSuperficie.valor, L('0,67 mSv', '0.67 mSv'))}
            ${barra(L('Tierra', 'Earth'), R.tierra.valor, L('0,007 mSv', '0.007 mSv'))}
          </div>${txt(R.estacionEspacial)}`, FUENTES.radlab.url)}
        ${textos.filter(([k]) => k !== 'radlab').map(([, f]) => sello(L('TE LO EXPLICA', 'EXPLAINS IT'), 'texto', fuenteNombre(f), fuenteUso(f), f.url)).join('')}
        ${sello(L('MODELO EDUCATIVO', 'LEARNING MODEL'), 'juego', L('No es un pronóstico para Marte', 'Not a Mars forecast'), L('La actividad solar observada inspira los ejercicios. No calculamos la llegada de partículas a Marte ni una dosis real a partir de la clase de una llamarada.', 'Observed solar activity inspires the exercises. We do not predict particle arrivals at Mars or calculate real radiation doses from a flare class.'))}
        ${sello(L('DEL JUEGO', 'GAME RULE'), 'juego', L('Números simplificados', 'Simplified numbers'),
          L(`Cuánta radiación da cada llamarada, cuánto protege el regolito y el límite de ${R.limiteMision} mSv de esta misión son números del juego, para que se entienda rápido. En la vida real, la NASA permite como máximo ${R.limiteCarreraNASA.valor} mSv en toda la carrera de un astronauta.`,
            `How much radiation each flare gives, how much the regolith protects and the ${R.limiteMision} mSv limit of this mission are game numbers, so it is quick to understand. In real life, NASA allows at most ${R.limiteCarreraNASA.valor} mSv over an astronaut's whole career.`))}
      </div>
      <button class="btn-grande" id="btnCerrarDatos">${L('Volver a la base', 'Back to the base')}</button>`, 'ancho');
    $('#btnCerrarDatos').onclick = cerrar;
  };
  redibujarModal = dibujar;
  dibujar();
}
