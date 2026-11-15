# 🔴 Survival Mars — Entrenador de Misiones para Astronautas Junior

**NASA Space Apps Challenge 2026 · Reto: *Build a Junior Astronaut Mission Trainer***

### ▶️ Jugar ahora: **https://survival-mars.pages.dev**
Gratis, en el navegador, sin descargas ni cuentas. Funciona en computadoras, tabletas y celulares.

- **English:** https://survival-mars.pages.dev/?lang=en
- **Demo para presentar (3 sols):** https://survival-mars.pages.dev/?demo=1&lang=es
- **Judge demo (English):** https://survival-mars.pages.dev/?demo=1&lang=en
- **Simulacro de alerta solar (para mostrar la alerta):** https://survival-mars.pages.dev/?alerta=1 — se identifica en pantalla como *SIMULACRO*

El modo demo se identifica en pantalla, usa un ejemplo histórico de DONKI, da 30 segundos por emergencia y no guarda insignias.
La partida normal conserva los rangos Cadete (10 sols) y Comandante (15 sols). El idioma se puede cambiar sin reiniciar.

---

## ¿De qué se trata?
Niños y niñas de **7 a 12 años** son comandantes de una base en la **meseta NE Syrtis, al borde de la cuenca Isidis (Marte)**: uno de los 3 sitios finalistas que la NASA estudió para el rover Perseverance.
Tienen que mantener viva a su tripulación hasta que llegue la nave de relevo, tomando las mismas decisiones difíciles
que enfrentan los planificadores de misiones de la NASA. **Ninguna decisión es gratis.**

| Lo que deciden | Lo que aprenden |
|---|---|
| ⚡ Repartir la energía entre oxígeno, invernadero, comunicaciones y laboratorio | No hay energía ilimitada en el espacio |
| 🌪️ ¿Retraer los paneles en una tormenta de polvo? | El polvo reduce la energía solar; Opportunity sufrió una gran tormenta en 2018. Los paneles retráctiles son una regla del juego. |
| ☢️ ¿Refugiarse o seguir trabajando en un escenario inspirado en una llamarada **real** (NASA DONKI)? | Radiación y protección con regolito; el escenario y las dosis son simplificados |
| 🧑‍🚀 ¿Hasta dónde caminar para recoger regolito, hielo de agua o rocas marcianas? | Cada segundo afuera gasta oxígeno y suma radiación |
| 🎒 ¿Volver a depositar con la mochila llena (4 objetos) o soltar algo y seguir? | Más viajes = más tiempo afuera = más radiación |
| 🧱 ¿Qué sección del blindaje construir con el regolito (tecla B)? | Cada sección gasta bolsas y reduce de verdad la radiación dentro del hábitat |
| 🧑‍🚀 ¿Quién de la tripulación sale a caminar? | Cada astronauta lleva su dosímetro: repartir las salidas reparte la dosis |
| 🚨 Llega una alerta solar: ¿seguir trabajando o volver al refugio? | El riesgo depende de la actividad real del Sol (NASA DONKI) |
| 📡 Pedir ayuda a la Tierra… que responde tarde | Los mensajes tardan minutos: la tripulación decide sola |

## Características
- 🌍 **Mundo 3D isométrico** (Three.js) con día y noche, tormentas, astronautas y rover
- 🎓 **Tutorial guiado** y dos rangos: 🧒 **Cadete** (7–9 años) y 🧑‍🚀 **Comandante** (10–12 años)
- 🧑‍🚀 **Caminata espacial jugable** (teclado o joystick táctil): mochila de 4 objetos, recoger y soltar, depositar al entrar por la puerta
- ☢️ **Panel de radiación en la caminata:** nivel actual (bajo, moderado, alto o extremo), exposición, tiempo afuera y protección del lugar
- 🧱 **Modo construcción (tecla B):** blindaje del hábitat por secciones — pared norte, pared sur, paredes este y oeste, techo
- 👩‍🚀 **Tripulación con dosímetros:** Lía, Kofi, Mei y Teo; se elige quién sale y cada uno acumula su propia dosis
- 🚨 **Alerta solar:** indicador del Sol siempre visible y vigilancia de NASA DONKI cada 10 minutos durante la partida
- 🏔️ **Mundo de NE Syrtis:** mesetas con capas de roca, olivino, dron tipo Ingenuity y remolinos de polvo; modo gráficos ligeros 🐢
- ⏱️ **Emergencias** con cuenta regresiva: tormentas, llamaradas, micrometeoritos, fallas y plagas
- 🛰️ **Consultas recientes de NASA DONKI**, caché identificada con fecha y respaldo histórico; estudios reales de **NASA OSDR** con su fuente
- ⚖️ Pronóstico del plan: oxígeno, comida, ciencia y sistemas que perderán energía, antes de nuevas emergencias
- 🧠 Repaso opcional de tres preguntas, con explicación y referencias a las decisiones de la misión
- 🔊 **Narrador por voz**, 📋 informe de misión con gráficas e 🏅 insignias
- 📱 Funciona en celular (vertical y horizontal)

## Controles
| Acción | Teclado | Celular |
|---|---|---|
| Mover al astronauta (caminata) | WASD o flechas | joystick táctil |
| Recoger el objeto cercano | E o Q | botón ✋ Recoger |
| Soltar un objeto de la mochila | R | botón ↩️ Soltar |
| Depositar y entrar a la base (en la puerta) | E | botón 📦 Depositar |
| Abrir el modo construcción | B | botón 🧱 en el panel del hábitat |
| Cerrar / cancelar | Esc | ✕ |

## Datos de la NASA
DONKI (llamaradas: **consulta reciente, caché o archivo histórico**, identificados; más vigilancia cada 10 min durante la partida) · Curiosity RAD · OSDR (13 estudios: OSD-87, 146, 177, 268, 334, 342, 343, 360, 566, 615, 678, 766, 772) · RadLab ·
NE Syrtis (finalista Mars 2020) / Mars Trek · MOXIE · Opportunity · MRO · Conjunción solar · Retraso de comunicaciones.
Detalle completo y simplificaciones: **[docs/DATOS_NASA.md](docs/DATOS_NASA.md)**.

## Documentación
| Documento | Para quién |
|---|---|
| [docs/DATOS_NASA.md](docs/DATOS_NASA.md) | Jueces: qué dato de la NASA alimenta cada mecánica y por qué |
| [docs/GUIA_DOCENTE.md](docs/GUIA_DOCENTE.md) | Docentes: plan de clase, preguntas y bitácora imprimible |
| [docs/PITCH.md](docs/PITCH.md) | Equipo: guion del video y texto de envío |
| [docs/VALIDACION.md](docs/VALIDACION.md) | Pruebas técnicas y protocolo pendiente con niños |
| [docs/RETO.md](docs/RETO.md) · [docs/PLAN.md](docs/PLAN.md) | Equipo: análisis del reto y decisiones |
| [CLAUDE.md](CLAUDE.md) | Desarrolladores: estructura del código |

## Correr localmente
No hay que instalar nada:
```bash
python -m http.server 5500 --bind 127.0.0.1
# abrir http://localhost:5500
```
Se consulta DONKI a través de NASA Open APIs y, si falla, NASA CCMC. Una clave propia de https://api.nasa.gov aumenta el límite de consultas de la primera fuente. La caché dura hasta seis horas y conserva la hora de consulta original. Si ambas fuentes fallan se identifica el archivo histórico. No se predice el clima espacial de Marte.

## Verificación

Sin instalar dependencias del juego (Node 22+):

```bash
node --experimental-default-type=module --test tests/regresiones.mjs
```

Para la verificación visual reproducible con Chrome, consultar [docs/VALIDACION.md](docs/VALIDACION.md).

## For judges

Survival Mars translates NASA data into decisions for ages 7–12: spend limited power on life support or science, shelter at the cost of work, and act while waiting for Earth’s reply. Open `?demo=1&lang=en` for the three-sol presentation mode. NASA observations inspire the scenarios; the difficulty formula, radiation doses and shielding factors are educational game rules, not a forecast for Mars. The optional final review gives feedback on three trade-offs. User learning gains have not yet been measured.

## Tecnología
JavaScript (ES modules, sin compilación) · Three.js (WebGL) · HTML/CSS · Web Speech API (narrador) · Cloudflare Pages.

```
src/sim/      simulación (reglas, eventos, balance)    src/data/   datos NASA con fuentes
src/world3d/  mundo 3D y caminata espacial             src/ui/     interfaz, tutorial, informe, voz
```
