// CLIMA ESPACIAL REAL — NASA DONKI (llamaradas solares, FLR).
// Docs: https://api.nasa.gov  ->  DONKI
// Pongan aquí su clave gratuita de https://api.nasa.gov (DEMO_KEY tiene un límite muy bajo).
export const NASA_API_KEY = 'DEMO_KEY';

// Llamaradas históricas reales: se usan si no hay conexión. Se muestran como "históricas", nunca como "en vivo".
export const LLAMARADAS_RESPALDO = [
  { clase: 'X9.0', fecha: '2024-10-03' },
  { clase: 'X8.7', fecha: '2024-05-14' },
  { clase: 'X2.2', fecha: '2024-05-09' },
  { clase: 'X1.1', fecha: '2024-06-01' },
  { clase: 'M5.0', fecha: '2024-02-21' },
  { clase: 'M2.3', fecha: '2024-08-01' },
  { clase: 'M1.4', fecha: '2024-09-12' },
  { clase: 'C8.0', fecha: '2024-07-20' },
];

export function fuerza(clase) {
  const base = { A: 0.01, B: 0.1, C: 1, M: 10, X: 100 }[clase[0]] || 1;
  return base * (parseFloat(clase.slice(1)) || 1);
}

export async function cargarClimaEspacial() {
  const fmt = d => d.toISOString().slice(0, 10);
  const fin = new Date();
  const inicio = new Date(Date.now() - 30 * 864e5);
  const url = `https://api.nasa.gov/DONKI/FLR?startDate=${fmt(inicio)}&endDate=${fmt(fin)}&api_key=${NASA_API_KEY}`;

  let flares = null, real = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    flares = (Array.isArray(data) ? data : [])
      .filter(f => f.classType)
      .map(f => ({ clase: f.classType, fecha: (f.peakTime || f.beginTime || '').slice(0, 10) }));
    real = true;
  } catch (e) {
    console.warn('[DONKI] usando respaldo histórico:', e.message);
  }

  if (!flares || flares.length === 0) {
    const tranquilo = real && flares && flares.length === 0;
    return {
      real, tranquilo,
      flares: LLAMARADAS_RESPALDO.map(f => ({ ...f })),
      riesgo: tranquilo ? 0.5 : 1,
      resumen: tranquilo
        ? 'Sol tranquilo: 0 llamaradas en 30 días (NASA DONKI, en vivo)'
        : 'Sin conexión: usando llamaradas históricas reales de la NASA',
    };
  }
  const nX = flares.filter(f => f.clase[0] === 'X').length;
  const nM = flares.filter(f => f.clase[0] === 'M').length;
  const fuerte = flares.slice().sort((a, b) => fuerza(b.clase) - fuerza(a.clase))[0];
  const riesgo = Math.max(0.6, Math.min(2.5, 0.6 + nM * 0.08 + nX * 0.4));
  const nivel = riesgo < 1 ? 'bajo' : riesgo < 1.6 ? 'medio' : 'ALTO';
  return {
    real: true, tranquilo: false, flares, riesgo,
    resumen: `En vivo: ${flares.length} llamaradas en 30 días · la más fuerte ${fuerte.clase} · riesgo ${nivel}`,
  };
}
