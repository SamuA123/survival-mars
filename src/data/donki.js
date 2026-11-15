// CLIMA ESPACIAL REAL — NASA DONKI (llamaradas solares: lista FLR o, si falla, notificaciones FLR).
// Docs: https://api.nasa.gov  ->  DONKI
// Pongan aquí su clave gratuita de https://api.nasa.gov (DEMO_KEY tiene un límite muy bajo y se agota).
export const NASA_API_KEY = 'HjCjLhdBH6RmpKmmBdC9K7dhWWdqdkRGpbNJdbdJ';

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

// Tres puertas a datos reales de DONKI, en este orden:
//  1. api.nasa.gov FLR (con clave): todas las llamaradas. En nov. 2026 esta ruta respondía 404 (fallo de la NASA).
//  2. api.nasa.gov notificaciones FLR (con clave): solo las llamaradas FUERTES que la NASA anunció (clase M5 o más).
//  3. Servidor CCMC (sin clave): todas las llamaradas. Algunas redes (p. ej. universidades) lo bloquean.
// Cada fuente dice si trae todas las llamaradas o solo las fuertes, para que el juego lo cuente con honestidad.
const fuentesURL = (ini, fin) => [
  { url: `https://api.nasa.gov/DONKI/FLR?startDate=${ini}&endDate=${fin}&api_key=${NASA_API_KEY}`, leer: leerFLR, soloFuertes: false },
  { url: `https://api.nasa.gov/DONKI/notifications?startDate=${ini}&endDate=${fin}&type=FLR&api_key=${NASA_API_KEY}`, leer: leerAvisos, soloFuertes: true },
  { url: `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=${ini}&endDate=${fin}`, leer: leerFLR, soloFuertes: false },
];

const CLASE = /^[ABCMX]\d+(\.\d+)?$/;

// Lista de llamaradas (FLR): [{ classType, peakTime, beginTime }]
function leerFLR(data) {
  return data
    .filter(f => f && CLASE.test(f.classType))
    .map(f => ({ clase: f.classType, fecha: (f.peakTime || f.beginTime || '').slice(0, 10) }));
}

// Notificaciones FLR: texto con "Flare intensity: X1.0 class." y "Flare peak time: 2024-05-08T01:41Z."
// Los avisos de "cruce de umbral" no traen la clase final y se ignoran. Una llamarada = un Activity ID.
function leerAvisos(data) {
  const vistas = new Map();
  for (const m of data) {
    const txt = typeof m?.messageBody === 'string' ? m.messageBody : '';
    const clase = txt.match(/Flare intensity:\s*([ABCMX]\d+(?:\.\d+)?)\s*class/i)?.[1];
    const pico = txt.match(/Flare peak time:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
    if (!clase || !pico || !CLASE.test(clase)) continue;
    const id = txt.match(/Activity ID:\s*(\S+?)\.?\s*$/m)?.[1] || `${pico}-${clase}`;
    const previa = vistas.get(id);
    if (!previa || fuerza(clase) > fuerza(previa.clase)) vistas.set(id, { clase, fecha: pico });   // la actualización más alta
  }
  return [...vistas.values()];
}

async function pedir(fuente) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(fuente.url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Respuesta DONKI no válida');
    return fuente.leer(data);
  } finally { clearTimeout(t); }
}
const sinClave = url => url.split('?')[0];

function leerCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE));
    if (c && Number.isFinite(c.t) && c.t <= Date.now() && Date.now() - c.t < CACHE_HORAS * 3600e3
      && Array.isArray(c.flares) && c.flares.every(f => /^[ABCMX]\d+(\.\d+)?$/.test(f.clase) && /^\d{4}-\d{2}-\d{2}$/.test(f.fecha))) return c;
  } catch { /* sin almacenamiento */ }
  return null;
}
function guardarCache(flares, t, soloFuertes = false) {
  try { localStorage.setItem(CACHE, JSON.stringify({ t, flares, soloFuertes })); } catch { /* sin almacenamiento */ }
}

// Riesgo del juego a partir de una lista de llamaradas (misma fórmula que cargarClimaEspacial).
export function riesgoDe(flares) {
  const nX = flares.filter(f => f.clase[0] === 'X').length;
  const nM = flares.filter(f => f.clase[0] === 'M').length;
  return { riesgo: Math.max(0.6, Math.min(2.5, 0.6 + nM * 0.08 + nX * 0.4)), nX, nM };
}

// Consulta rápida de los últimos días, SIN caché, para vigilar el Sol durante la partida.
// Mismo orden de fuentes que la carga inicial. Devuelve null si ninguna responde.
export async function consultarRecientes(dias = 2) {
  const fmt = d => d.toISOString().slice(0, 10);
  const fin = new Date(), ini = new Date(Date.now() - dias * 864e5);
  for (const fuente of fuentesURL(fmt(ini), fmt(fin))) {
    try { return await pedir(fuente); } catch (e) { console.warn('[DONKI vigilancia]', sinClave(fuente.url), e.message); }
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
  let soloFuertes = !!cache?.soloFuertes;
  let real = flares !== null;
  if (!real) {
    for (const fuente of fuentesURL(fmt(inicio), fmt(fin))) {
      try {
        flares = await pedir(fuente); real = true; origen = 'consulta'; soloFuertes = fuente.soloFuertes;
        const ahora = Date.now(); consultadoEn = new Date(ahora).toISOString();
        guardarCache(flares, ahora, soloFuertes); break;
      }
      catch (e) { console.warn('[DONKI]', sinClave(fuente.url), e.message); }
    }
  }

  const procedencia = { origen, consultadoEn, soloFuertes, desde: fmt(inicio), hasta: fmt(fin) };
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
    resumen: soloFuertes
      ? 'La NASA no anunció llamaradas fuertes (clase M5 o más) en los últimos 30 días: el Sol está tranquilo. Los ejercicios usan ejemplos históricos.'
      : 'La consulta de los últimos 30 días no devolvió llamaradas. Los ejercicios usan ejemplos históricos.',
    resumen_en: soloFuertes
      ? 'NASA announced no strong flares (class M5 or above) in the last 30 days: the Sun is quiet. Training exercises use historical examples.'
      : 'The query for the last 30 days returned no flares. Training exercises use historical examples.',
  };
  const nX = flares.filter(f => f.clase[0] === 'X').length;
  const nM = flares.filter(f => f.clase[0] === 'M').length;
  const fuerte = flares.slice().sort((a, b) => fuerza(b.clase) - fuerza(a.clase))[0];
  const riesgo = Math.max(0.6, Math.min(2.5, 0.6 + nM * 0.08 + nX * 0.4));
  const nivel = riesgo < 1 ? 'bajo' : riesgo < 1.6 ? 'medio' : 'ALTO';
  return {
    ...procedencia, real: true, tranquilo: false, flares, riesgo, nX, nM,
    resumen: `${flares.length} llamaradas${soloFuertes ? ' fuertes (M5 o más)' : ''} en los últimos 30 días · la más fuerte ${fuerte.clase} · dificultad del juego ${nivel}`,
    resumen_en: `${flares.length}${soloFuertes ? ' strong (M5+)' : ''} flares in the last 30 days · strongest ${fuerte.clase} · ${riesgo < 1 ? 'low' : riesgo < 1.6 ? 'medium' : 'HIGH'} game difficulty`,
  };
}
