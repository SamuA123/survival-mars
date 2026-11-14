// Arranque y flujo del juego: une simulación + mundo 3D + interfaz.
import { Mundo } from './world3d/mundo.js';
import {
  crearPartida, iniciarSol, elegirEvento, simularSol, finDePartida, EVENTOS, ACCIONES,
  cambiarNivel, aprender, foto, setClima, enConjuncion, CLIMA, motivoNoEVA, iniciarEVA, terminarEVA,
} from './sim/motor.js';
import { MISION } from './sim/config.js';
import { mostrarHUDEVA, actualizarHUDEVA, avisoEVA, ocultarHUDEVA, tarjetaObjeto } from './ui/eva-hud.js';
import { cargarClimaEspacial } from './data/donki.js';
import { renderRecursos, renderEnergia, renderPanel, renderLog } from './ui/hud.js';
import { pantallaInicio, mostrarEvento, mostrarResumen, mostrarResumenEVA, pantallaFinal, panelDatos } from './ui/modales.js';
import { beep, audio } from './ui/sonido.js';
import { iniciarTutorial, tutorialVisto } from './ui/tutorial.js';

const $ = s => document.querySelector(s);
let S = crearPartida();
let sel = null;
let ocupado = false;
let tutorial = null;

const mundo = new Mundo($('#mundo'), { onSeleccion: id => { sel = id; if (id) beep(760, 0.05); refrescar(); } });
mundo.setEstado(() => S);
// Acceso para depurar desde la consola del navegador: juego.S, juego.mundo
window.juego = { mundo, get S() { return S; }, refrescar: () => refrescar() };

function refrescar() {
  S.conjuncion = enConjuncion(S);
  renderRecursos(S);
  renderEnergia(S);
  renderPanel(S, sel);
  renderLog(S);
  $('#btnSol').disabled = ocupado;
}

// Clics en el panel (niveles, acciones, selección)
document.addEventListener('click', e => {
  if (ocupado) return;
  const t = e.target.closest('[data-sis],[data-accion],[data-sel]');
  if (!t) return;
  if (t.dataset.sis) { cambiarNivel(S, t.dataset.sis, +t.dataset.d); beep(+t.dataset.d > 0 ? 880 : 440, 0.05); }
  else if (t.dataset.accion === 'eva') { return salirAExplorar(); }
  else if (t.dataset.accion) { ACCIONES[t.dataset.accion].hacer(S); beep(700, 0.06); }
  else if ('sel' in t.dataset) { mundo.seleccionar(t.dataset.sel || null); return; }
  refrescar();
});

async function terminarSol() {
  if (ocupado) return;
  if (tutorial?.activo()) tutorial.terminar();
  ocupado = true;
  mundo.seleccionar(null);
  refrescar();

  const antes = foto(S);
  const id = elegirEvento(S);
  S.ultimoEvento = id;
  let ev = null, res = null;
  if (id) {
    ev = EVENTOS[id];
    ev.inicio?.(S);
    if (ev.fx) mundo.efecto(ev.fx);
    refrescar();
    res = await mostrarEvento(S, ev);
    aprender(S, ev.dato);
    refrescar();
  }

  await mundo.pasarSol();
  const r = simularSol(S, res, ev);
  const fin = finDePartida(S);
  refrescar();
  await mostrarResumen(S, antes, r, fin);

  if (fin) {
    await pantallaFinal(S, fin);
    return nuevaPartida();
  }
  S.sol++;
  iniciarSol(S);
  ocupado = false;
  refrescar();
}

// ---------------------------------------------------------------------
//  CAMINATA ESPACIAL: el jugador controla a un astronauta
// ---------------------------------------------------------------------
function salirAExplorar() {
  if (ocupado || motivoNoEVA(S)) return;
  if (tutorial?.activo()) tutorial.terminar();
  ocupado = true;
  iniciarEVA(S);
  beep(600, 0.15, 'triangle');
  refrescar();
  const E = MISION.eva;
  mostrarHUDEVA(mundo.eva);
  mundo.eva.iniciar({
    o2PorSeg: E.o2TrajePorSeg, radPorSeg: E.radPorSeg, multLlamarada: E.multLlamarada,
    riesgo: CLIMA.riesgo, eficienciaPaneles: S.eficiencia,
    onUpdate: actualizarHUDEVA,
    onAviso: txt => { avisoEVA(txt); beep(300, 0.3, 'sawtooth'); },
    onRecoger: tipo => { beep(1200, 0.07, 'triangle'); tarjetaObjeto(tipo); },
    onFin: async res => {
      ocultarHUDEVA();
      const lineas = terminarEVA(S, res);
      refrescar();
      await mostrarResumenEVA(res, lineas);
      const fin = finDePartida(S);   // ¿la radiación o la salud llegaron al límite?
      if (fin && !fin.gano) { await pantallaFinal(S, fin); return nuevaPartida(); }
      ocupado = false;
      refrescar();
    },
  });
}

async function nuevaPartida() {
  ocupado = true;
  S = crearPartida();
  refrescar();
  const nombre = await pantallaInicio();
  S = crearPartida(nombre);
  S.log.unshift({ sol: 1, texto: `🚀 Comandante <b>${nombre.replace(/[<>&]/g, '')}</b> al mando de la base en el cráter Jezero.`, tipo: 'tierra' });
  iniciarSol(S);
  ocupado = false;
  refrescar();
  if (!tutorialVisto()) tutorial = iniciarTutorial(() => ({ S, sel }));
}

$('#btnSol').onclick = terminarSol;
$('#btnDatos').onclick = panelDatos;
$('#btnSonido').onclick = () => { audio.on = !audio.on; $('#btnSonido').textContent = audio.on ? '🔊' : '🔇'; };
$('#btnAyudaTuto').onclick = () => { if (!ocupado && !tutorial?.activo()) tutorial = iniciarTutorial(() => ({ S, sel })); };
$('#btnLog').onclick = () => $('#bitacoraBox').classList.toggle('abierta');

refrescar();
cargarClimaEspacial().then(c => { setClima(c); refrescar(); });
nuevaPartida();
