# Plan de trabajo y decisiones

## Decisiones tomadas (y por qué)
| Decisión | Motivo |
|---|---|
| **Marte** (no la Luna) | Pedido del equipo. Además da lecciones reales extra: retraso de 3-22 min, tormentas globales, conjunción solar |
| **Juego 3D isométrico con Three.js**, sin compilación (import map desde CDN) | Se juega en el navegador sin instalar nada; se publica como sitio estático |
| **4 recursos principales** (⚡ energía, 🫁 oxígeno, 🥔 comida, ☢️ radiación) + ❤️ tripulación + 🔬 ciencia | El reto pide pocos recursos. La ciencia es el objetivo que tienta a arriesgarse → ninguna opción es "segura y gratis" |
| **15 sols** por partida | Partidas cortas (10-15 min) para niños y jueces |
| Emergencias con **10 segundos** | Viene del video del reto ("tienes 10 segundos para decidir") |
| Botón "Pedir ayuda a la Tierra" que **llega tarde** | Enseña el retraso de comunicaciones en carne propia |
| Datos guardados marcados "histórico", DONKI marcado "en vivo" | Regla del reto: no presentar datos guardados como en vivo |
| `prototipo-v1/` | Versión 2D anterior; solo referencia, no se edita |

## Mapa del juego (qué enseña cada cosa)
| Mecánica | Lección real | Dónde está |
|---|---|---|
| Presupuesto de energía (solar + reactor + batería) | No hay energía ilimitada | `src/sim/motor.js` → `balance()` |
| Soporte vital (oxígeno + calor) | El aire se fabrica con electricidad | `SISTEMAS.vital` |
| Invernadero | La comida se cultiva | `SISTEMAS.invernadero` |
| Laboratorio / rover | Ciencia vs. riesgo | `SISTEMAS.lab`, `ACCIONES.expedicion` |
| Tormenta de polvo (sols 6-8) | Caso Opportunity 2018 | `EVENTOS.tormenta` |
| Llamarada (DONKI real) + refugio + blindaje de regolito | Radiación y protección | `EVENTOS.llamarada`, `ACCIONES.blindaje` |
| Retraso 12 min + conjunción solar (sols 10-11) | Autonomía de la tripulación | `pedirAyuda()`, `MISION.conjuncion` |

## Ramas y quién hace qué
- `main` → versión estable. Solo se actualiza con Pull Requests.
- `samuel` → **juego**: `src/sim/`, `src/world3d/`, `src/ui/`, `src/main.js`, `index.html`, `styles.css`.
- `jorge` → **datos NASA, documentación y entrega**: `src/data/`, `docs/`, `README.md`.

Regla: no editar las carpetas del otro. Si necesitas algo del otro lado, pídelo (o agrega campos nuevos sin renombrar los existentes; ver contratos en `CLAUDE.md`).

### Tareas de Jorge (rama `jorge`), por prioridad
1. [x] **Clave de API NASA**: clave propia en `src/data/donki.js` (`NASA_API_KEY`), commit `dfe0c6c`. Si falla, el juego usa el servidor CCMC sin clave, la caché de 6 h y el archivo histórico.
2. [x] **`src/data/salud.js`**: 6-10 estudios reales de OSDR (con ID OSD-xxx y URL) sobre radiación, huesos/músculos, plantas/comida, sueño y oxígeno. Textos para niños de 7 a 12 años. *Hecho: 13 estudios (OSD-87, 146, 177, 268, 334, 342, 343, 360, 566, 615, 678, 766, 772), en ES/EN.*
3. [x] **`src/data/radiacion.js`**: verificar valores (Curiosity RAD en Marte, RadLab en la ISS) y citar la fuente exacta de cada uno.
4. [x] **`src/data/datos-curiosos.js` y `sitio.js`**: verificar cada dato y corregir lo inexacto (sitio cambiado a la meseta NE Syrtis · Isidis Planitia, con panel 📍 Ubicación y mapas de Mars Trek).
5. [x] **`docs/DATOS_NASA.md`**: para los jueces. Qué datasets usamos, en qué mecánica y por qué, con links; qué es en vivo y qué es guardado.
6. [x] **`README.md`**: reescribirlo para la versión 3D (cómo jugar, cómo correrlo, capturas).
7. [x] **`docs/PITCH.md`**: guion de un video de 2 minutos y texto de envío para Space Apps.
8. [~] **Probar el juego**: pruebas automáticas (`tests/regresiones.mjs` y `tests/mecanicas.mjs`) y recorridos en Chrome sin interfaz hechos (`docs/VALIDACION.md`). *Pendiente: prueba con niños.*
9. [ ] (Opcional) `src/data/donki.js`: funciones nuevas para CME (`DONKI/CME`) y tormentas geomagnéticas (`DONKI/GST`), sin cambiar `cargarClimaEspacial()`.

### Tareas de Samuel (rama `samuel`)
1. [x] Tutorial guiado en el Sol 1.
2. [x] Probar tormenta, expedición y una partida completa; ajustar el balance (`src/sim/config.js`).
3. [~] Aplicar el feedback de las pruebas (se aplicó el de las pruebas técnicas; falta el de niños).
4. [x] Versión en inglés con botón 🌐 ES/EN (y `?lang=en`).
5. [x] Publicación: Cloudflare Pages conectado a GitHub. `main` → https://survival-mars.pages.dev (automático); cada rama → `https://<rama>.survival-mars.pages.dev`.

### Hecho después del plan original (ideas del grupo y extras)
- [x] Mundo 3D: geología de NE Syrtis (mesetas en capas, olivino), dron tipo Ingenuity, remolinos lejanos, modo gráficos ligeros 🐢.
- [x] Caminata: mochila de 4 objetos (E/Q recoger, R soltar), depositar al entrar por la puerta; panel de radiación (nivel, exposición, tiempo afuera, protección).
- [x] Modo construcción (tecla B): blindaje del hábitat por secciones (pared norte, sur, este/oeste, techo), con costo en regolito y protección real.
- [x] Alerta solar: indicador permanente y vigilancia de NASA DONKI cada 10 min; `?alerta=1` para un simulacro identificado.
- [x] Tripulación con dosímetros: Lía, Kofi, Mei y Teo; se elige quién sale a caminar; la dosis de la caminata es solo de quien sale.
- [x] Narrador por voz, dificultad Cadete/Comandante, informe de misión, insignias, modo demo (`?demo=1`), repaso final.
- [x] Mejoras de la revisión externa (PR #8): riesgo solar en vivo durante la caminata, indicador solar que separa lo observado por la NASA del riesgo del juego, textos de regolito con los costos reales (3/3/4/4), panel de la caminata compacto en celular horizontal y pruebas de mecánicas (`tests/mecanicas.mjs`).
- [x] Cada sección de blindaje tiene su razón: las paredes frenan más el fondo diario y el techo frena más las llamaradas (rama `samuel-secciones`; ver `docs/DATOS_NASA.md` 2.2b). *Falta mostrar la diferencia en la ventana de construcción.*
- [ ] Prueba con niños (protocolo en `docs/VALIDACION.md`).
- [ ] Grabar el video y completar el formulario de Space Apps (`docs/PITCH.md`).

## Flujo de git
```
git switch <tu-rama>
git pull origin main          # traer lo último ya integrado
# ... trabajar ...
git add <tus carpetas> && git commit -m "..." && git push
# En GitHub: Pull Request <tu-rama> -> main
```
