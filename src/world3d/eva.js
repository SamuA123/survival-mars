// =====================================================================
//  CAMINATA ESPACIAL (EVA): el jugador controla un astronauta.
//  WASD / flechas para moverse · E para entrar o limpiar · joystick táctil.
//  Cada segundo afuera gasta oxígeno del traje y suma radiación.
// =====================================================================
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { alturaSuelo } from './terreno.js';
import { empujarFuera } from './colisiones.js';
import { MISION } from '../sim/config.js';
import { proteccionHabitat } from '../sim/motor.js';
import { tr, onIdioma } from '../ui/i18n.js';   // i18n no importa nada del mundo 3D: sin ciclos

// Botón ES/EN en plena caminata: los nombres sobre los objetos cambian al momento
onIdioma(() => document.querySelectorAll('.obj-nom[data-es]').forEach(s => { s.textContent = tr(s.dataset.es); }));

export const PUERTA = new THREE.Vector3(0, 0, 6.4);
const PANELES = new THREE.Vector3(-13, 0, 4);
const RADIO_MAX = 76;
const VELOCIDAD = 7.5;
const RADIO_JUGADOR = 0.6;

// Lo más valioso está más lejos de la base → hay que arriesgar más.
// Nombre, ícono, color y explicación vienen de MISION.eva.objetos (src/sim/config.js).
const O = MISION.eva.objetos;
export const TIPOS = {
  regolito: { ...O.regolito, hex: 0xff8a3d, rMin: 14, rMax: 30, n: 4 },
  hielo:    { ...O.hielo,    hex: 0x9be7ff, rMin: 24, rMax: 50, n: 3 },
  roca:     { ...O.roca,     hex: 0xb06cff, rMin: 34, rMax: 68, n: 3 },
};
const DIST_NOMBRE = 16;   // a esta distancia se muestra el nombre del objeto
const DIST_RECOGER = 2.6; // a esta distancia se puede recoger con E / Q
export const MOCHILA_MAX = 4;   // objetos que caben en la mochila: más viajes = más tiempo afuera = más radiación
const enIngles = () => document.documentElement.lang === 'en';
const Lx = (es, en) => enIngles() ? en : es;

// Nivel de radiación que se siente afuera, a partir del riesgo de DONKI (0,5–2,5) y de una llamarada activa
export function nivelRadiacion(riesgo = 1, llamarada = false) {
  if (llamarada) return 'extrema';
  return riesgo < 0.9 ? 'baja' : riesgo < 1.4 ? 'moderada' : 'alta';
}
// Cuánto más rápido sube la dosis afuera según la actividad solar real (regla del juego, simplificada)
export const factorRiesgo = riesgo => Math.min(1.4, Math.max(0.85, 0.75 + 0.25 * (riesgo || 1)));

// Zonas ocupadas por edificios (para no poner objetos encima)
const OCUPADO = [[0, 0, 7], [10, 1, 6], [-3, -9, 6], [-13, 4, 9], [6, -8, 4], [-13, 15, 4], [17, -14, 5], [8, 10, 4]];

export class ControlEVA {
  constructor(mundo) {
    this.m = mundo;
    this.activo = false;
    this.teclas = {};
    this.joy = { x: 0, y: 0 };
    addEventListener('keydown', e => {
      if (!this.activo || e.target.tagName === 'INPUT') return;
      this.teclas[e.key.toLowerCase()] = true;
      const tecla = e.key.toLowerCase();
      if (tecla === 'e') this.accion();
      if (tecla === 'q') this.recoger();
      if (tecla === 'r') this.soltar();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    });
    addEventListener('keyup', e => { this.teclas[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { this.teclas = {}; });
  }

  // cfg: { o2PorSeg, radPorSeg, multLlamarada, riesgo, eficienciaPaneles, onUpdate(estado), onFin(resultado), onAviso(txt) }
  iniciar(cfg) {
    const m = this.m;
    this.cfg = cfg;
    this.riesgoVisto = cfg.riesgo ?? 1;   // para avisar si el riesgo sube a mitad de la caminata
    this.t = 0; this.o2 = 100; this.rad = 0; this.salio = false; this.limpio = false; this.terminado = false;
    this.items = { regolito: 0, roca: 0, hielo: 0 };   // lo que va en la mochila (se deposita al entrar)
    this.cercano = null;                                // objeto que se puede recoger ahora
    const S0 = m.getEstado?.();
    // Tripulación con dosímetros (idea 4): si existe, usa al astronauta elegido para salir
    this.astronauta = S0?.tripulacion?.find(a => a.id === S0.evaAstronauta) || null;
    this.radBase = this.astronauta?.dosis ?? S0?.rad ?? 0;   // dosis acumulada antes de salir
    this.blindajeBase = S0?.blindaje ?? 0;
    try { this.entraHabitat = S0 ? proteccionHabitat(S0) : 1; } catch { this.entraHabitat = 1; }   // fracción de radiación que entra al hábitat
    this.huellas = []; this.ultHuella = null;

    // Llamarada sorpresa durante la caminata (más probable si el Sol real está activo)
    this.llamarada = { en: 18 + Math.random() * 30, activa: false, va: Math.random() < 0.22 * (cfg.riesgo || 1) };

    // Jugador
    this.jugador = m.crearAstronauta(this.astronauta?.color ?? 0xe2673a);
    this.jugador.scale.setScalar(1.45);
    this.jugador.position.copy(PUERTA);
    const flecha = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4), new THREE.MeshBasicMaterial({ color: 0xffd25c }));
    flecha.rotation.x = Math.PI; flecha.position.y = 2.6;
    this.jugador.add(flecha);
    this.flecha = flecha;
    m.scene.add(this.jugador);

    // Objetos para recolectar
    this.objetos = [];
    for (const [tipo, T] of Object.entries(TIPOS)) {
      for (let k = 0; k < T.n; k++) this.objetos.push(this._crearObjeto(tipo, T));
    }

    // Cámara: acercar y seguir
    this.zoomAntes = m.camera.zoom;
    this.targetAntes = m.controls.target.clone();
    m.controls.enablePan = false;
    this.zoomObj = 1.6;
    m.seleccionar(null);
    this.activo = true;
  }

  _crearObjeto(tipo, T, pos = null) {
    let x, z, intentos = 0;
    if (pos) { x = pos.x; z = pos.z; }
    else do {
      const a = Math.random() * Math.PI * 2, r = T.rMin + Math.random() * (T.rMax - T.rMin);
      x = Math.cos(a) * r; z = Math.sin(a) * r; intentos++;
    } while (intentos < 60 && (OCUPADO.some(([ox, oz, rr]) => Math.hypot(x - ox, z - oz) < rr) || !this.m.libre(x, z, 1.4)));
    const g = new THREE.Group();
    const malla = this._modelo(tipo);
    malla.scale.setScalar(1.7);
    malla.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // Anillo brillante en el suelo + haz de luz para verlo de lejos
    const anillo = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.3, 28),
      new THREE.MeshBasicMaterial({ color: T.hex, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.08;
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 14, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: T.hex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    haz.position.y = 7;
    // Etiqueta: ícono siempre; nombre cuando el jugador se acerca
    const div = document.createElement('div');
    div.className = 'obj-eva';
    div.style.setProperty('--c', T.color);
    div.innerHTML = `<span class="obj-ic">${T.icono}</span><span class="obj-nom" data-es="${T.nombre}">${tr(T.nombre)}</span>`;
    const etq = new CSS2DObject(div); etq.position.y = 3.4;
    g.add(malla, anillo, haz, etq);
    g.position.set(x, alturaSuelo(x, z), z);
    this.m.scene.add(g);
    return { tipo, g, malla, anillo, etq, fase: Math.random() * 6 };
  }

  // Modelos que se parecen a lo que son
  _modelo(tipo) {
    const g = new THREE.Group();
    if (tipo === 'regolito') {
      // Montoncito de tierra roja con piedritas
      const tierra = new THREE.MeshStandardMaterial({ color: 0xc1562a, roughness: 1, flatShading: true });
      const monton = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.75, 9), tierra);
      monton.position.y = 0.37;
      g.add(monton);
      const piedra = new THREE.MeshStandardMaterial({ color: 0x7a2e14, roughness: 1, flatShading: true });
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.1, 0), piedra);
        const a = i / 6 * Math.PI * 2;
        p.position.set(Math.cos(a) * 0.85, 0.08, Math.sin(a) * 0.85);
        g.add(p);
      }
      g.userData.girar = false;
    } else if (tipo === 'roca') {
      // Roca de basalto oscura con vetas brillantes (minerales interesantes)
      const geo = new THREE.DodecahedronGeometry(0.75, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const k = 0.8 + Math.abs(Math.sin(i * 12.9898) * 0.35);
        pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.8, pos.getZ(i) * k);
      }
      geo.computeVertexNormals();
      const roca = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4a3530, roughness: 0.9, flatShading: true }));
      roca.position.y = 0.6;
      g.add(roca);
      const veta = new THREE.MeshStandardMaterial({ color: 0xd9a0ff, emissive: 0xb06cff, emissiveIntensity: 1.2 });
      for (let i = 0; i < 4; i++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), veta);
        const a = i * 1.7;
        c.position.set(Math.cos(a) * 0.55, 0.6 + Math.sin(i * 2.3) * 0.3, Math.sin(a) * 0.55);
        g.add(c);
      }
      g.userData.girar = true;
    } else {
      // Hielo de agua: bloque blanco-azulado transparente, medio enterrado
      const hielo = new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, emissive: 0x6fd3ff, emissiveIntensity: 0.35, roughness: 0.1, transparent: true, opacity: 0.85 });
      [[0, 0.5, 0, 0.6], [0.5, 0.35, 0.2, 0.4], [-0.4, 0.3, -0.25, 0.35]].forEach(([x, y, z, s]) => {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), hielo);
        b.position.set(x, y, z); b.rotation.set(x * 3, y * 5, z * 2);
        g.add(b);
      });
      const charco = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.35 }));
      charco.rotation.x = -Math.PI / 2; charco.position.y = 0.05;
      g.add(charco);
      g.userData.girar = false;
    }
    return g;
  }

  _popup(texto, pos) {
    const div = document.createElement('div');
    div.className = 'popup-eva'; div.innerHTML = `<span>${texto}</span>`;
    const o = new CSS2DObject(div);
    o.position.copy(pos).add(new THREE.Vector3(0, 3, 0));
    this.m.scene.add(o);
    setTimeout(() => { o.removeFromParent(); div.remove(); }, 1200);
  }

  get cercaPuerta() { return this.jugador.position.distanceTo(PUERTA) < 3.2; }
  get cercaPaneles() { return !this.limpio && this.cfg.eficienciaPaneles < 1 && this.jugador.position.distanceTo(PANELES) < 7.5; }

  get carga() { return Object.values(this.items).reduce((a, b) => a + b, 0); }

  // E: recoger lo que está cerca > limpiar paneles > depositar y entrar por la puerta
  accion() {
    if (!this.activo) return;
    if (this.cercano) return this.recoger();
    if (this.cercaPaneles) { this.limpio = true; this._popup('🧹 +30%', this.jugador.position); this.cfg.onAviso?.('🧹 ¡Paneles limpios!'); }
    else if (this.cercaPuerta && this.t > 1) this.terminar(false);
  }

  // E / Q: recoger el objeto más cercano (si cabe en la mochila)
  recoger() {
    if (!this.activo || !this.cercano) return;
    if (this.carga >= MOCHILA_MAX) {
      // Se pasa como función: si cambia el idioma con el aviso en pantalla, se vuelve a generar
      this.cfg.onAviso?.(() => Lx(`🎒 Mochila llena (${MOCHILA_MAX}). Vuelve a la base a depositar, o suelta algo con R.`,
        `🎒 Backpack full (${MOCHILA_MAX}). Go back to the base to drop it off, or drop something with R.`));
      return;
    }
    const o = this.cercano;
    this.items[o.tipo]++;
    this._popup(`+1 ${TIPOS[o.tipo].icono}`, o.g.position);
    o.etq.element.remove();
    o.g.removeFromParent();
    this.cercano = null;
    this.cfg.onRecoger?.(o.tipo);
  }

  // R: soltar el último tipo recogido (para hacer espacio a algo más valioso)
  soltar() {
    if (!this.activo || !this.carga) return;
    const orden = ['regolito', 'hielo', 'roca'];   // primero suelta lo menos valioso
    const tipo = orden.find(k => this.items[k] > 0);
    this.items[tipo]--;
    const p = this.jugador.position, ang = this.jugador.rotation.y + Math.PI;
    const pos = { x: p.x + Math.sin(ang) * 1.6, z: p.z + Math.cos(ang) * 1.6 };
    empujarFuera(pos, 1, this.m.obstaculos({ conAstros: false, conJugador: false }));   // que no quede dentro de una roca
    this.objetos.push(this._crearObjeto(tipo, TIPOS[tipo], pos));
    this._popup(`−1 ${TIPOS[tipo].icono}`, p);
  }

  update(dt) {
    const m = this.m, c = this.cfg;
    this.t += dt;

    // --- Entrada: dirección relativa a la cámara ---
    let ix = 0, iy = 0;
    const k = this.teclas;
    if (k.w || k.arrowup) iy += 1;
    if (k.s || k.arrowdown) iy -= 1;
    if (k.a || k.arrowleft) ix -= 1;
    if (k.d || k.arrowright) ix += 1;
    ix += this.joy.x; iy += this.joy.y;
    const len = Math.hypot(ix, iy);
    const p = this.jugador.position;
    if (len > 0.05) {
      if (len > 1) { ix /= len; iy /= len; }
      const adelante = new THREE.Vector3().subVectors(m.controls.target, m.camera.position); adelante.y = 0; adelante.normalize();
      const derecha = new THREE.Vector3().crossVectors(adelante, new THREE.Vector3(0, 1, 0));
      const mov = adelante.multiplyScalar(iy).add(derecha.multiplyScalar(ix));
      p.addScaledVector(mov, VELOCIDAD * dt);
      // No atravesar edificios, rocas grandes, el rover ni a los compañeros (los objetos para recoger sí se pisan)
      empujarFuera(p, RADIO_JUGADOR, m.obstaculos({ conJugador: false }));
      const r = Math.hypot(p.x, p.z);
      if (r > RADIO_MAX) { p.x *= RADIO_MAX / r; p.z *= RADIO_MAX / r; }
      this.jugador.rotation.y = Math.atan2(mov.x, mov.z);
      this.paso = (this.paso || 0) + dt * 10;
      // Huellas
      if (!this.ultHuella || this.ultHuella.distanceTo(p) > 1.3) {
        const h = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), new THREE.MeshBasicMaterial({ color: 0x5a2410, transparent: true, opacity: 0.55 }));
        h.rotation.x = -Math.PI / 2;
        h.position.set(p.x, alturaSuelo(p.x, p.z) + 0.04, p.z);
        m.scene.add(h); this.huellas.push(h); this.ultHuella = p.clone();
        if (this.huellas.length > 160) this.huellas.shift().removeFromParent();
      }
    }
    p.y = alturaSuelo(p.x, p.z) + (len > 0.05 ? Math.abs(Math.sin(this.paso)) * 0.35 : 0);
    this.flecha.position.y = 2.6 + Math.sin(this.t * 4) * 0.15;
    if (p.distanceTo(PUERTA) > 8) this.salio = true;

    // --- Cámara sigue al jugador ---
    const offset = new THREE.Vector3().subVectors(m.camera.position, m.controls.target);
    m.controls.target.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 4));
    m.camera.position.copy(m.controls.target).add(offset);
    m.camera.zoom += (this.zoomObj - m.camera.zoom) * Math.min(1, dt * 2);
    m.camera.updateProjectionMatrix();

    // --- Objetos: se recogen con E / Q cuando estás cerca (ya no solos) ---
    let cercano = null, dMin = DIST_RECOGER;
    for (const o of this.objetos) {
      if (!o.g.parent) continue;
      if (o.malla.userData.girar) o.malla.rotation.y += dt * 0.8;
      o.anillo.scale.setScalar(1 + Math.sin(this.t * 3 + o.fase) * 0.12);
      const dist = Math.hypot(o.g.position.x - p.x, o.g.position.z - p.z);
      o.etq.element.classList.toggle('cerca', dist < DIST_NOMBRE);
      if (dist < dMin) { dMin = dist; cercano = o; }
    }
    this.cercano = cercano;

    // --- Costos: oxígeno del traje y radiación ---
    this.o2 = Math.max(0, this.o2 - c.o2PorSeg * dt);
    const L = this.llamarada;
    if (L.va && !L.activa && this.t >= L.en) {
      L.activa = true;
      m.efecto('llamarada');
      c.onAviso?.('☢️ ¡LLAMARADA SOLAR! La radiación aumentó mucho. ¡Vuelve a la base YA!');
    }
    // Si llegó una alerta solar durante la caminata, avisar: desde ahora la dosis afuera es mayor
    const riesgoAhora = c.riesgo ?? 1;
    if (riesgoAhora > this.riesgoVisto + 0.25) {
      c.onAviso?.(Lx('🚨 ¡Alerta solar de la NASA! Desde ahora la radiación afuera es más alta. Piensa en volver a la base.',
        '🚨 NASA solar alert! From now on the radiation outside is higher. Think about going back to the base.'));
    }
    this.riesgoVisto = riesgoAhora;
    // La dosis afuera depende de la actividad solar real (DONKI) y de si hay una llamarada en curso
    this.rad += c.radPorSeg * factorRiesgo(c.riesgo) * (L.activa ? c.multLlamarada : 1) * dt;
    const limite = MISION.radLimite || 60;

    c.onUpdate?.({
      o2: this.o2, rad: this.rad, items: this.items, t: this.t,
      distBase: Math.round(p.distanceTo(PUERTA)),
      cercaPuerta: this.cercaPuerta, cercaPaneles: this.cercaPaneles, llamarada: L.activa,
      angBase: this._anguloPantalla(PUERTA),
      // Panel de radiación (idea del grupo)
      nivel: nivelRadiacion(c.riesgo, L.activa),
      exposicion: Math.min(100, Math.round((this.radBase + this.rad) / limite * 100)),
      blindaje: this.blindajeBase, entraHabitat: this.entraHabitat,
      carga: this.carga, mochilaMax: MOCHILA_MAX,
      cercano: this.cercano ? this.cercano.tipo : null, mochilaLlena: this.carga >= MOCHILA_MAX,
    });

    if (this.o2 <= 0) this.terminar(true);
  }

  // Ángulo en pantalla hacia un punto (para la flecha que indica la base)
  _anguloPantalla(v) {
    const a = v.clone().project(this.m.camera), b = this.jugador.position.clone().project(this.m.camera);
    return Math.atan2(-(a.y - b.y), a.x - b.x);
  }

  terminar(rescate) {
    if (this.terminado) return;
    this.terminado = true; this.activo = false;
    const m = this.m;
    this.jugador.removeFromParent();
    for (const o of this.objetos) { o.etq.element.remove(); o.g.removeFromParent(); }
    const huellas = this.huellas;
    setTimeout(() => huellas.forEach(h => h.removeFromParent()), 20000); // las huellas quedan un rato
    m.controls.enablePan = true;
    // Volver la cámara a la base suavemente
    const ini = performance.now(), t0 = m.controls.target.clone(), z0 = m.camera.zoom, zAntes = this.zoomAntes;
    const anim = () => {
      const k = Math.min(1, (performance.now() - ini) / 900);
      const off = new THREE.Vector3().subVectors(m.camera.position, m.controls.target);
      m.controls.target.lerpVectors(t0, this.targetAntes, k);
      m.camera.position.copy(m.controls.target).add(off);
      m.camera.zoom = z0 + (zAntes - z0) * k; m.camera.updateProjectionMatrix();
      if (k < 1) requestAnimationFrame(anim);
    };
    anim();
    this.cfg.onFin?.({
      items: rescate ? { regolito: 0, roca: 0, hielo: 0 } : this.items,
      rad: this.rad, rescate, limpio: !rescate && this.limpio, segundos: this.t,
    });
  }
}
