// =====================================================================
//  AMBIENTE: detalles que dan vida al mundo, sin cambiar las reglas del juego.
//  - Helicóptero tipo Ingenuity que vuela de día sobre la base
//  - Remolinos de polvo a lo lejos, en la llanura de Isidis
//  Todo se apaga en modo gráficos ligeros (🐢), de noche o en tormenta.
//  API: new Ambiente(mundo) · .update(dt, { dia, tormenta })
// =====================================================================
import * as THREE from 'three';
import { altura } from './terreno.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...o });

export class Ambiente {
  constructor(mundo) {
    this.m = mundo;
    this.t = 0;
    this._initDron();
    this._initRemolinos();
  }

  // ------------------------------------------------------------------
  //  Helicóptero (inspirado en Ingenuity: dos hélices, patas finas, panel solar arriba)
  // ------------------------------------------------------------------
  _initDron() {
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), std(0xd9d2c4));
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.6), std(0x1d3f8f, { metalness: 0.5, roughness: 0.3 }));
    panel.position.y = 1.55;
    const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), std(0x8a8f99));
    mastil.position.y = 0.9;
    const helices = [0.75, 1.15].map((y, i) => {
      const h = new THREE.Group();
      const pala = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 0.22), std(0x2b2b2b));
      h.add(pala); h.position.y = y; h.userData.sentido = i ? -1 : 1;
      return h;
    });
    const patas = [];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + Math.PI / 4;
      const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), std(0x9aa0aa));
      pata.position.set(Math.cos(a) * 0.45, -0.55, Math.sin(a) * 0.45);
      pata.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
      patas.push(pata);
    }
    g.add(cuerpo, panel, mastil, ...helices, ...patas);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.scale.setScalar(1.15);
    g.visible = false;
    this.m.scene.add(g);
    this.dron = { g, helices, visible: 0 };
  }

  // ------------------------------------------------------------------
  //  Remolinos de polvo lejanos (decorativos; el evento "remolino" del juego es otro)
  // ------------------------------------------------------------------
  _initRemolinos() {
    this.remolinos = [0, 1].map(i => {
      const n = 260, pos = new Float32Array(n * 3);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd9a070, size: 0.5, transparent: true, opacity: 0, depthWrite: false }));
      this.m.scene.add(pts);
      return { pts, n, fase: i * 3.1, ang: i * Math.PI + 0.6, radio: 70 + i * 12 };
    });
  }

  update(dt, { dia = 1, tormenta = 0 } = {}) {
    this.t += dt;
    const ligero = !!this.m.ligero;
    const deDia = dia > 0.6;

    // --- Dron: vuela de día, con buen tiempo y gráficos normales ---
    const D = this.dron;
    const quiereVolar = !ligero && deDia && tormenta < 0.2 && !this.m.eva?.activo;
    D.visible += ((quiereVolar ? 1 : 0) - D.visible) * Math.min(1, dt * 0.8);
    if (ligero) D.visible = 0;   // en PCs lentas: desaparece al instante, sin gastar cuadros
    D.g.visible = D.visible > 0.02;
    if (D.g.visible) {
      // Recorrido en forma de 8 alrededor de la base
      const k = this.t * 0.16;
      const x = Math.sin(k) * 20, z = Math.sin(k * 2) * 11 - 2;
      const y = 5 + D.visible * 4 + Math.sin(this.t * 1.7) * 0.4;
      const antes = D.g.position.clone();
      D.g.position.set(x, Math.max(y, altura(x, z) + 3), z);
      const dir = D.g.position.clone().sub(antes);
      if (dir.lengthSq() > 1e-6) {
        D.g.rotation.y = Math.atan2(dir.x, dir.z);
        D.g.rotation.z = THREE.MathUtils.clamp(-dir.x * 4, -0.25, 0.25);
      }
      D.helices.forEach(h => { h.rotation.y += dt * 40 * h.userData.sentido; });
    }

    // --- Remolinos lejanos ---
    for (const R of this.remolinos) {
      const activo = !ligero && deDia && tormenta < 0.2;
      const mat = R.pts.material;
      mat.opacity += ((activo ? 0.45 : 0) - mat.opacity) * Math.min(1, dt * 0.5);
      if (ligero) mat.opacity = 0;
      R.pts.visible = mat.opacity > 0.01;
      if (!R.pts.visible) continue;
      R.ang += dt * 0.025;
      const cx = Math.cos(R.ang) * R.radio, cz = Math.sin(R.ang) * R.radio * 0.6 + 20;
      const base = altura(cx, cz);
      const p = R.pts.geometry.attributes.position;
      for (let i = 0; i < R.n; i++) {
        const f = i / R.n, yy = f * 16, r = 0.6 + f * 3.2, a = this.t * 5 + i * 0.9 + R.fase;
        p.setXYZ(i, cx + Math.cos(a) * r, base + yy, cz + Math.sin(a) * r);
      }
      p.needsUpdate = true;
    }
  }
}
