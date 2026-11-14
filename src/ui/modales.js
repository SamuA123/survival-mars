// Modales: inicio, emergencias con cuenta regresiva, resumen del sol, final y fuentes NASA.
import { MISION, RECURSOS } from '../sim/config.js';
import { pedirAyuda, r1, CLIMA, enTormenta, enConjuncion } from '../sim/motor.js';
import { DATOS } from '../data/datos-curiosos.js';
import { FUENTES } from '../data/fuentes.js';
import { SITIO } from '../data/sitio.js';
import { RADIACION } from '../data/radiacion.js';
import { beep } from './sonido.js';

const $ = s => document.querySelector(s);
export const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function abrir(html, clase = '') {
  $('#modalCaja').className = 'modal-caja ' + clase;
  $('#modalCaja').innerHTML = html;
  $('#modal').classList.remove('oculto');
}
export const cerrar = () => $('#modal').classList.add('oculto');

const fuenteChip = clave => FUENTES[clave] ? `<a class="fuente" href="${FUENTES[clave].url}" target="_blank" rel="noopener">Fuente: ${FUENTES[clave].nombre}</a>` : '';
const estudioChip = h => h.url ? `<a class="fuente" href="${h.url}" target="_blank" rel="noopener">Estudio NASA ${h.estudio || 'OSDR'} ↗</a>` : fuenteChip(h.fuente);

// El clima carga después de abrir la pantalla de inicio: main.js llama a esto cuando llega DONKI.
const textoClima = () => `${CLIMA.real ? '🛰️' : '📚'} <b>Clima espacial:</b> ${CLIMA.resumen}<br>
  <small>Datos de NASA DONKI. ¡La actividad real del Sol cambia qué tan arriesgada es tu misión!</small>`;
export function refrescarClimaInicio() { const el = document.querySelector('#climaInicio'); if (el) el.innerHTML = textoClima(); }

// ------------------------------------------------------------------
export function pantallaInicio() {
  return new Promise(res => {
    abrir(`
      <div class="intro">
        <div class="logo">🔴</div>
        <h1>Survival Mars</h1>
        <p class="sub">Entrenador de Misiones para Astronautas Junior</p>
        <p>${SITIO.texto}</p>
        <p>Eres comandante de la base. Mantén a tu tripulación a salvo durante <b>${MISION.maxSol} sols</b>
          (días marcianos) y consigue ciencia hasta que llegue la nave de relevo.</p>
        <label class="nombre">¿Cómo te llamas, comandante?<input id="inNombre" maxlength="16" placeholder="Tu nombre" autocomplete="off"></label>
        <div class="como">
          <div>👆<b>Toca un edificio</b><small>y reparte la energía</small></div>
          <div>⚖️<b>Nada es gratis</b><small>todo cuesta energía, oxígeno o radiación</small></div>
          <div>⏱️<b>10 segundos</b><small>para decidir en una emergencia</small></div>
        </div>
        <div class="clima-box" id="climaInicio">${textoClima()}</div>
        <button class="btn-grande" id="btnEmpezar">¡Comenzar misión! 🚀</button>
        <p class="controles">🖱️ Arrastra para moverte · Rueda para zoom · Clic derecho para girar</p>
      </div>`, 'ancho');
    $('#btnEmpezar').onclick = () => { beep(880, 0.1); const n = $('#inNombre').value.trim(); cerrar(); res(n || 'Comandante'); };
  });
}

// ------------------------------------------------------------------
let cuenta = null;
export function mostrarEvento(S, ev) {
  return new Promise(res => {
    beep(ev.tiempo ? 520 : 880, 0.25, 'triangle');
    const tiempo = ev.tiempo || 0;
    const ops = ev.opciones.map((o, i) => {
      const ok = !o.disponible || o.disponible(S);
      const det = typeof o.detalle === 'function' ? o.detalle(S) : (o.detalle || '');
      return `<button class="opcion" data-op="${i}" ${ok ? '' : 'disabled'}><span>${o.texto}</span>${det ? `<small>${ok ? det : 'No disponible'}</small>` : ''}</button>`;
    }).join('');
    abrir(`
      <div class="evento">
        <div class="ev-cab">
          <div class="ev-icono">${ev.icono}</div><h2>${ev.titulo}</h2>
          ${tiempo ? `<div class="reloj" id="reloj"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle id="relojArco" cx="20" cy="20" r="17"/></svg><b id="relojNum">${tiempo}</b></div>` : ''}
        </div>
        <p>${ev.texto(S)}</p>
        <div class="opciones">${ops}</div>
        ${ev.consejo ? `<button class="btn-ayuda" id="btnAyuda">📞 Pedir ayuda a Control de Misión</button><div id="ayuda" class="ayuda"></div>` : ''}
        <div id="resultado"></div>
      </div>`, tiempo ? 'urgente' : '');

    let restante = tiempo, hecho = false;
    const terminar = txt => {
      if (hecho) return; hecho = true;
      clearInterval(cuenta);
      $('#modalCaja').classList.remove('urgente');
      document.querySelectorAll('.opcion, #btnAyuda').forEach(b => b.disabled = true);
      $('#resultado').innerHTML = `<div class="res">${txt}</div><button class="btn-grande" id="btnSeguir">Continuar ▶</button>`;
      $('#btnSeguir').onclick = () => { cerrar(); res(txt); };
    };
    document.querySelectorAll('.opcion').forEach(b => b.onclick = () => { beep(990, 0.08); terminar(ev.opciones[+b.dataset.op].efecto(S)); });
    const ay = $('#btnAyuda');
    if (ay) ay.onclick = () => { ay.disabled = true; $('#ayuda').innerHTML = pedirAyuda(S, ev); };
    if (tiempo) {
      const arco = $('#relojArco'), L = 2 * Math.PI * 17;
      arco.style.strokeDasharray = L;
      cuenta = setInterval(() => {
        restante--;
        $('#relojNum').textContent = restante;
        arco.style.strokeDashoffset = L * (1 - restante / tiempo);
        beep(restante <= 3 ? 880 : 660, 0.06);
        if (restante <= 3) $('#reloj').classList.add('rojo');
        if (restante <= 0) { beep(200, 0.4, 'sawtooth'); terminar('⏰ <b>¡Se acabó el tiempo!</b> ' + ev.alAgotarse(S)); }
      }, 1000);
    }
  });
}

// ------------------------------------------------------------------
export function mostrarResumen(S, antes, r, fin) {
  return new Promise(res => {
    // Solo se muestra lo que cambió: un niño no necesita leer seis "＝".
    const filas = [...RECURSOS, { id: 'ciencia', nombre: 'Ciencia', icono: '🔬' }].map(rc => {
      const d = r1(S[rc.id] - antes[rc.id]);
      if (d === 0) return '';
      const bueno = rc.inverso ? d < 0 : d > 0;
      return `<div class="delta ${bueno ? 'bien' : 'mal'}">${rc.icono}<b>${d > 0 ? '+' + d : d}</b></div>`;
    }).join('');
    // Una sola tarjeta de aprendizaje: si hay un estudio real relacionado, gana al dato curioso.
    const dato = r.dato && DATOS[r.dato];
    const aprende = r.hallazgo
      ? `<div class="dato salud">🧬 <b>Ciencia real:</b> ${r.hallazgo.texto} ${estudioChip(r.hallazgo)}</div>`
      : dato ? `<div class="dato">💡 <b>¿Sabías que…?</b> ${dato.texto} ${fuenteChip(dato.fuente)}</div>` : '';
    const boton = fin ? (fin.gano ? '¡Llegó la nave de relevo! 🚀' : 'Ver qué pasó…') : 'Siguiente sol ▶';
    abrir(`
      <h2>🌅 Resumen del sol ${S.sol}</h2>
      ${filas ? `<div class="deltas">${filas}</div>` : ''}
      ${r.lineas.length ? `<ul class="lineas">${r.lineas.map(l => `<li>${l}</li>`).join('')}</ul>` : '<p class="tranqui">Un sol tranquilo. ¡Todo funcionó!</p>'}
      ${bloqueRecolectado(r)}
      ${aprende}
      <button class="btn-grande" id="btnSig">${boton}</button>`);
    $('#btnSig').onclick = () => { cerrar(); res(); };
  });
}

// ------------------------------------------------------------------
export function mostrarResumenEVA(res, lineas) {
  return new Promise(ok => {
    abrir(`
      <div class="ev-cab"><div class="ev-icono">${res.rescate ? '🆘' : '🧑‍🚀'}</div>
        <h2>${res.rescate ? '¡Rescate!' : '¡De vuelta en la base!'}</h2></div>
      <ul class="lineas">${lineas.map(l => `<li>${l}</li>`).join('')}</ul>
      <div class="dato">💡 <b>¿Sabías que…?</b> ${DATOS.eva.texto} En Marte, cada minuto afuera es una decisión:
        más tiempo = más descubrimientos, pero también más radiación y menos oxígeno. ${fuenteChip(DATOS.eva.fuente)}</div>
      <button class="btn-grande" id="btnEvaOk">Continuar ▶</button>`);
    $('#btnEvaOk').onclick = () => { cerrar(); ok(); };
  });
}

// ------------------------------------------------------------------
export function pantallaFinal(S, fin) {
  return new Promise(res => {
    const aprendidos = S.aprendidos.map(k => `<li>${DATOS[k].texto}</li>`).join('');
    const e = fin.estrellas || 0;
    abrir(`
      <div class="final">
        <div class="logo">${fin.gano ? '🚀' : fin.icono}</div>
        <h1>${fin.gano ? '¡Misión cumplida!' : '¡Misión abortada!'}</h1>
        <p>${fin.gano
          ? `Comandante <b>${escapar(S.nombre)}</b>: tu tripulación sobrevivió ${MISION.maxSol} sols en Marte.`
          : `${fin.texto} La tripulación volvió a la Tierra en el Sol ${S.sol}. ¡Los verdaderos planificadores de la NASA también aprenden de cada problema!`}</p>
        ${fin.gano ? `<div class="estrellas">${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}</div>
          <small class="criterios">⭐ Sobrevivir · ⭐ Lograr ${MISION.metaCiencia} de ciencia · ⭐ Lograrlo sin arriesgar a la tripulación (radiación &lt; ${MISION.radLimite / 2} mSv y salud ≥ 70)</small>
          ${S.ciencia < MISION.metaCiencia ? `<p class="tranqui">Sobrevivieron, pero la misión vino a Marte a hacer ciencia. ¿Puedes conseguir ${MISION.metaCiencia} puntos sin arriesgar a nadie?</p>` : ''}` : ''}
        <div class="final-stats">🫁 ${S.o2}% · 🥔 ${S.comida}% · ☢️ ${S.rad} mSv · 🔬 ${S.ciencia} ciencia</div>
        <div class="final-inv">🎒 Recolectaste en Marte: ${filasInventario(S.inventario.total)}
          <br>📋 Planes del sol cumplidos: <b>${S.planesCumplidos}</b> de ${S.planesEnviados}</div>
        <h3>🧠 Lo que aprendiste (${S.aprendidos.length})</h3>
        <ul class="aprendidos">${aprendidos}</ul>
        <button class="btn-grande" id="btnOtra">Jugar otra vez 🔄</button>
      </div>`, 'ancho');
    beep(fin.gano ? 1046 : 220, 0.5, 'triangle');
    $('#btnOtra').onclick = () => { cerrar(); res(); };
  });
}

// ------------------------------------------------------------------
// ------------------------------------------------------------------
//  INVENTARIO de lo recolectado en Marte
// ------------------------------------------------------------------
const OBJ = MISION.eva.objetos;
const filasInventario = inv => Object.entries(OBJ).map(([k, o]) => `<b>${inv[k]}</b> ${o.icono} ${o.nombre}`).join(' · ');

function bloqueRecolectado(r) {
  const total = Object.values(r.recolectado || {}).reduce((a, b) => a + b, 0);
  const p = r.plan;
  let plan = '';
  if (p) {
    const o = OBJ[p.tipo];
    plan = p.cumplido
      ? `<div class="plan-res ok">📋 Plan del sol: ${p.cantidad} ${o.icono} ${o.nombre} → ✅ <b>¡Cumplido!</b> Bono recibido.</div>`
      : `<div class="plan-res">📋 Plan del sol: ${p.cantidad} ${o.icono} ${o.nombre} → trajiste ${p.logrado}. No pasa nada: mañana habrá otro plan. 🙂</div>`;
  }
  // Si no salió a explorar, no se le recuerda cada sol lo que no hizo: el pedido era opcional.
  if (!total && !p?.cumplido) return '';
  return `<div class="recolectado"><b>🎒 Recolectado hoy:</b> ${total ? filasInventario(r.recolectado) : 'nada (no saliste o volviste con las manos vacías)'}${plan}</div>`;
}

// Tarea del día: el pedido de Control de Misión, por qué lo pide y qué es lo que hay que traer (dato real).
export function panelTarea(S) {
  const p = S.plan, o = p && OBJ[p.tipo];
  const sinTarea = enTormenta(S) ? '🌪️ Hoy no hay tarea: con tormenta de polvo nadie puede salir.'
    : enConjuncion(S) ? '🌞 El Sol está entre Marte y la Tierra: hoy no llegó ningún mensaje.'
    : S.niveles.radio === 0 ? '📡 Control de Misión envió una tarea… pero la antena está apagada. Enciéndela en la consola.'
    : 'Hoy no hay tarea.';
  let cuerpo;
  if (!p) cuerpo = `<p class="tarea-motivo">${sinTarea}</p>`;
  else {
    const hecho = Math.min(S.inventario.hoy[p.tipo], p.cantidad);
    cuerpo = `
      <p class="tarea-de">📡 Control de Misión <small>(mensaje con ${MISION.delayMin} min de retraso)</small></p>
      <div class="tarea-pedido" style="--c:${o.color}">
        <span class="tarea-ic">${o.icono}</span>
        <div><b>Trae ${p.cantidad} ${o.nombre.toLowerCase()}</b><small>${p.motivo}</small></div>
        <div class="tarea-prog">${Array.from({ length: p.cantidad }, (_, i) => `<i class="${i < hecho ? 'on' : ''}">${o.icono}</i>`).join('')}</div>
      </div>
      <p class="tarea-que"><b>¿Qué es?</b> ${o.que}</p>
      <p class="tarea-que"><b>¿Para qué sirve?</b> ${o.uso}</p>
      ${p.cumplido
        ? '<p class="plan-res ok">✅ ¡Cumplida! La tripulación recibió el premio.</p>'
        : `<p class="plan-res">Es opcional. Premio: +${MISION.plan.bono.ciencia} ciencia y +${MISION.plan.bono.salud} salud. Pero salir cuesta oxígeno y radiación: tú decides si vale la pena.</p>`}`;
  }
  abrir(`
    <div class="monitor-cab"><span class="led"></span>Tarea del día · Sol ${S.sol}</div>
    ${cuerpo}
    <div class="tarea-mision">Tareas cumplidas en la misión: <b>${S.planesCumplidos}</b> de ${S.planesEnviados}</div>
    <button class="btn-grande" id="btnCerrarTarea">Entendido</button>`, 'monitor');
  $('#btnCerrarTarea').onclick = cerrar;
}

// ¿Qué es real? Cada fuente lleva un sello que dice qué papel juega: cambia la partida, la explica, o es del juego.
export function panelDatos() {
  const vivo = CLIMA.real && !CLIMA.tranquilo;
  const llamaradas = (CLIMA.flares || []).slice(0, 6).map(f => `<li><b>${f.clase}</b> · ${f.fecha}</li>`).join('');
  const sello = (estampa, clase, titulo, texto, url) => `
    <${url ? `a href="${url}" target="_blank" rel="noopener"` : 'div'} class="sello">
      <span class="estampa ${clase}">${estampa}</span><div><b>${titulo}</b><small>${texto}</small></div></${url ? 'a' : 'div'}>`;
  const R = RADIACION, max = R.marteSuperficie.valor;
  const barra = (nombre, v, txt) => `<div><span>${nombre}</span><div class="barra"><div style="width:${Math.max(1.5, v / max * 100)}%"></div></div><b>${txt}</b></div>`;
  const mecanicas = Object.entries(FUENTES).filter(([, f]) => f.papel === 'mecanica');
  const textos = Object.entries(FUENTES).filter(([, f]) => f.papel !== 'mecanica');
  abrir(`
    <h2>¿Qué es real en este juego?</h2>
    <p class="real-intro">Tú inventas las decisiones. La NASA pone las reglas del mundo.</p>
    <div class="sellos">
      ${sello(vivo ? 'EN VIVO' : 'HISTÓRICO', vivo ? 'vivo' : 'mecanica', 'Las llamaradas solares de tu partida',
        `${CLIMA.resumen}.${vivo ? '' : ' Son llamaradas que de verdad ocurrieron, guardadas en el juego.'}<ul class="flares">${llamaradas}</ul>`, FUENTES.donki.url)}
      ${mecanicas.filter(([k]) => k !== 'donki').map(([, f]) => sello('CAMBIA TU PARTIDA', 'mecanica', f.nombre, f.uso, f.url)).join('')}
      ${sello('COMPARA', 'texto', 'Radiación en un día', `
        <div class="comparar">
          ${barra('Marte (Curiosity)', R.marteSuperficie.valor, '0,67 mSv')}
          ${barra('Tierra', R.tierra.valor, '0,007 mSv')}
        </div>${R.estacionEspacial.texto}`, FUENTES.radlab.url)}
      ${textos.filter(([k]) => k !== 'radlab').map(([, f]) => sello('TE LO EXPLICA', 'texto', f.nombre, f.uso, f.url)).join('')}
      ${sello('DEL JUEGO', 'juego', 'Números simplificados',
        `Cuánta radiación da cada llamarada, cuánto protege el regolito y el límite de ${R.limiteMision} mSv de esta misión son números del juego, para que se entienda rápido. En la vida real, la NASA permite como máximo ${R.limiteCarreraNASA.valor} mSv en toda la carrera de un astronauta.`)}
    </div>
    <button class="btn-grande" id="btnCerrarDatos">Volver a la base</button>`, 'ancho');
  $('#btnCerrarDatos').onclick = cerrar;
}
