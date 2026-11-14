// CLIMA ESPACIAL REAL — NASA DONKI (llamaradas solares, FLR).
// Docs: https://api.nasa.gov  ->  DONKI
// Pongan aquí su clave gratuita de https://api.nasa.gov (DEMO_KEY tiene un límite muy bajo y se agota).
export const NASA_API_KEY = 'DEMO_KEY';

// Llamaradas históricas reales: se usan si no hay conexión. Se muestran como "históricas", nunca como "en vivo".
// Archivo curado: cada ejemplo tiene una publicación NASA verificable.
export const LLAMARADAS_RESPALDO = [
  { clase: 'X9.0', fecha: '2024-10-03', url: 'https://svs.gsfc.nasa.gov/14701/' },
  { clase: 'X8.7', fecha: '2024-05-14', url: 'https://svs.gsfc.nasa.gov/14592/' },
];

export function fuerza(clase) {
  const base = { A: 0.01, B: 0.1, C: 1, M: 10, X: 100 }[clase[0]] || 1;
  return base * (parseFloat(clase.slice(1)) || 1);
}

const CACHE = 'survivalMars.donki';
const CACHE_HORAS = 6;

// Dos puertas a los mismos datos: api.nasa.gov (con clave) y el servidor de la NASA CCMC (sin clave).
const fuentesURL = (ini, fin) => [
  `https://api.nasa.gov/DONKI/FLR?startDate=${ini}&endDate=${fin}&api_key=${NASA_API_KEY}`,
  `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=${ini}&endDate=${fin}`,
];

async function pedir(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Respuesta DONKI no válida');
    return data
      .filter(f => f && /^[ABCMX]\d+(\.\d+)?$/.test(f.classType))
      .map(f => ({ clase: f.classType, fecha: (f.peakTime || f.beginTime || '').slice(0, 10) }));
  } finally { clearTimeout(t); }
}

function leerCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE));
    if (c && Number.isFinite(c.t) && c.t <= Date.now() && Date.now() - c.t < CACHE_HORAS * 3600e3
      && Array.isArray(c.flares) && c.flares.every(f => /^[ABCMX]\d+(\.\d+)?$/.test(f.clase) && /^\d{4}-\d{2}-\d{2}$/.test(f.fecha))) return c;
  } catch { /* sin almacenamiento */ }
  return null;
}
function guardarCache(flares, t) {
  try { localStorage.setItem(CACHE, JSON.stringify({ t, flares })); } catch { /* sin almacenamiento */ }
}

// Riesgo del juego a partir de una lista de llamaradas (misma fórmula que cargarClimaEspacial).
export function riesgoDe(flares) {
  const nX = flares.filter(f => f.clase[0] === 'X').length;
  const nM = flares.filter(f => f.clase[0] === 'M').length;
  return { riesgo: Math.max(0.6, Math.min(2.5, 0.6 + nM * 0.08 + nX * 0.4)), nX, nM };
}

// Consulta rápida de los últimos días, SIN caché, para vigilar el Sol durante la partida.
// Primero CCMC (no gasta la clave), después api.nasa.gov. Devuelve null si ninguna responde.
export async function consultarRecientes(dias = 2) {
  const fmt = d => d.toISOString().slice(0, 10);
  const fin = new Date(), ini = new Date(Date.now() - dias * 864e5);
  const urls = fuentesURL(fmt(ini), fmt(fin)).reverse();
  for (const url of urls) {
    try { return await pedir(url); } catch (e) { console.warn('[DONKI vigilancia]', url.split('?')[0], e.message); }
  }
  return null;
}

export async function cargarClimaEspacial() {
  const fmt = d => d.toISOString().slice(0, 10);
  const fin = new Date();
  const inicio = new Date(Date.now() - 30 * 864e5);

  // Una consulta real de hace menos de 6 h sigue siendo dato real del último mes: se reutiliza.
  const cache = leerCache();
  let flares = cache?.flares ?? null;
  let consultadoEn = cache ? new Date(cache.t).toISOString() : null;
  let origen = cache ? 'cache' : 'historico';
  let real = flares !== null;
  if (!real) {
    for (const url of fuentesURL(fmt(inicio), fmt(fin))) {
      try {
        flares = await pedir(url); real = true; origen = 'consulta';
        const ahora = Date.now(); consultadoEn = new Date(ahora).toISOString();
        guardarCache(flares, ahora); break;
      }
      catch (e) { console.warn('[DONKI]', url.split('?')[0], e.message); }
    }
  }

  const procedencia = { origen, consultadoEn, desde: fmt(inicio), hasta: fmt(fin) };
  if (!real) {
    return {
      ...procedencia, real: false, tranquilo: false,
      flares: LLAMARADAS_RESPALDO.map(f => ({ ...f })),
      riesgo: 1, nX: 0, nM: 0,
      resumen: 'Sin conexión: usando llamaradas históricas reales de la NASA',
      resumen_en: 'Offline: using real historical NASA flares',
    };
  }
  if (flares.length === 0) return {
    ...procedencia, real: true, tranquilo: true, flares: [], riesgo: 0.5, nX: 0, nM: 0,
    resumen: 'La consulta de los últimos 30 días no devolvió llamaradas. Los ejercicios usan ejemplos históricos.',
    resumen_en: 'The query for the last 30 days returned no flares. Training exercises use historical examples.',
  };
  const nX = flares.filter(f => f.clase[0] === 'X').length;
  const nM = flares.filter(f => f.clase[0] === 'M').length;
  const fuerte = flares.slice().sort((a, b) => fuerza(b.clase) - fuerza(a.clase))[0];
  const riesgo = Math.max(0.6, Math.min(2.5, 0.6 + nM * 0.08 + nX * 0.4));
  const nivel = riesgo < 1 ? 'bajo' : riesgo < 1.6 ? 'medio' : 'ALTO';
  return {
    ...procedencia, real: true, tranquilo: false, flares, riesgo, nX, nM,
    resumen: `${flares.length} llamaradas en los últimos 30 días · la más fuerte ${fuerte.clase} · dificultad del juego ${nivel}`,
    resumen_en: `${flares.length} flares in the last 30 days · strongest ${fuerte.clase} · ${riesgo < 1 ? 'low' : riesgo < 1.6 ? 'medium' : 'HIGH'} game difficulty`,
  };
}
