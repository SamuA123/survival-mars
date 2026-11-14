// Modales: inicio, emergencias con cuenta regresiva, resumen del sol, final y fuentes NASA.
import { MISION, RECURSOS } from '../sim/config.js';
import { pedirAyuda, r1, CLIMA } from '../sim/motor.js';
import { DATOS } from '../data/datos-curiosos.js';
import { FUENTES } from '../data/fuentes.js';
import { SITIO } from '../data/sitio.js';
import { beep } from './sonido.js';
import { evaluarLogros, logrosHTML } from './logros.js';
import { informeHTML } from './informe.js';

const $ = s => document.querySelector(s);
export const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function abrir(html, clase = '') {
  $('#modalCaja').className = 'modal-caja ' + clase;
  $('#modalCaja').innerHTML = html;
  $('#modal').classList.remove('oculto');
}
export const cerrar = () => $('#modal').classList.add('oculto');

const fuenteChip = clave => FUENTES[clave] ? `<a class="fuente" href="${FUENTES[clave].url}" target="_blank" rel="noopener">Fuente: ${FUENTES[clave].nombre}</a>` : '';

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
        <div class="clima-box">${CLIMA.real ? '🛰️' : '📚'} <b>Clima espacial:</b> ${CLIMA.resumen}<br>
          <small>Datos de NASA DONKI. ¡La actividad real del Sol cambia qué tan arriesgada es tu misión!</small></div>
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
    const filas = [...RECURSOS, { id: 'ciencia', nombre: 'Ciencia', icono: '🔬' }].map(rc => {
      const d = r1(S[rc.id] - antes[rc.id]);
      const bueno = rc.inverso ? d <= 0 : d >= 0;
      return `<div class="delta ${d === 0 ? '' : bueno ? 'bien' : 'mal'}"><span>${rc.icono} ${rc.nombre}</span><b>${d === 0 ? '＝' : d > 0 ? '▲ +' + d : '▼ ' + d}</b></div>`;
    }).join('');
    const dato = r.dato && DATOS[r.dato];
    const boton = fin ? (fin.gano ? '¡Llegó la nave de relevo! 🚀' : 'Ver qué pasó…') : 'Siguiente sol ▶';
    abrir(`
      <h2>🌅 Amanece el Sol ${S.sol + (fin ? 0 : 1)} — resumen del Sol ${S.sol}</h2>
      <div class="deltas">${filas}</div>
      ${r.lineas.length ? `<ul class="lineas">${r.lineas.map(l => `<li>${l}</li>`).join('')}</ul>` : '<p class="tranqui">Un sol tranquilo. ¡Todo funcionó!</p>'}
      ${bloqueRecolectado(r)}
      ${r.hallazgo ? `<div class="dato salud">🧬 <b>Lo que dice la ciencia real:</b> ${r.hallazgo.texto} ${fuenteChip(r.hallazgo.fuente)}</div>` : ''}
      ${dato ? `<div class="dato">💡 <b>¿Sabías que…?</b> ${dato.texto} ${fuenteChip(dato.fuente)}</div>` : ''}
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
    const nuevos = evaluarLogros(S, fin);   // insignias (src/ui/logros.js)
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
        ${logrosHTML(nuevos)}
        ${informeHTML(S)}
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
  if (!total && !plan) return '';
  return `<div class="recolectado"><b>🎒 Recolectado hoy:</b> ${total ? filasInventario(r.recolectado) : 'nada (no saliste o volviste con las manos vacías)'}${plan}</div>`;
}

export function panelInventario(S) {
  const filas = Object.entries(OBJ).map(([k, o]) => `
    <div class="inv-fila" style="--c:${o.color}">
      <span class="inv-ic">${o.icono}</span>
      <div class="inv-txt"><b>${o.nombre}</b><small>${o.que}</small><small class="inv-uso">✅ ${o.uso}</small></div>
      <div class="inv-num"><b>${S.inventario.hoy[k]}</b><small>hoy</small></div>
      <div class="inv-num"><b>${S.inventario.total[k]}</b><small>misión</small></div>
    </div>`).join('');
  const p = S.plan, o = p && OBJ[p.tipo];
  abrir(`
    <h2>🎒 Inventario de Marte</h2>
    <p class="tranqui">Lo que tu tripulación recolectó en las caminatas espaciales. Cada cosa se usa enseguida en la base.</p>
    <div class="inv-lista">${filas}</div>
    <div class="inv-extra">🟫 Regolito guardado para el próximo nivel de blindaje: <b>${S.regolito}/${MISION.eva.regolitoPorNivel}</b> · Blindaje: <b>${S.blindaje}/3</b></div>
    ${p ? `<div class="plan-res ${p.cumplido ? 'ok' : ''}">📋 <b>Plan de hoy:</b> trae ${p.cantidad} ${o.icono} ${o.nombre} (${Math.min(S.inventario.hoy[p.tipo], p.cantidad)}/${p.cantidad}) ${p.cumplido ? '✅' : '— opcional, da bono'}</div>` : ''}
    <div class="inv-extra">📋 Planes del sol cumplidos: <b>${S.planesCumplidos}</b> de ${S.planesEnviados}</div>
    <button class="btn-grande" id="btnCerrarInv">Volver a la base</button>`, 'ancho');
  $('#btnCerrarInv').onclick = cerrar;
}

export function panelDatos() {
  const llamaradas = (CLIMA.flares || []).slice(0, 6).map(f => `<li><b>${f.clase}</b> — ${f.fecha}</li>`).join('');
  abrir(`
    <h2>📡 Datos reales de la NASA en este juego</h2>
    <div class="clima-box">${CLIMA.real ? '🛰️ <b>EN VIVO</b>' : '📚 <b>ARCHIVO HISTÓRICO</b> (sin conexión)'} — ${CLIMA.resumen}
      <ul class="flares">${llamaradas}</ul></div>
    <div class="fuentes">${Object.values(FUENTES).map(f => `
      <a class="fuente-card" href="${f.url}" target="_blank" rel="noopener"><b>${f.nombre}</b><small>${f.uso}</small></a>`).join('')}</div>
    <p class="tranqui">Los números del juego están simplificados para que sean fáciles de entender, pero se basan en estas mediciones reales.</p>
    <button class="btn-grande" id="btnCerrarDatos">Volver a la base</button>`, 'ancho');
  $('#btnCerrarDatos').onclick = cerrar;
}
