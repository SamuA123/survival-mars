// =====================================================================
//  NARRADOR POR VOZ — lee los textos en voz alta (para niños que leen lento).
//  Usa la voz del navegador (speechSynthesis): sin archivos ni costo.
//  Se engancha solo: agrega botones 🔈 a emergencias, resúmenes, datos,
//  tarjetas de la caminata y el tutorial. Botón "🗣️" arriba = leer todo solo.
// =====================================================================
import { t, idioma, onIdioma } from './i18n.js';

const CLAVE = 'survivalMars.narrador';
const sintesis = window.speechSynthesis;
let vozES = null;
let auto = (() => { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } })();

// Bloques que se pueden escuchar (selector → dónde va el botón)
const LEIBLES = [
  '#modalCaja .evento > p', '#modalCaja .res', '#modalCaja .dato', '#modalCaja .lineas',
  '#modalCaja .intro > p', '#modalCaja .final > p', '#modalCaja .comparador',
  '.eva-tarjeta', '.tuto-txt', '.eva-aviso',
];

// Elige una voz del idioma actual (español o inglés)
function elegirVoz() {
  if (!sintesis) return;
  const voces = sintesis.getVoices();
  vozES = idioma === 'en'
    ? (voces.find(v => /^en[-_]US/i.test(v.lang)) || voces.find(v => /^en/i.test(v.lang)) || null)
    : (voces.find(v => /es[-_](MX|US|419|CO|AR)/i.test(v.lang)) || voces.find(v => /^es/i.test(v.lang)) || null);
}

// Texto limpio para hablar: sin emojis, con unidades dichas en palabras
function limpiar(s) {
  const en = idioma === 'en';
  return s
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '')
    .replace(/\bmSv\b/g, en ? 'millisieverts' : 'milisievert')
    .replace(/\bkWh\b/g, en ? 'kilowatt hours' : 'kilovatios hora')
    .replace(/\bEVA\b/g, en ? 'spacewalk' : 'caminata espacial')
    .replace(/(\d+)\s*%/g, en ? '$1 percent' : '$1 por ciento')
    .replace(/[▶▲▼＝·•→]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hablar(texto) {
  if (!sintesis || !texto) return;
  sintesis.cancel();
  const u = new SpeechSynthesisUtterance(limpiar(texto));
  u.lang = vozES?.lang || (idioma === 'en' ? 'en-US' : 'es-MX');
  if (vozES) u.voice = vozES;
  u.rate = 0.95; u.pitch = 1.05;
  sintesis.speak(u);
}
export const callar = () => sintesis?.cancel();

function textoDe(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll('.btn-voz, button, .fuente, a').forEach(x => x.remove());
  return c.innerText || c.textContent || '';
}

function agregarBotones(raiz = document) {
  for (const sel of LEIBLES) {
    raiz.querySelectorAll?.(sel).forEach(el => {
      if (el.querySelector(':scope > .btn-voz') || !textoDe(el).trim()) return;
      const b = document.createElement('button');
      b.className = 'btn-voz'; b.type = 'button';
      b.title = t('voz.escuchar'); b.setAttribute('aria-label', t('voz.aria'));
      b.textContent = '🔈';
      b.addEventListener('click', e => { e.stopPropagation(); hablar(textoDe(el)); });
      el.prepend(b);
    });
  }
}

// Al abrir un modal: si el narrador automático está activo, leer título + texto principal
let ultimoLeido = '';
function leerModal() {
  const caja = document.querySelector('#modalCaja');
  if (!auto || !caja || document.querySelector('#modal')?.classList.contains('oculto')) return;
  const partes = [caja.querySelector('h1, h2'), caja.querySelector('.evento > p, .intro > p, .final > p, .lineas')]
    .filter(Boolean).map(textoDe);
  const t = partes.join('. ');
  if (t && t !== ultimoLeido) { ultimoLeido = t; hablar(t); }
}

function botonAuto() {
  const cont = document.querySelector('.botones-top');
  if (!cont || cont.querySelector('#btnNarrador')) return;
  const b = document.createElement('button');
  b.id = 'btnNarrador'; b.className = 'chip-btn';
  const pintar = () => { b.textContent = auto ? t('voz.on') : t('voz.off'); b.title = t('voz.t'); b.classList.toggle('activo-voz', auto); };
  b.onclick = () => {
    auto = !auto; pintar();
    try { localStorage.setItem(CLAVE, auto ? '1' : '0'); } catch { /* sin almacenamiento */ }
    if (auto) hablar(t('voz.activado')); else callar();
  };
  pintar();
  onIdioma(() => { pintar(); elegirVoz(); callar(); });
  cont.prepend(b);
}

function estilos() {
  const s = document.createElement('style');
  s.textContent = `
    .btn-voz { float: right; margin: 0 0 4px 8px; width: 34px; height: 34px; border-radius: 50%;
      border: 1px solid rgba(92,200,255,.6); background: rgba(92,200,255,.15); font-size: 16px; line-height: 1; cursor: pointer; }
    .btn-voz:hover { background: rgba(92,200,255,.35); }
    .eva-tarjeta .btn-voz, .tuto-txt .btn-voz { background: #e6f6ff; }
    #btnNarrador.activo-voz { border-color: var(--azul, #5cc8ff); background: rgba(92,200,255,.25); }`;
  document.head.appendChild(s);
}

if (sintesis) {
  elegirVoz();
  sintesis.addEventListener?.('voiceschanged', elegirVoz);
  estilos();
  botonAuto();
  agregarBotones();
  let pendiente = false;
  new MutationObserver(() => {
    if (pendiente) return;
    pendiente = true;
    setTimeout(() => { pendiente = false; botonAuto(); agregarBotones(); leerModal(); }, 120);
  }).observe(document.body, { childList: true, subtree: true });
  // Si se cierra el modal, dejar de hablar
  new MutationObserver(() => { if (document.querySelector('#modal')?.classList.contains('oculto')) { ultimoLeido = ''; } })
    .observe(document.querySelector('#modal') || document.body, { attributes: true, attributeFilter: ['class'] });
}
