// Datos del lugar de la base.
// Coordenadas de Jezero: verificables en Mars Trek. Sol y luz: NASA Ciencia — Marte.
export const SITIO = {
  nombre: 'Cráter Jezero',
  planeta: 'Marte',
  lat: 18.4, lon: 77.6,
  fuente: 'marsTrek',
  texto: 'Tu base está en el cráter Jezero, donde aterrizó el rover Perseverance en 2021. ¡Hace miles de millones de años aquí había un lago!',
  tempMediaC: -60,            // promedio de Marte; Jezero varía mucho entre día y noche
  luzSolarRelativa: 0.43,     // Marte recibe ~43% de la luz solar que la Tierra
  duracionSol: '24 h 39 min',
  retrasoMin: 12,             // retraso de señal usado en el juego. Real: de 3 a 22 minutos según la distancia
};
