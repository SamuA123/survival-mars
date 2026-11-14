// =====================================================================
//  MUNDO 3D ISOMÉTRICO — Three.js
//  Solo LEE el estado de la simulación (getEstado) y lo dibuja.
//  API: new Mundo(contenedor, { onSeleccion }), .setEstado(fn),
//       .seleccionar(id), .efecto(tipo), .pasarSol() -> Promise
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { hash, fbm, altura } from './terreno.js';
import { ControlEVA } from './eva.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, ...o });
const C = {
  blanco: 0xeef0f4, gris: 0xb9bec8, oscuro: 0x4a4f5a, panel: 0x1d3f8f, panelSucio: 0x8a5a38,
  regolito: 0x9a4524, vidrio: 0xbfe9ff, verde: 0x49c45e, oro: 0xe8a33a, rojo: 0xff3b3b,
};

export const EDIFICIOS = {
  habitat:     { nombre: 'Hábitat', icono: '🏠', pos: [0, 0, 0] },
  invernadero: { nombre: 'Invernadero', icono: '🌱', pos: [10, 0, 1] },
  lab:         { nombre: 'Laboratorio', icono: '🔬', pos: [-3, 0, -9] },
  paneles:     { nombre: 'Paneles solares', icono: '☀️', pos: [-13, 0, 4] },
  bateria:     { nombre: 'Baterías', icono: '🔋', pos: [6, 0, -8] },
  antena:      { nombre: 'Antena', icono: '📡', pos: [-13, 0, 15] },
  reactor:     { nombre: 'Reactor', icono: '⚛️', pos: [17, 0, -14] },
  rover:       { nombre: 'Rover', icono: '🚙', pos: [8, 0, 10] },
};

export class Mundo {
  constructor(cont, { onSeleccion } = {}) {
    this.cont = cont;
    this.onSeleccion = onSeleccion || (() => {});
    this.getEstado = () => null;
    this.hora = 0.4;            // 0.25 amanecer · 0.5 mediodía · 0.75 atardecer
    this.reloj = new THREE.Clock();
    this.t = 0;
    this.sacudida = 0;
    this.flash = 0;
    this.alarma = 0;
    this.seleccionado = null;
    this.clicables = [];
    this.anim = [];             // funciones por cuadro
    this._initRender();
    this._initLuces();
    this._initTerreno();
    this._initBase();
    this._initAstronautas();
    this._initPolvo();
    this._initEntrada();
    this.eva = new ControlEVA(this);
    window.addEventListener('resize', () => this._resize());
    this._resize();
    this.renderer.setAnimationLoop(() => this._cuadro());
  }

  setEstado(fn) { this.getEstado = fn; }

  // ------------------------------------------------------------------
  _initRender() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.movil = matchMedia('(pointer: coarse)').matches;   // celular o tablet: menos carga gráfica
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.movil ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.cont.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'capa-etiquetas';
    this.cont.appendChild(this.labels.domElement);

    this.scene = new THREE.Scene();
    this.cieloDia = new THREE.Color(0xd8a27c);
    this.cieloNoche = new THREE.Color(0x120c18);
    this.cieloAtardecer = new THREE.Color(0x5b7fa6); // ¡los atardeceres en Marte son azules!
    this.cieloTormenta = new THREE.Color(0x8a5634);
    this.scene.background = this.cieloDia.clone();
    this.scene.fog = new THREE.Fog(this.cieloDia.clone(), 110, 260);

    this.d = 24;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    this.camOffset = new THREE.Vector3(48, 46, 48);
    this.camera.position.copy(this.camOffset);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = this.controls.maxPolarAngle = Math.PI / 3.3;
    this.controls.minZoom = 0.55; this.controls.maxZoom = 2.6;
    this.controls.screenSpacePanning = false;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.addEventListener('change', () => {
      if (this.eva?.activo) return;   // durante la caminata la cámara sigue al jugador
      const t = this.controls.target;
      const lim = 30;
      if (Math.abs(t.x) > lim || Math.abs(t.z) > lim) {
        const nx = THREE.MathUtils.clamp(t.x, -lim, lim), nz = THREE.MathUtils.clamp(t.z, -lim, lim);
        this.camera.position.x += nx - t.x; this.camera.position.z += nz - t.z; t.x = nx; t.z = nz;
      }
    });
  }

  _resize() {
    const w = this.cont.clientWidth, h = this.cont.clientHeight, a = w / h;
    const d = a < 1 ? this.d * 1.4 : this.d;
    Object.assign(this.camera, { left: -d * a, right: d * a, top: d, bottom: -d });
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
  }

  _initLuces() {
    this.hemi = new THREE.HemisphereLight(0xffe0c4, 0x6b2e16, 0.9);
    this.scene.add(this.hemi);
    this.sol = new THREE.DirectionalLight(0xfff1dc, 2.4);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.setScalar(this.movil ? 1024 : 2048);
    Object.assign(this.sol.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
    this.sol.shadow.bias = -0.0005;
    this.scene.add(this.sol, this.sol.target);
    this.luzNoche = new THREE.AmbientLight(0x4060a0, 0);
    this.scene.add(this.luzNoche);
  }

  _initTerreno() {
    const g = new THREE.PlaneGeometry(280, 280, 180, 180);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = [];
    const c1 = new THREE.Color(0xc0582c), c2 = new THREE.Color(0x8c3a1b), c3 = new THREE.Color(0xd9844f);
    const tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = altura(x, z);
      p.setY(i, h);
      const n = fbm(x * 0.08 + 10, z * 0.08);
      tmp.copy(c1).lerp(c2, n * 0.9).lerp(c3, THREE.MathUtils.clamp(h / 18, 0, 0.5));
      col.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const suelo = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    suelo.receiveShadow = true;
    this.scene.add(suelo);

    // Plataforma de la base
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(24, 25, 0.25, 48), std(0xa9583a, { roughness: 1 }));
    pad.position.y = 0.05; pad.receiveShadow = true;
    this.scene.add(pad);

    // Rocas
    const geoRoca = new THREE.DodecahedronGeometry(1, 0);
    const matRoca = std(0x6e2c16, { flatShading: true, roughness: 1 });
    for (let i = 0; i < 220; i++) {
      const ang = Math.random() * Math.PI * 2, r = 26 + Math.random() * 90;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const roca = new THREE.Mesh(geoRoca, matRoca);
      const s = 0.3 + Math.random() ** 3 * 2.2;
      roca.scale.set(s, s * (0.5 + Math.random() * 0.5), s);
      roca.position.set(x, altura(x, z) + s * 0.2, z);
      roca.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      roca.castShadow = roca.receiveShadow = true;
      this.scene.add(roca);
    }
  }

  // ------------------------------------------------------------------
  //  EDIFICIOS
  // ------------------------------------------------------------------
  _edificio(id) {
    const g = new THREE.Group();
    g.position.set(...EDIFICIOS[id].pos);
    g.userData.edificio = id;
    this.scene.add(g);
    return g;
  }
  _sombra(obj) { obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }

  _initBase() {
    this.ed = {};
    const ventanaMat = () => std(0x222222, { emissive: 0xffc96b, emissiveIntensity: 0 });

    // --- Hábitat ---
    {
      const g = this._edificio('habitat');
      const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 1.6, 32), std(C.gris));
      base.position.y = 0.8;
      const domo = new THREE.Mesh(new THREE.SphereGeometry(4.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(C.blanco));
      domo.position.y = 1.6;
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.12, 8, 48), std(0xe2673a));
      anillo.rotation.x = Math.PI / 2; anillo.position.y = 1.6;
      const puerta = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 1.4), std(C.gris));
      puerta.position.set(0, 1, 4.4);
      const ventanas = [];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + 0.3;
        const v = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), ventanaMat());
        v.position.set(Math.sin(a) * 4.0, 2.7, Math.cos(a) * 4.0);
        v.lookAt(Math.sin(a) * 10, 3.4, Math.cos(a) * 10);
        ventanas.push(v); g.add(v);
      }
      // Baliza de alarma
      const baliza = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), std(0x550000, { emissive: C.rojo, emissiveIntensity: 0 }));
      baliza.position.y = 5.9;
      const luzAlarma = new THREE.PointLight(C.rojo, 0, 25);
      luzAlarma.position.y = 6.4;
      // Blindaje de regolito
      const blindaje = new THREE.Mesh(
        new THREE.SphereGeometry(4.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        std(C.regolito, { flatShading: true, roughness: 1 }));
      blindaje.position.y = 1.3; blindaje.scale.set(1, 0.001, 1); blindaje.visible = false;
      const pg = blindaje.geometry.attributes.position;
      for (let i = 0; i < pg.count; i++) { const k = 1 + (hash(i, 3) - 0.5) * 0.12; pg.setXYZ(i, pg.getX(i) * k, pg.getY(i) * k, pg.getZ(i) * k); }
      blindaje.geometry.computeVertexNormals();
      g.add(base, domo, anillo, puerta, baliza, luzAlarma, blindaje);
      this._sombra(g);
      this.ed.habitat = { g, ventanas, baliza, luzAlarma, blindaje, domo };
    }

    // --- Túnel hábitat-invernadero ---
    {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 16), std(C.gris));
      t.rotation.z = Math.PI / 2; t.position.set(5.6, 1, 0.5);
      this._sombra(t); this.scene.add(t);
    }

    // --- Invernadero ---
    {
      const g = this._edificio('invernadero');
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.8, 32), std(C.gris));
      base.position.y = 0.4;
      const tierra = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.1, 32), std(0x5a3a22));
      tierra.position.y = 0.85;
      const domo = new THREE.Mesh(new THREE.SphereGeometry(3.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhysicalMaterial({ color: C.vidrio, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
      domo.position.y = 0.8;
      const marco = new THREE.Mesh(new THREE.SphereGeometry(3.62, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xdfe6ee, wireframe: true }));
      marco.position.y = 0.8;
      const plantas = [];
      const geoP = new THREE.ConeGeometry(0.35, 1, 6), matP = std(C.verde, { flatShading: true });
      for (let i = 0; i < 12; i++) {
        const fila = Math.floor(i / 4), colm = i % 4;
        const p = new THREE.Mesh(geoP, matP);
        p.position.set(-1.8 + colm * 1.2, 1.3, -1.4 + fila * 1.4);
        plantas.push(p); g.add(p);
      }
      const luz = new THREE.PointLight(0xd14cff, 0, 9);
      luz.position.y = 2.6;
      const grieta = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 0.15), std(C.rojo, { emissive: C.rojo, emissiveIntensity: 1 }));
      grieta.position.set(1.6, 3.4, 1.6); grieta.rotation.z = 0.6; grieta.visible = false;
      g.add(base, tierra, domo, marco, luz, grieta);
      base.castShadow = true; base.receiveShadow = true;
      this.ed.invernadero = { g, plantas, luz, grieta };
    }

    // --- Laboratorio (módulo cilíndrico horizontal) ---
    {
      const g = this._edificio('lab');
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 7, 24), std(C.blanco));
      cuerpo.rotation.z = Math.PI / 2; cuerpo.position.y = 2.2;
      const patas = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 2.4), std(C.oscuro));
      patas.position.y = 0.3;
      const franja = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.5, 24), std(0x2f7de1));
      franja.rotation.z = Math.PI / 2; franja.position.set(-2, 2.2, 0);
      const ventanas = [];
      for (let i = 0; i < 3; i++) {
        const v = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), ventanaMat());
        v.position.set(-0.4 + i * 1.3, 2.5, 1.79); ventanas.push(v); g.add(v);
      }
      const brazo = new THREE.Group();
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), std(C.gris));
      b1.position.y = 0.7;
      const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), std(0x2f7de1, { emissive: 0x2f7de1, emissiveIntensity: 0 }));
      sensor.position.y = 1.5;
      brazo.add(b1, sensor); brazo.position.set(2.5, 4, 0);
      g.add(cuerpo, patas, franja, brazo);
      this._sombra(g);
      this.ed.lab = { g, ventanas, brazo, sensor };
    }

    // --- Paneles solares (3 x 2) ---
    {
      const g = this._edificio('paneles');
      const pivots = [];
      const mat = std(C.panel, { metalness: 0.5, roughness: 0.35 });
      const rejilla = new THREE.MeshBasicMaterial({ color: 0x9fb8ff, wireframe: true, transparent: true, opacity: 0.35 });
      for (let i = 0; i < 6; i++) {
        const x = (i % 3) * 4.2 - 4.2, z = Math.floor(i / 3) * 4.6 - 2.3;
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.6, 8), std(C.gris));
        poste.position.set(x, 0.8, z);
        const pivot = new THREE.Group(); pivot.position.set(x, 1.65, z);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.6), mat);
        const red = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6, 4, 3), rejilla);
        red.rotation.x = -Math.PI / 2; red.position.y = 0.06;
        pivot.add(panel, red);
        g.add(poste, pivot);
        pivots.push(pivot);
      }
      this._sombra(g);
      this.ed.paneles = { g, pivots, mat };
    }

    // --- Baterías ---
    {
      const g = this._edificio('bateria');
      const caja = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 2.4), std(0x3d4350));
      caja.position.y = 1.1;
      const leds = [];
      for (let i = 0; i < 5; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.05), std(0x111111, { emissive: C.verde, emissiveIntensity: 0 }));
        l.position.set(-1.4 + i * 0.7, 1.2, 1.23); leds.push(l); g.add(l);
      }
      const tapa = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 2.6), std(0xffc93c));
      tapa.position.y = 2.3;
      g.add(caja, tapa);
      this._sombra(g);
      this.ed.bateria = { g, leds };
    }

    // --- Antena ---
    {
      const g = this._edificio('antena');
      const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 5, 8), std(C.gris));
      mastil.position.y = 2.5;
      const cabeza = new THREE.Group(); cabeza.position.y = 5;
      const plato = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3.5), std(C.blanco, { side: THREE.DoubleSide }));
      plato.rotation.x = Math.PI * 0.75;
      const luz = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), std(0x330000, { emissive: C.rojo, emissiveIntensity: 0 }));
      luz.position.y = 0.6;
      cabeza.add(plato, luz);
      // Ondas de radio
      const ondas = [];
      for (let i = 0; i < 3; i++) {
        const o = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0 }));
        o.position.y = 7; o.rotation.x = Math.PI / 2; ondas.push(o); g.add(o);
      }
      g.add(mastil, cabeza);
      this._sombra(g);
      ondas.forEach(o => { o.castShadow = false; o.receiveShadow = false; });
      this.ed.antena = { g, cabeza, luz, ondas };
    }

    // --- Reactor (lejos de la base, como en los planes reales) ---
    {
      const g = this._edificio('reactor');
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 3.6, 16), std(0xd9d9de));
      cuerpo.position.y = 1.8;
      const brillo = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 8, 32), std(0x003333, { emissive: 0x33e0ff, emissiveIntensity: 1.5 }));
      brillo.rotation.x = Math.PI / 2; brillo.position.y = 2.6;
      const aletas = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.5, 2.2), std(0x6a6f7a));
        a.position.set(Math.cos(i * Math.PI / 2) * 2.4, 3, Math.sin(i * Math.PI / 2) * 2.4);
        a.rotation.y = -i * Math.PI / 2; aletas.add(a);
      }
      g.add(cuerpo, brillo, aletas);
      this._sombra(g);
      // Cable hasta la base
      const pts = [new THREE.Vector3(17, 0.15, -14), new THREE.Vector3(8, 0.15, -9)];
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.1, 6), std(0x222222));
      this.scene.add(cable);
      this.ed.reactor = { g };
    }

    // --- Rover ---
    {
      const g = this._edificio('rover');
      const chasis = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 2), std(C.blanco));
      chasis.position.y = 1.1;
      const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.6), std(0x2f7de1, { metalness: 0.3, roughness: 0.3 }));
      cabina.position.set(0.6, 1.9, 0);
      const ruedas = [];
      const geoR = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12);
      for (let i = 0; i < 6; i++) {
        const r = new THREE.Mesh(geoR, std(0x222222));
        r.rotation.x = Math.PI / 2; r.position.set(-1.1 + (i % 3) * 1.1, 0.45, i < 3 ? 1.1 : -1.1);
        ruedas.push(r); g.add(r);
      }
      g.add(chasis, cabina);
      this._sombra(g);
      this.ed.rover = { g, ruedas, casa: g.position.clone(), destino: new THREE.Vector3(34, 0, 30) };
    }

    // Etiquetas y anillo de selección
    this.etiquetas = {};
    for (const id in EDIFICIOS) {
      const div = document.createElement('button');
      div.className = 'etiqueta';
      div.dataset.edificio = id;
      div.innerHTML = `<span class="et-icono">${EDIFICIOS[id].icono}</span><span class="et-nombre">${EDIFICIOS[id].nombre}</span><span class="et-extra"></span>`;
      div.addEventListener('pointerdown', e => e.stopPropagation());
      div.addEventListener('click', e => { e.stopPropagation(); this.seleccionar(id); });
      const obj = new CSS2DObject(div);
      const altoEt = { habitat: 7.5, antena: 9, reactor: 6.5, invernadero: 5.5, lab: 5.5, paneles: 4, bateria: 3.8, rover: 3.5 }[id];
      obj.position.set(0, altoEt, 0);
      this.ed[id].g.add(obj);
      this.etiquetas[id] = div;
      this.ed[id].g.traverse(o => { if (o.isMesh) this.clicables.push(o); });
    }
    this.anillo = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.2, 48), new THREE.MeshBasicMaterial({ color: 0xffd25c, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    this.anillo.rotation.x = -Math.PI / 2; this.anillo.position.y = 0.25; this.anillo.visible = false;
    this.scene.add(this.anillo);
  }

  // ------------------------------------------------------------------
  //  ASTRONAUTAS
  // ------------------------------------------------------------------
  crearAstronauta(color) {
    this._matAstro ||= { traje: std(0xf4f4f4), visor: std(C.oro, { metalness: 0.8, roughness: 0.2 }), mochila: std(0xbfc4cc) };
    const { traje, visor, mochila } = this._matAstro;
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.6, 4, 10), traje);
    cuerpo.position.y = 0.75;
    const casco = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), traje);
    casco.position.y = 1.55;
    const v = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, -Math.PI / 2, Math.PI), visor);
    v.position.set(0, 1.57, 0.1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), mochila);
    m.position.set(0, 0.9, -0.38);
    const banda = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.06, 6, 16), std(color));
    banda.rotation.x = Math.PI / 2; banda.position.y = 1.0;
    g.add(cuerpo, casco, v, m, banda);
    this._sombra(g);
    return g;
  }

  _initAstronautas() {
    const colores = [0xe2673a, 0x2f7de1, 0x49c45e, 0xffc93c];
    this.puntos = {
      habitat: new THREE.Vector3(0, 0, 6), invernadero: new THREE.Vector3(10, 0, 5.5), lab: new THREE.Vector3(-3, 0, -6.2),
      paneles: new THREE.Vector3(-13, 0, 0), bateria: new THREE.Vector3(6, 0, -5.8), antena: new THREE.Vector3(-11, 0, 13),
      rover: new THREE.Vector3(8, 0, 7.6),
    };
    this.astros = colores.map((c, i) => {
      const g = this.crearAstronauta(c);
      g.position.copy(Object.values(this.puntos)[i]);
      g.scale.setScalar(1.3);
      this.scene.add(g);
      return { g, destino: g.position.clone(), espera: Math.random() * 2, fase: Math.random() * 6 };
    });
  }

  _moverAstronautas(dt, S) {
    const lista = Object.keys(this.puntos);
    this.astros.forEach((a, i) => {
      let objetivo = null, ocultar = false;
      if (S?.refugio) { objetivo = new THREE.Vector3(0, 0, 0); }
      else if (i === 0 && S?.eva) objetivo = this.puntos.paneles.clone().add(new THREE.Vector3(Math.sin(this.t) * 3, 0, 1));
      else if (i === 0 && S?.enEVA) ocultar = true;   // ese astronauta lo controla el jugador
      a.g.visible = !ocultar;
      if (ocultar) { a.g.position.copy(this.ed.rover.g.position); return; }
      if (objetivo) a.destino.copy(objetivo);
      else if (a.g.position.distanceTo(a.destino) < 0.2) {
        a.espera -= dt;
        if (a.espera <= 0) {
          a.destino.copy(this.puntos[lista[Math.floor(Math.random() * lista.length)]]);
          a.destino.x += (Math.random() - 0.5) * 2; a.destino.z += (Math.random() - 0.5) * 2;
          a.espera = 1 + Math.random() * 3;
        }
      }
      const dir = a.destino.clone().sub(a.g.position); dir.y = 0;
      const dist = dir.length();
      if (dist > 0.15) {
        dir.normalize();
        a.g.position.addScaledVector(dir, Math.min(dist, dt * 3));
        a.g.rotation.y = Math.atan2(dir.x, dir.z);
        a.g.position.y = Math.abs(Math.sin(this.t * 9 + a.fase)) * 0.25; // saltitos (gravedad 38%)
      } else a.g.position.y = 0;
      if (S?.refugio) a.g.visible = dist > 3;
    });
  }

  // ------------------------------------------------------------------
  //  POLVO / EFECTOS
  // ------------------------------------------------------------------
  _initPolvo() {
    const n = 3500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 20; pos[i * 3 + 2] = (Math.random() - 0.5) * 120; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.polvo = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd99a68, size: 0.35, transparent: true, opacity: 0, depthWrite: false }));
    this.scene.add(this.polvo);
    this.polvoNivel = 0;

    // Remolino
    const m = 500, pr = new Float32Array(m * 3);
    const gr = new THREE.BufferGeometry(); gr.setAttribute('position', new THREE.BufferAttribute(pr, 3));
    this.remolino = new THREE.Points(gr, new THREE.PointsMaterial({ color: 0xe0a070, size: 0.3, transparent: true, opacity: 0.8, depthWrite: false }));
    this.remolino.visible = false;
    this.remolinoT = 0;
    this.scene.add(this.remolino);

    // Meteorito
    this.meteoro = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
    this.meteoro.visible = false;
    this.meteoroT = 0;
    this.scene.add(this.meteoro);
    this.flashLuz = new THREE.AmbientLight(0xfff0c0, 0);
    this.scene.add(this.flashLuz);
  }

  efecto(tipo) {
    if (tipo === 'llamarada') { this.flash = 1; this.alarma = 6; }
    else if (tipo === 'alarma') this.alarma = 5;
    else if (tipo === 'meteorito') { this.meteoroT = 1; this.meteoro.visible = true; }
    else if (tipo === 'remolino') { this.remolinoT = 6; this.remolino.visible = true; }
    else if (tipo === 'sacudir') this.sacudida = 1;
  }

  // ------------------------------------------------------------------
  //  SELECCIÓN
  // ------------------------------------------------------------------
  _initEntrada() {
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let ini = null;
    const el = this.renderer.domElement;
    const pick = e => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObjects(this.clicables, false)[0];
      if (!hit) return null;
      let o = hit.object; while (o && !o.userData.edificio) o = o.parent;
      return o?.userData.edificio || null;
    };
    el.addEventListener('pointerdown', e => { ini = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', e => {
      if (!ini || Math.hypot(e.clientX - ini[0], e.clientY - ini[1]) > 6) return;
      const id = pick(e);
      this.seleccionar(id);
    });
    el.addEventListener('pointermove', e => { if (e.buttons === 0) el.style.cursor = pick(e) ? 'pointer' : 'grab'; });
  }

  seleccionar(id) {
    this.seleccionado = id;
    for (const k in this.etiquetas) this.etiquetas[k].classList.toggle('activa', k === id);
    if (id) {
      const p = this.ed[id].g.position;
      this.anillo.position.set(p.x, 0.25, p.z);
      const esc = { paneles: 1.6, lab: 1.1, reactor: 0.7, bateria: 0.6, antena: 0.5, rover: 0.6, invernadero: 0.8, habitat: 1 }[id];
      this.anillo.scale.setScalar(esc);
    }
    this.anillo.visible = !!id;
    this.onSeleccion(id);
  }

  // Animación de paso del sol: atardecer → noche → amanecer
  pasarSol(ms = 3800) {
    return new Promise(res => {
      this.transicion = { ini: performance.now(), ms, desde: this.hora, res };
    });
  }

  // ------------------------------------------------------------------
  //  CUADRO A CUADRO
  // ------------------------------------------------------------------
  _cuadro() {
    const dt = Math.min(this.reloj.getDelta(), 0.05);
    this.t += dt;
    const S = this.getEstado();

    // Hora del día
    if (this.transicion) {
      const k = Math.min(1, (performance.now() - this.transicion.ini) / this.transicion.ms);
      this.hora = this.transicion.desde + k;
      if (k >= 1) { this.hora = this.transicion.desde; const r = this.transicion.res; this.transicion = null; r(); }
    }
    const h = this.hora % 1;
    const ang = (h - 0.25) * Math.PI * 2;
    const elev = Math.sin(ang);
    const dia = THREE.MathUtils.smoothstep(elev, -0.15, 0.25);
    const atardecer = Math.max(0, 1 - Math.abs(elev) / 0.3) * (elev > -0.2 ? 1 : 0);
    const tormenta = S && S.polvoSols > 0 ? 1 : 0;
    this.polvoNivel += (tormenta - this.polvoNivel) * dt * 1.5;

    const cx = this.controls.target.x, cz = this.controls.target.z;
    this.sol.position.set(cx + Math.cos(ang) * 70, Math.max(8, elev * 80), cz + 30);
    this.sol.target.position.set(cx, 0, cz);
    this.sol.intensity = 2.6 * dia * (1 - this.polvoNivel * 0.7);
    this.hemi.intensity = 0.25 + 0.75 * dia * (1 - this.polvoNivel * 0.3);
    this.luzNoche.intensity = (1 - dia) * 0.9;

    const cielo = this.cieloNoche.clone().lerp(this.cieloDia, dia).lerp(this.cieloAtardecer, atardecer * 0.6).lerp(this.cieloTormenta, this.polvoNivel * 0.8 * Math.max(dia, 0.3));
    this.scene.background.copy(cielo);
    this.scene.fog.color.copy(cielo);
    this.scene.fog.near = THREE.MathUtils.lerp(110, 45, this.polvoNivel);
    this.scene.fog.far = THREE.MathUtils.lerp(260, 120, this.polvoNivel);

    // Polvo
    this.polvo.material.opacity = this.polvoNivel * 0.75;
    if (this.polvoNivel > 0.01) {
      const p = this.polvo.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) + dt * (18 + (i % 7) * 3);
        if (x > 60) x -= 120;
        p.setX(i, x); p.setY(i, (p.getY(i) + dt * Math.sin(i + this.t) * 0.8 + 20) % 20);
      }
      p.needsUpdate = true;
      this.polvo.position.set(cx, 0, cz);
    }

    if (S) this._actualizarBase(S, dt, dia);
    this._moverAstronautas(dt, S);
    this._efectos(dt);
    if (this.eva.activo) this.eva.update(dt);

    // Cámara
    this.controls.update();
    if (this.sacudida > 0) {
      this.sacudida = Math.max(0, this.sacudida - dt * 1.5);
      this.camera.position.x += (Math.random() - 0.5) * this.sacudida * 0.8;
      this.camera.position.y += (Math.random() - 0.5) * this.sacudida * 0.8;
    }
    if (this.anillo.visible) this.anillo.material.opacity = 0.5 + Math.sin(this.t * 4) * 0.3;

    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  _actualizarBase(S, dt, dia) {
    const lerp = (a, b, k) => a + (b - a) * Math.min(1, dt * k);
    const noche = 1 - dia;
    const hayEnergia = S.energiaOk !== false && S.bateria > 0;

    // Hábitat
    const H = this.ed.habitat;
    H.ventanas.forEach(v => { v.material.emissiveIntensity = hayEnergia && S.niveles.vital > 0 ? 0.6 + noche * 2.2 : 0; });
    const objBl = S.blindaje / 3;
    H.blindaje.visible = S.blindaje > 0;
    H.blindaje.scale.y = lerp(H.blindaje.scale.y, Math.max(0.001, objBl), 2);
    const alarmaOn = this.alarma > 0;
    const parpadeo = alarmaOn ? (Math.sin(this.t * 12) > 0 ? 1 : 0) : 0;
    H.baliza.material.emissiveIntensity = parpadeo * 3;
    H.luzAlarma.intensity = parpadeo * 60;

    // Invernadero
    const I = this.ed.invernadero;
    const nPlantas = Math.round(S.niveles.invernadero * 4 * S.invSalud);
    I.plantas.forEach((p, i) => {
      const obj = i < nPlantas ? 1 : 0.25;
      p.scale.setScalar(lerp(p.scale.x, obj, 3));
      p.material.color.setHex(nPlantas === 0 ? 0x7a5a3a : C.verde);
    });
    I.luz.intensity = hayEnergia ? S.niveles.invernadero * (8 + noche * 20) : 0;
    I.grieta.visible = S.invSalud < 1 && Math.sin(this.t * 6) > -0.3;

    // Laboratorio
    const L = this.ed.lab;
    const labOn = hayEnergia && S.niveles.lab > 0;
    L.ventanas.forEach(v => { v.material.emissiveIntensity = labOn ? 0.8 + noche * 2 : 0.05; });
    L.sensor.material.emissiveIntensity = labOn ? 1.5 + Math.sin(this.t * 5) : 0;
    if (labOn) L.brazo.rotation.y += dt * S.niveles.lab;

    // Paneles
    const P = this.ed.paneles;
    P.pivots.forEach((pv, i) => {
      const tilt = S.paneles ? -0.55 : 0;
      const plegado = S.paneles ? 1 : 0.18;
      pv.rotation.x = lerp(pv.rotation.x, tilt, 3);
      pv.scale.z = lerp(pv.scale.z, plegado, 3 + i * 0.3);
      pv.scale.x = lerp(pv.scale.x, S.paneles ? 1 : 0.5, 3 + i * 0.3);
    });
    P.mat.color.setHex(C.panel).lerp(new THREE.Color(C.panelSucio), 1 - S.eficiencia);

    // Baterías
    const n = Math.ceil(S.bateria / 40 * 5);
    this.ed.bateria.leds.forEach((l, i) => {
      l.material.emissiveIntensity = i < n ? 1.6 : 0;
      l.material.emissive.setHex(n <= 1 ? C.rojo : n <= 2 ? 0xffb347 : C.verde);
    });

    // Antena
    const A = this.ed.antena;
    const conj = S.sol && S.conjuncion;
    const radioOn = hayEnergia && S.niveles.radio > 0 && !conj;
    if (radioOn) A.cabeza.rotation.y += dt * 0.3;
    A.luz.material.emissiveIntensity = radioOn && Math.sin(this.t * 5) > 0 ? 3 : 0;
    A.ondas.forEach((o, i) => {
      const k = ((this.t * 0.6 + i / 3) % 1);
      o.scale.setScalar(1 + k * 5); o.position.y = 7 + k * 4;
      o.material.opacity = radioOn ? (1 - k) * 0.7 : 0;
    });

    // Rover
    const R = this.ed.rover;
    const dest = S.expedicion ? R.destino : R.casa;
    const d = dest.clone().sub(R.g.position); d.y = 0;
    if (d.length() > 0.3) {
      d.normalize();
      R.g.position.addScaledVector(d, dt * 6);
      R.g.rotation.y = Math.atan2(d.x, d.z) - Math.PI / 2;
      R.g.position.y = altura(R.g.position.x, R.g.position.z) * (Math.hypot(R.g.position.x, R.g.position.z) > 24 ? 1 : 0);
      R.ruedas.forEach(w => { w.rotation.y += dt * 8; });
    }

    // Etiquetas con nivel actual
    const pips = (n, max) => '●'.repeat(n) + '○'.repeat(max - n);
    const extra = {
      habitat: `🫁 ${pips(S.niveles.vital, 3)}${S.blindaje ? ` · 🧱${S.blindaje}/3` : ''}`,
      invernadero: `${pips(S.niveles.invernadero, 3)}${S.invSalud < 1 ? ' ⚠️' : ''}`,
      lab: pips(S.niveles.lab, 2),
      antena: conj ? '🌞 sin señal' : pips(S.niveles.radio, 2),
      paneles: S.paneles ? `${Math.round(S.eficiencia * 100)}%` : 'plegados',
      bateria: `${Math.round(S.bateria)} kWh`,
      reactor: 'siempre ON',
      rover: S.expedicion ? 'explorando…' : 'listo',
    };
    for (const id in extra) {
      const el = this.etiquetas[id].querySelector('.et-extra');
      if (el.textContent !== extra[id]) el.textContent = extra[id];
    }
  }

  _efectos(dt) {
    // Destello de llamarada
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 0.5); this.flashLuz.intensity = this.flash * 6; }
    if (this.alarma > 0) this.alarma -= dt;

    // Meteorito
    if (this.meteoroT > 0) {
      this.meteoroT -= dt * 1.4;
      const k = 1 - Math.max(0, this.meteoroT);
      const ini = new THREE.Vector3(-30, 60, -20), fin = new THREE.Vector3(11, 3.5, 2);
      this.meteoro.position.lerpVectors(ini, fin, k);
      if (this.meteoroT <= 0) { this.meteoro.visible = false; this.sacudida = 1; this.flash = 0.4; }
    }

    // Remolino
    if (this.remolinoT > 0) {
      this.remolinoT -= dt;
      const k = 1 - this.remolinoT / 6;
      const cx = -30 + k * 40, cz = 4;
      const p = this.remolino.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = (i / p.count) * 9, r = 0.4 + y * 0.35, a = this.t * 8 + i * 0.7;
        p.setXYZ(i, cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
      }
      p.needsUpdate = true;
      if (this.remolinoT <= 0) this.remolino.visible = false;
    }
  }
}
