// Modales: inicio, emergencias con cuenta regresiva, resumen del sol, final y fuentes NASA.
// Textos: t() interfaz · tr() textos de src/sim · txt()/fuente*() datos con *_en (ver i18n.js).
import { MISION, RECURSOS } from '../sim/config.js';
import { pedirAyuda, r1, CLIMA } from '../sim/motor.js';
import { DATOS } from '../data/datos-curiosos.js';
import { FUENTES } from '../data/fuentes.js';
import { SITIO } from '../data/sitio.js';
import { beep } from './sonido.js';
import { evaluarLogros, logrosHTML } from './logros.js';
import { informeHTML } from './informe.js';
import { t, tr, txt, fuenteNombre, fuenteUso } from './i18n.js';

const $ = s => document.querySelector(s);
export const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function abrir(html, clase = '') {
  $('#modalCaja').className = 'modal-caja ' + clase;
  $('#modalCaja').innerHTML = html;
  $('#modal').classList.remove('oculto');
}
export const cerrar = () => $('#modal').classList.add('oculto');

const fuenteChip = clave => FUENTES[clave] ? `<a class="fuente" href="${FUENTES[clave].url}" target="_blank" rel="noopener">${t('fuente')} ${fuenteNombre(FUENTES[clave])}</a>` : '';

// ------------------------------------------------------------------
export function pantallaInicio() {
  return new Promise(res => {
    abrir(`
      <div class="intro">
        <div class="logo">🔴</div>
        <h1>Survival Mars</h1>
        <p class="sub">${t('intro.sub')}</p>
        <p>${txt(SITIO)}</p>
        <p>${t('intro.p2', { sols: MISION.maxSol })}</p>
        <label class="nombre">${t('intro.nombre')}<input id="inNombre" maxlength="16" placeholder="${t('intro.ph')}" autocomplete="off"></label>
        <div class="como">
          <div>👆<b>${t('intro.c1b')}</b><small>${t('intro.c1s')}</small></div>
          <div>⚖️<b>${t('intro.c2b')}</b><small>${t('intro.c2s')}</small></div>
          <div>⏱️<b>${t('intro.c3b', { s: 10 })}</b><small>${t('intro.c3s')}</small></div>
        </div>
        <div class="clima-box">${CLIMA.real ? '🛰️' : '📚'} <b>${t('intro.clima')}</b> ${tr(CLIMA.resumen)}<br>
          <small>${t('intro.climaSub')}</small></div>
        <button class="btn-grande" id="btnEmpezar">${t('intro.empezar')}</button>
        <p class="controles">${t('intro.controles')}</p>
      </div>`, 'ancho');
    $('#btnEmpezar').onclick = () => { beep(880, 0.1); const n = $('#inNombre').value.trim(); cerrar(); res(n || t('intro.defecto')); };
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
      return `<button class="opcion" data-op="${i}" ${ok ? '' : 'disabled'}><span>${tr(o.texto)}</span>${det ? `<small>${ok ? tr(det) : t('ev.noDisp')}</small>` : ''}</button>`;
    }).join('');
    abrir(`
      <div class="evento">
        <div class="ev-cab">
          <div class="ev-icono">${ev.icono}</div><h2>${tr(ev.titulo)}</h2>
          ${tiempo ? `<div class="reloj" id="reloj"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle id="relojArco" cx="20" cy="20" r="17"/></svg><b id="relojNum">${tiempo}</b></div>` : ''}
        </div>
        <p>${tr(ev.texto(S))}</p>
        <div class="opciones">${ops}</div>
        ${ev.consejo ? `<button class="btn-ayuda" id="btnAyuda">${t('ev.ayuda')}</button><div id="ayuda" class="ayuda"></div>` : ''}
        <div id="resultado"></div>
      </div>`, tiempo ? 'urgente' : '');

    let restante = tiempo, hecho = false;
    // txt queda en español (lo usan la simulación y el registro); en pantalla se muestra traducido
    const terminar = txtRes => {
      if (hecho) return; hecho = true;
      clearInterval(cuenta);
      $('#modalCaja').classList.remove('urgente');
      document.querySelectorAll('.opcion, #btnAyuda').forEach(b => b.disabled = true);
      $('#resultado').innerHTML = `<div class="res">${tr(txtRes)}</div><button class="btn-grande" id="btnSeguir">${t('continuar')}</button>`;
      $('#btnSeguir').onclick = () => { cerrar(); res(txtRes); };
    };
    document.querySelectorAll('.opcion').forEach(b => b.onclick = () => { beep(990, 0.08); terminar(ev.opciones[+b.dataset.op].efecto(S)); });
    const ay = $('#btnAyuda');
    if (ay) ay.onclick = () => { ay.disabled = true; $('#ayuda').innerHTML = tr(pedirAyuda(S, ev)); };
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
    const filas = [...RECURSOS, { id: 'ciencia', nombre: t('rec.ciencia'), icono: '🔬' }].map(rc => {
      const d = r1(S[rc.id] - antes[rc.id]);
      const bueno = rc.inverso ? d <= 0 : d >= 0;
      return `<div class="delta ${d === 0 ? '' : bueno ? 'bien' : 'mal'}"><span>${rc.icono} ${tr(rc.nombre)}</span><b>${d === 0 ? '＝' : d > 0 ? '▲ +' + d : '▼ ' + d}</b></div>`;
    }).join('');
    const dato = r.dato && DATOS[r.dato];
    const boton = fin ? (fin.gano ? t('res.gano') : t('res.perdio')) : t('res.sig');
    abrir(`
      <h2>${t('res.titulo', { a: S.sol + (fin ? 0 : 1), s: S.sol })}</h2>
      <div class="deltas">${filas}</div>
      ${r.lineas.length ? `<ul class="lineas">${r.lineas.map(l => `<li>${tr(l)}</li>`).join('')}</ul>` : `<p class="tranqui">${t('res.tranqui')}</p>`}
      ${bloqueRecolectado(r)}
      ${r.hallazgo ? `<div class="dato salud">${t('res.ciencia')} ${txt(r.hallazgo)} ${fuenteChip(r.hallazgo.fuente)}</div>` : ''}
      ${dato ? `<div class="dato">${t('res.sabias')} ${txt(dato)} ${fuenteChip(dato.fuente)}</div>` : ''}
      <button class="btn-grande" id="btnSig">${boton}</button>`);
    $('#btnSig').onclick = () => { cerrar(); res(); };
  });
}

// ------------------------------------------------------------------
export function mostrarResumenEVA(res, lineas) {
  return new Promise(ok => {
    abrir(`
      <div class="ev-cab"><div class="ev-icono">${res.rescate ? '🆘' : '🧑‍🚀'}</div>
        <h2>${res.rescate ? t('eva.rescate') : t('eva.vuelta')}</h2></div>
      <ul class="lineas">${lineas.map(l => `<li>${tr(l)}</li>`).join('')}</ul>
      <div class="dato">${t('res.sabias')} ${txt(DATOS.eva)} ${t('eva.sabiasExtra')} ${fuenteChip(DATOS.eva.fuente)}</div>
      <button class="btn-grande" id="btnEvaOk">${t('continuar')}</button>`);
    $('#btnEvaOk').onclick = () => { cerrar(); ok(); };
  });
}

// ------------------------------------------------------------------
export function pantallaFinal(S, fin) {
  return new Promise(res => {
    const aprendidos = S.aprendidos.map(k => `<li>${txt(DATOS[k])}</li>`).join('');
    const e = fin.estrellas || 0;
    const nuevos = evaluarLogros(S, fin);   // insignias (src/ui/logros.js)
    abrir(`
      <div class="final">
        <div class="logo">${fin.gano ? '🚀' : fin.icono}</div>
        <h1>${fin.gano ? t('fin.cumplida') : t('fin.abortada')}</h1>
        <p>${fin.gano
          ? t('fin.gano', { n: escapar(S.nombre), s: MISION.maxSol })
          : t('fin.perdio', { t: tr(fin.texto), s: S.sol })}</p>
        ${fin.gano ? `<div class="estrellas">${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}</div>
          <small class="criterios">${t('fin.criterios', { c: MISION.metaCiencia, r: MISION.radLimite / 2 })}</small>
          ${S.ciencia < MISION.metaCiencia ? `<p class="tranqui">${t('fin.pocaCiencia', { c: MISION.metaCiencia })}</p>` : ''}` : ''}
        <div class="final-stats">🫁 ${S.o2}% · 🥔 ${S.comida}% · ☢️ ${S.rad} mSv · 🔬 ${S.ciencia} ${t('fin.ciencia')}</div>
        <div class="final-inv">${t('fin.recolectaste')} ${filasInventario(S.inventario.total)}
          <br>${t('fin.planes', { a: S.planesCumplidos, b: S.planesEnviados })}</div>
        ${logrosHTML(nuevos)}
        ${informeHTML(S)}
        <h3>${t('fin.aprendiste', { n: S.aprendidos.length })}</h3>
        <ul class="aprendidos">${aprendidos}</ul>
        <button class="btn-grande" id="btnOtra">${t('fin.otra')}</button>
      </div>`, 'ancho');
    beep(fin.gano ? 1046 : 220, 0.5, 'triangle');
    $('#btnOtra').onclick = () => { cerrar(); res(); };
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
  if (!total && !plan) return '';
  return `<div class="recolectado"><b>${t('inv.hoyTit')}</b> ${total ? filasInventario(r.recolectado) : t('inv.hoyNada')}${plan}</div>`;
}

export function panelInventario(S) {
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
    <div class="inv-extra">${t('inv.regolito', { r: S.regolito, n: MISION.eva.regolitoPorNivel, b: S.blindaje })}</div>
    ${p ? `<div class="plan-res ${p.cumplido ? 'ok' : ''}">${t('inv.planHoy', { c: p.cantidad, i: o.icono, n: tr(o.nombre), h: Math.min(S.inventario.hoy[p.tipo], p.cantidad) })} ${p.cumplido ? '✅' : t('inv.opcional')}</div>` : ''}
    <div class="inv-extra">${t('fin.planes', { a: S.planesCumplidos, b: S.planesEnviados })}</div>
    <button class="btn-grande" id="btnCerrarInv">${t('volver')}</button>`, 'ancho');
  $('#btnCerrarInv').onclick = cerrar;
}

export function panelDatos() {
  const llamaradas = (CLIMA.flares || []).slice(0, 6).map(f => `<li><b>${f.clase}</b> — ${f.fecha}</li>`).join('');
  abrir(`
    <h2>${t('datos.tit')}</h2>
    <div class="clima-box">${CLIMA.real ? t('datos.vivo') : t('datos.archivo')} — ${tr(CLIMA.resumen)}
      <ul class="flares">${llamaradas}</ul></div>
    <div class="fuentes">${Object.values(FUENTES).map(f => `
      <a class="fuente-card" href="${f.url}" target="_blank" rel="noopener"><b>${fuenteNombre(f)}</b><small>${fuenteUso(f)}</small></a>`).join('')}</div>
    <p class="tranqui">${t('datos.nota')}</p>
    <button class="btn-grande" id="btnCerrarDatos">${t('volver')}</button>`, 'ancho');
  $('#btnCerrarDatos').onclick = cerrar;
}
