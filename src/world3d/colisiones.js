// =====================================================================
//  COLISIONES en el suelo (vista desde arriba, plano x-z).
//  Obstáculos: círculos { x, z, r } o rectángulos { x, z, hx, hz } (medio ancho y medio largo).
//  empujarFuera() saca un punto de los obstáculos: así el personaje "resbala" por el borde
//  en vez de atravesar edificios, rocas grandes o compañeros.
//  Sin Three.js: se puede probar en Node.
// =====================================================================
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

// Mueve p (objeto con x y z) hasta que quede fuera de todos los obstáculos. Devuelve true si chocó.
export function empujarFuera(p, radio, obstaculos) {
  let choco = false;
  for (let vuelta = 0; vuelta < 3; vuelta++) {   // varias vueltas por si al salir de uno entra en otro
    let movido = false;
    for (const o of obstaculos) {
      if (o.r != null) {
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = o.r + radio;
        if (d >= min) continue;
        if (d < 1e-6) { p.x = o.x + min; }
        else { p.x = o.x + dx / d * min; p.z = o.z + dz / d * min; }
      } else {
        const cx = limitar(p.x, o.x - o.hx, o.x + o.hx), cz = limitar(p.z, o.z - o.hz, o.z + o.hz);
        const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
        if (d >= radio) continue;
        if (d < 1e-6) {
          // El centro quedó dentro del rectángulo: salir por el lado más cercano
          const fx = o.hx + radio - Math.abs(p.x - o.x), fz = o.hz + radio - Math.abs(p.z - o.z);
          if (fx < fz) p.x += Math.sign(p.x - o.x || 1) * fx; else p.z += Math.sign(p.z - o.z || 1) * fz;
        } else { p.x = cx + dx / d * radio; p.z = cz + dz / d * radio; }
      }
      movido = choco = true;
    }
    if (!movido) break;
  }
  return choco;
}

// ¿Cabe algo de este radio en (x, z) sin tocar ningún obstáculo?
export function libre(x, z, radio, obstaculos) {
  const p = { x, z };
  return !empujarFuera(p, radio, obstaculos);
}

// =====================================================================
//  RUTAS para los compañeros: en vez de ir en línea recta (y trabarse en las esquinas entre
//  edificios), siguen una red de puntos alrededor de cada edificio. Se calcula una vez.
// =====================================================================
const segmentoLibre = (a, b, radio, obstaculos) => {
  const largo = Math.hypot(b.x - a.x, b.z - a.z), pasos = Math.max(1, Math.ceil(largo / 0.35));
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    if (!libre(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, radio, obstaculos)) return false;
  }
  return true;
};

// Puntos de paso alrededor de cada obstáculo (un poco más afuera que su borde) + puntos extra
export function crearRed(obstaculos, radio, extras = []) {
  const margen = radio + 0.9, nodos = [...extras.map(p => ({ x: p.x, z: p.z }))];
  for (const o of obstaculos) {
    if (o.r != null) {
      const n = Math.max(6, Math.round(o.r * 2.5));
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; nodos.push({ x: o.x + Math.cos(a) * (o.r + margen), z: o.z + Math.sin(a) * (o.r + margen) }); }
    } else {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) nodos.push({ x: o.x + sx * (o.hx + margen), z: o.z + sz * (o.hz + margen) });
    }
  }
  const validos = nodos.filter(p => libre(p.x, p.z, radio + 0.1, obstaculos));
  const vecinos = validos.map(() => []);
  for (let i = 0; i < validos.length; i++) for (let j = i + 1; j < validos.length; j++) {
    const d = Math.hypot(validos[i].x - validos[j].x, validos[i].z - validos[j].z);
    if (d < 30 && segmentoLibre(validos[i], validos[j], radio, obstaculos)) { vecinos[i].push([j, d]); vecinos[j].push([i, d]); }
  }
  return { nodos: validos, vecinos, obstaculos, radio };
}

// Camino más corto (lista de puntos, sin incluir el inicio) desde 'desde' hasta 'hasta'
export function buscarRuta(red, desde, hasta) {
  const { nodos, vecinos, obstaculos, radio } = red;
  if (segmentoLibre(desde, hasta, radio, obstaculos)) return [{ x: hasta.x, z: hasta.z }];
  const n = nodos.length, INI = n, FIN = n + 1;
  const pts = [...nodos, desde, hasta];
  const ady = i => {
    if (i === INI) return nodos.map((p, j) => [j, Math.hypot(p.x - desde.x, p.z - desde.z)]).filter(([j]) => segmentoLibre(desde, nodos[j], radio, obstaculos));
    const lista = i < n ? [...vecinos[i]] : [];
    if (i < n && segmentoLibre(nodos[i], hasta, radio, obstaculos)) lista.push([FIN, Math.hypot(nodos[i].x - hasta.x, nodos[i].z - hasta.z)]);
    return lista;
  };
  const dist = new Array(n + 2).fill(Infinity), prev = new Array(n + 2).fill(-1), hecho = new Array(n + 2).fill(false);
  dist[INI] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n + 2; i++) if (!hecho[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === FIN) break;
    hecho[u] = true;
    for (const [v, d] of ady(u)) if (dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; }
  }
  if (dist[FIN] === Infinity) return [{ x: hasta.x, z: hasta.z }];   // sin camino: intentar directo
  const camino = [];
  for (let v = FIN; v !== INI; v = prev[v]) camino.unshift({ x: pts[v].x, z: pts[v].z });
  return camino;
}
