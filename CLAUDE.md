# Survival Mars — NASA Space Apps 2026 (Junior Astronaut Mission Trainer)

Juego isométrico 3D en el navegador para niños de 7 a 12 años: dirigir una base en Marte (meseta NE Syrtis · Isidis Planitia)
balanceando energía, soporte vital, comida, blindaje contra radiación y retraso de comunicaciones.
**Entrega: 15/11/2026.** Prioridad: que funcione y enseñe trade-offs reales con datos de la NASA.

**Antes de trabajar, lee:**
- `docs/equipo/RETO.md`: qué pide el reto, criterios de los jueces y recursos NASA oficiales.
- `docs/equipo/PLAN.md`: decisiones tomadas, ramas, quién hace qué y lista de tareas.

## Tecnología
- Three.js por import map desde CDN (sin npm, sin build). ES modules nativos.
- Servir localmente: `python -m http.server 5500 --bind 127.0.0.1`. En la PC de Samuel el puerto 8000 está bloqueado.
- Todo el texto visible del juego en español e inglés, con lenguaje simple para niños. Mantener ambos idiomas al agregar pantallas o mensajes; el cambio debe conservar la partida.

## Estructura y dueños (trabajo en paralelo: NO editar carpetas del otro)
| Carpeta | Contenido | Rama / dueño |
|---|---|---|
| `src/sim/` | Simulación pura (sin DOM ni Three.js): `config.js` (balance), `motor.js` (reglas, eventos, acciones) | `samuel` |
| `src/world3d/` | Escena Three.js isométrica (`mundo.js`) | `samuel` |
| `src/ui/` | HUD, modales, sonido | `samuel` |
| `src/main.js`, `index.html`, `styles.css` | Arranque y estilos | `samuel` |
| `src/data/` | Datos NASA con fuentes | `jorge` |
| `docs/`, `README.md` | Documentación para jueces, pitch, feedback | `jorge` |

## Contratos de `src/data/` (no renombrar exports ni campos existentes; sí se pueden AGREGAR)
- `fuentes.js` → `FUENTES[clave] = { nombre, url, uso }`
- `radiacion.js` → `RADIACION.marteSuperficie.valor`, `.llamarada[X|M|C|B|A]`, `.atenuacionAtmosfera`, `.atenuacionBlindaje`, `.limiteMision`
- `salud.js` → `HALLAZGOS = [{ id, tema, texto, fuente, estudio, url }]` (tema: radiacion|comida|oxigeno|ejercicio|sueno)
- `sitio.js` → `SITIO = { nombre, texto, tempMediaC, luzSolarRelativa, retrasoMin, ... }`
- `datos-curiosos.js` → `DATOS[clave] = { texto, fuente }` (claves que usa la simulación: sol, oxigeno, agua, polvo, remolino, llamarada, radiacion, regolito, retraso, conjuncion, invernadero, nuclear, solar, meteorito, bateria, hielo, eva)
- `donki.js` → `cargarClimaEspacial(): Promise<{ real, tranquilo, flares:[{clase, fecha}], riesgo, resumen }>`, `LLAMARADAS_RESPALDO`, `NASA_API_KEY`

## Reglas del reto a respetar
- Ninguna decisión gratis: todo tiene costo.
- Pocos recursos principales (⚡ energía, 🫁 oxígeno, 🥔 comida, ☢️ radiación).
- Atribuir fuentes dentro del juego; los datos guardados NUNCA se presentan como "en vivo".
- Explicar términos (sol, mSv, radiación) en el momento.

## Git y publicación
- `main` estable; se trabaja en una rama propia y se integra por Pull Request.
- Hacer commit solo de las carpetas propias.
- **Publicación automática:** Cloudflare Pages está conectado a GitHub.
  - Todo lo que entra a `main` se publica solo en https://survival-mars.pages.dev (tarda ~1 minuto).
  - Cada otra rama tiene su vista previa en `https://<rama>.survival-mars.pages.dev` (p. ej. `samuel-qa.survival-mars.pages.dev`).
  - No hace falta subir zips a mano.

## Prototipo anterior
`prototipo-v1/` = versión 2D (referencia de balance y eventos). No editar.
