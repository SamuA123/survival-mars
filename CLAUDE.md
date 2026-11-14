# Survival Mars — NASA Space Apps 2026 (Junior Astronaut Mission Trainer)

Juego isométrico 3D en el navegador para niños de 7-12 años: dirigir una base en Marte
balanceando energía, soporte vital, comida, blindaje contra radiación y retraso de comunicaciones.
**Entrega: 15/11/2026.** Prioridad: que funcione y enseñe trade-offs reales con datos NASA.

## Tecnología
- Three.js por import map desde CDN (sin npm, sin build). ES modules nativos.
- Servir localmente: `python -m http.server 5500 --bind 127.0.0.1` (el puerto 8000 está bloqueado en esta PC).
- Todo el texto del juego en español, lenguaje simple para niños.

## Estructura y dueños (trabajo en paralelo — NO editar carpetas de otra sesión)
| Carpeta | Contenido | Dueño |
|---|---|---|
| `src/sim/` | Simulación pura (sin DOM ni Three.js): estado, reglas, eventos | Sesión A |
| `src/world3d/` | Escena Three.js isométrica, modelos procedurales, animaciones | Sesión A |
| `src/ui/` | HUD, modales, emergencias | Sesión A |
| `src/main.js`, `index.html`, `styles.css` | Arranque | Sesión A |
| `src/data/` | Datos NASA con fuentes (radiación, OSDR, sitio, datos curiosos, DONKI) | Sesión B |
| `docs/` | Documentación para jueces (`DATOS_NASA.md`), guion del video | Sesión B |

## Contratos de `src/data/` (no cambiar nombres de exports ni campos existentes; se pueden AGREGAR)
- `fuentes.js` → `FUENTES[clave] = { nombre, url, uso }`
- `radiacion.js` → `RADIACION.marteSuperficie.valor`, `.llamarada[X|M|C|B|A]`, `.atenuacionAtmosfera`, `.atenuacionBlindaje`, `.limiteMision`
- `salud.js` → `HALLAZGOS = [{ id, tema, texto, fuente, estudio, url }]` (tema: radiacion|comida|oxigeno|ejercicio|sueno)
- `sitio.js` → `SITIO = { nombre, texto, tempMediaC, luzSolarRelativa, retrasoMin, ... }`
- `datos-curiosos.js` → `DATOS[clave] = { texto, fuente }` (claves usadas por la sim: sol, oxigeno, agua, polvo, remolino, llamarada, radiacion, regolito, retraso, conjuncion, invernadero, nuclear, solar, meteorito, bateria, hielo, eva)
- `donki.js` → `cargarClimaEspacial(): Promise<{ real, tranquilo, flares:[{clase, fecha}], riesgo, resumen }>`

## Reglas del reto a respetar
- Ninguna decisión gratis: todo tiene costo.
- Pocos recursos principales (⚡ energía, 🫁 oxígeno, 🥔 comida, ☢️ radiación).
- Atribuir fuentes dentro del juego; datos guardados NUNCA se presentan como "en vivo".
- Explicar términos (sol, mSv, radiación) en el momento.

## Prototipo anterior
`prototipo-v1/` = versión 2D funcional (referencia de balance y eventos). No editar.
