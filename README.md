# 🔴 Survival Mars — Entrenador de Misiones para Astronautas Junior

**NASA Space Apps Challenge 2026 · Reto: *Build a Junior Astronaut Mission Trainer***

### ▶️ Jugar ahora: **https://survival-mars.pages.dev**
Gratis, en el navegador, sin descargas ni cuentas. Funciona en computadoras, tabletas y celulares.

---

## ¿De qué se trata?
Niños y niñas de **7 a 12 años** son comandantes de una base en el **cráter Jezero, en Marte** (donde aterrizó Perseverance).
Tienen que mantener viva a su tripulación hasta que llegue la nave de relevo, tomando las mismas decisiones difíciles
que enfrentan los planificadores de misiones de la NASA. **Ninguna decisión es gratis.**

| Lo que deciden | Lo que aprenden |
|---|---|
| ⚡ Repartir la energía entre oxígeno, invernadero, comunicaciones y laboratorio | No hay energía ilimitada en el espacio |
| 🌪️ ¿Retraer los paneles en una tormenta de polvo? | Le pasó de verdad al rover Opportunity en 2018 |
| ☢️ ¿Refugiarse o seguir trabajando cuando llega una llamarada **real** (NASA DONKI)? | Radiación y protección con regolito |
| 🧑‍🚀 ¿Hasta dónde caminar para recoger regolito, hielo de agua o rocas marcianas? | Cada segundo afuera gasta oxígeno y suma radiación |
| 📡 Pedir ayuda a la Tierra… que responde tarde | Los mensajes tardan minutos: la tripulación decide sola |

## Características
- 🌍 **Mundo 3D isométrico** (Three.js) con día y noche, tormentas, astronautas y rover
- 🎓 **Tutorial guiado** y dos rangos: 🧒 **Cadete** (7–9 años) y 🧑‍🚀 **Comandante** (10–12 años)
- 🧑‍🚀 **Caminata espacial jugable** (teclado o joystick táctil) con recolección
- ⏱️ **Emergencias** con cuenta regresiva: tormentas, llamaradas, micrometeoritos, fallas y plagas
- 🛰️ **Datos en vivo de NASA DONKI** y hallazgos de **estudios reales de NASA OSDR** con su fuente
- 🔊 **Narrador por voz**, 📋 informe de misión con gráficas e 🏅 insignias
- 📱 Funciona en celular (vertical y horizontal)

## Datos de la NASA
DONKI (llamaradas, **en vivo**) · Curiosity RAD · OSDR (OSD-566, 343, 766, 678, 342, 177, 87) · RadLab ·
Mars 2020 / Mars Trek · MOXIE · Opportunity · MRO · Conjunción solar · Retraso de comunicaciones.
Detalle completo y simplificaciones: **[docs/DATOS_NASA.md](docs/DATOS_NASA.md)**.

## Documentación
| Documento | Para quién |
|---|---|
| [docs/DATOS_NASA.md](docs/DATOS_NASA.md) | Jueces: qué dato de la NASA alimenta cada mecánica y por qué |
| [docs/GUIA_DOCENTE.md](docs/GUIA_DOCENTE.md) | Docentes: plan de clase, preguntas y bitácora imprimible |
| [docs/PITCH.md](docs/PITCH.md) | Equipo: guion del video y texto de envío |
| [docs/RETO.md](docs/RETO.md) · [docs/PLAN.md](docs/PLAN.md) | Equipo: análisis del reto y decisiones |
| [CLAUDE.md](CLAUDE.md) | Desarrolladores: estructura del código |

## Correr localmente
No hay que instalar nada:
```bash
python -m http.server 5500 --bind 127.0.0.1
# abrir http://localhost:5500
```
Para que las llamaradas salgan **en vivo**, poner una clave gratuita de https://api.nasa.gov en `src/data/donki.js` (`NASA_API_KEY`).

## Tecnología
JavaScript (ES modules, sin compilación) · Three.js (WebGL) · HTML/CSS · Web Speech API (narrador) · Cloudflare Pages.

```
src/sim/      simulación (reglas, eventos, balance)    src/data/   datos NASA con fuentes
src/world3d/  mundo 3D y caminata espacial             src/ui/     interfaz, tutorial, informe, voz
```
