// =====================================================================
//  CAMINATA ESPACIAL (EVA): el jugador controla un astronauta.
//  WASD / flechas para moverse · E para entrar o limpiar · joystick táctil.
//  Cada segundo afuera gasta oxígeno del traje y suma radiación.
// =====================================================================
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { alturaSuelo } from './terreno.js';

export const PUERTA = new THREE.Vector3(0, 0, 6.4);
const PANELES = new THREE.Vector3(-13, 0, 4);
const RADIO_MAX = 76;
const VELOCIDAD = 7.5;

// Lo más valioso está más lejos de la base → hay que arriesgar más
export const TIPOS = {
  regolito: { icono: '🟫', nombre: 'Regolito', color: 0xa0522d, rMin: 15, rMax: 30, n: 3 },
  hielo:    { icono: '🧊', nombre: 'Hielo', color: 0x9be7ff, rMin: 24, rMax: 48, n: 3 },
  roca:     { icono: '🪨', nombre: 'Roca rara', color: 0xb06cff, rMin: 34, rMax: 66, n: 3 },
  pieza:    { icono: '🔩', nombre: 'Pieza de sonda', color: 0xcfd6e0, rMin: 52, rMax: 70, n: 1 },
};

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
      if (e.key.toLowerCase() === 'e') this.accion();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    });
    addEventListener('keyup', e => { this.teclas[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { this.teclas = {}; });
  }

  // cfg: { o2PorSeg, radPorSeg, multLlamarada, riesgo, eficienciaPaneles, onUpdate(estado), onFin(resultado), onAviso(txt) }
  iniciar(cfg) {
    const m = this.m;
    this.cfg = cfg;
    this.t = 0; this.o2 = 100; this.rad = 0; this.salio = false; this.limpio = false; this.terminado = false;
    this.items = { hielo: 0, roca: 0, regolito: 0, pieza: 0 };
    this.huellas = []; this.ultHuella = null;

    // Llamarada sorpresa durante la caminata (más probable si el Sol real está activo)
    this.llamarada = { en: 18 + Math.random() * 30, activa: false, va: Math.random() < 0.22 * (cfg.riesgo || 1) };

    // Jugador
    this.jugador = m.crearAstronauta(0xe2673a);
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
      const n = tipo === 'pieza' ? (Math.random() < 0.6 ? 1 : 0) : T.n;
      for (let k = 0; k < n; k++) this.objetos.push(this._crearObjeto(tipo, T));
    }

    // Cámara: acercar y seguir
    this.zoomAntes = m.camera.zoom;
    this.targetAntes = m.controls.target.clone();
    m.controls.enablePan = false;
    this.zoomObj = 1.6;
    m.seleccionar(null);
    this.activo = true;
  }

  _crearObjeto(tipo, T) {
    let x, z, intentos = 0;
    do {
      const a = Math.random() * Math.PI * 2, r = T.rMin + Math.random() * (T.rMax - T.rMin);
      x = Math.cos(a) * r; z = Math.sin(a) * r; intentos++;
    } while (intentos < 30 && OCUPADO.some(([ox, oz, rr]) => Math.hypot(x - ox, z - oz) < rr));
    const g = new THREE.Group();
    let malla;
    const mat = new THREE.MeshStandardMaterial({ color: T.color, emissive: T.color, emissiveIntensity: 0.35, roughness: 0.4, flatShading: true });
    if (tipo === 'hielo') malla = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), Object.assign(mat, { transparent: true, opacity: 0.85 }));
    else if (tipo === 'roca') malla = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), mat);
    else if (tipo === 'regolito') malla = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.7), mat);
    else malla = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.18, 6, 10), mat);
    malla.position.y = 0.9; malla.castShadow = true;
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 14, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: T.color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    haz.position.y = 7;
    const div = document.createElement('div');
    div.className = 'obj-eva'; div.textContent = T.icono;
    const etq = new CSS2DObject(div); etq.position.y = 2.4;
    g.add(malla, haz, etq);
    g.position.set(x, alturaSuelo(x, z), z);
    this.m.scene.add(g);
    return { tipo, g, malla, etq, fase: Math.random() * 6 };
  }

  _popup(texto, pos) {
    const div = document.createElement('div');
    div.className = 'popup-eva'; div.innerHTML = texto;
    const o = new CSS2DObject(div);
    o.position.copy(pos).add(new THREE.Vector3(0, 3, 0));
    this.m.scene.add(o);
    setTimeout(() => { o.removeFromParent(); div.remove(); }, 1200);
  }

  get cercaPuerta() { return this.jugador.position.distanceTo(PUERTA) < 3.2; }
  get cercaPaneles() { return !this.limpio && this.cfg.eficienciaPaneles < 1 && this.jugador.position.distanceTo(PANELES) < 7.5; }

  accion() {
    if (!this.activo) return;
    if (this.cercaPaneles) { this.limpio = true; this._popup('🧹 +30%', this.jugador.position); this.cfg.onAviso?.('🧹 ¡Paneles limpios!'); }
    else if (this.cercaPuerta && this.t > 1) this.terminar(false);
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
      const r = Math.hypot(p.x, p.z);
      if (r > RADIO_MAX) { p.x *= RADIO_MAX / r; p.z *= RADIO_MAX / r; }
      // No atravesar el hábitat
      const rh = Math.hypot(p.x, p.z);
      if (rh < 4.8) { p.x *= 4.8 / rh; p.z *= 4.8 / rh; }
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

    // --- Objetos ---
    for (const o of this.objetos) {
      if (!o.g.parent) continue;
      o.malla.rotation.y += dt * 1.5;
      o.malla.position.y = 0.9 + Math.sin(this.t * 2 + o.fase) * 0.2;
      if (Math.hypot(o.g.position.x - p.x, o.g.position.z - p.z) < 1.8) {
        this.items[o.tipo]++;
        this._popup(`+1 ${TIPOS[o.tipo].icono}`, o.g.position);
        o.etq.element.remove();
        o.g.removeFromParent();
        c.onRecoger?.(o.tipo);
      }
    }

    // --- Costos: oxígeno del traje y radiación ---
    this.o2 = Math.max(0, this.o2 - c.o2PorSeg * dt);
    const L = this.llamarada;
    if (L.va && !L.activa && this.t >= L.en) {
      L.activa = true;
      m.efecto('llamarada');
      c.onAviso?.('☢️ ¡LLAMARADA SOLAR! La radiación aumentó mucho. ¡Vuelve a la base YA!');
    }
    this.rad += c.radPorSeg * (L.activa ? c.multLlamarada : 1) * dt;

    c.onUpdate?.({
      o2: this.o2, rad: this.rad, items: this.items, t: this.t,
      distBase: Math.round(p.distanceTo(PUERTA)),
      cercaPuerta: this.cercaPuerta, cercaPaneles: this.cercaPaneles, llamarada: L.activa,
      angBase: this._anguloPantalla(PUERTA),
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
      items: rescate ? { hielo: 0, roca: 0, regolito: 0, pieza: 0 } : this.items,
      rad: this.rad, rescate, limpio: !rescate && this.limpio, segundos: this.t,
    });
  }
}
