# Pitch y envío — Survival Mars

> Revisar en la página del equipo de Space Apps los campos y límites exactos del formulario de envío antes de pegar.

## Recorrido listo para presentar

Abrir **https://survival-mars.pages.dev/?demo=1&lang=en** una vez que estos cambios estén desplegados. En local usar `http://localhost:5500/?demo=1&lang=en`.

1. **Sol 1 — energía:** abrir Base control y encender el laboratorio. Mostrar el pronóstico de oxígeno, comida y ciencia. El laboratorio consume la misma energía que necesitan los otros sistemas.
2. **Sol 2 — protección y autonomía:** aparece una llamarada histórica del 3 de octubre de 2024. Pedir ayuda: la respuesta llega tarde. Elegir refugio y mostrar el costo en trabajo y cosecha.
3. **Sol 3 — tormenta:** elegir entre proteger los paneles o conservar parte de la producción solar. Mostrar la consecuencia y terminar con una pregunta del repaso.

El modo se identifica como demostración, usa datos históricos y da 30 segundos por emergencia para explicar la decisión. No requiere cambiar el estado desde la consola ni depende de DONKI. La secuencia de eventos es fija; las caminatas siguen siendo opcionales.

**Narración breve en inglés:**

“Survival Mars turns NASA data into decisions children can experience. More science uses power that life support also needs. Shelter reduces radiation exposure, but the crew gives up a day of work. Earth’s advice takes minutes to arrive, so the child must decide. We use NASA DONKI observations, Curiosity measurements and linked OSDR studies. The scenarios and doses are simplified learning rules, not a forecast for Mars. At the end, children explain three trade-offs and receive feedback.”

No afirmar mejoras de aprendizaje hasta completar la prueba de usuarios de `VALIDACION.md`.

## 1. Guion del video (2 minutos)

| Tiempo | En pantalla | Narración (ES) |
|---|---|---|
| 0:00–0:12 | Logo + escena 3D de la base en NE Syrtis, amaneciendo | "Es el Sol 6 en Marte. Llega una tormenta de polvo. Tienes 10 segundos: ¿retraes los paneles y pierdes energía esta noche… o te arriesgas a perderlos para siempre?" |
| 0:12–0:25 | Modal de la tormenta con la cuenta regresiva | "Eso le pasó de verdad al rover Opportunity en 2018. Así es **Survival Mars**: un entrenador de misiones para niños de 7 a 12 años." |
| 0:25–0:45 | Tocar el hábitat, botones − / +, barra de energía en rojo | "El niño es comandante de una base en la meseta NE Syrtis, uno de los sitios que la NASA estudió para Perseverance. Reparte energía entre oxígeno, comida, comunicaciones y ciencia. **Nada es gratis**: encender el laboratorio deja menos energía para el oxígeno." |
| 0:45–1:05 | Caminata espacial: el astronauta camina, recoge una roca, aparece la tarjeta; sube la radiación | "Puede salir a explorar: recoger regolito para el blindaje, hielo de agua para fabricar oxígeno y rocas marcianas para la ciencia. Pero cada segundo afuera gasta oxígeno del traje y suma radiación." |
| 1:05–1:25 | Alerta de llamarada con "Basada en una llamarada real que la NASA detectó el…" | "El ejemplo viene de una observación real de NASA. Usamos esa actividad solar para inspirar escenarios de entrenamiento; las dosis y la dificultad están simplificadas." |
| 1:25–1:40 | Botón "Pedir ayuda": "tu mensaje tarda 12 minutos…" | "¿Pedir ayuda a la Tierra? El mensaje tarda minutos en llegar. En Marte, la tripulación decide sola." |
| 1:40–1:52 | Resumen del sol con la tarjeta de OSDR + panel 📡 Datos NASA | "Cada consecuencia muestra un estudio real de la NASA, con su fuente, para que niños y maestros puedan comprobarlo." |
| 1:52–2:00 | Pantalla final con estrellas + link | "Se juega en el navegador, sin descargas ni cuentas. **survival-mars.pages.dev**. ¿Estás listo para el asiento del comandante?" |

**Consejos de grabación:** usar la versión publicada; borrar `localStorage` para que salga el tutorial; grabar a 1080p;
para mostrar la secuencia corta, usar el modo `?demo=1` identificado en pantalla.

## 2. Texto de envío (English — for judges)

**Project name:** Survival Mars — Junior Astronaut Mission Trainer

**High-level summary (≈150 words):**
Survival Mars is a free, browser-based 3D isometric game where kids aged 7–12 command a base on the NE Syrtis plateau at the edge of Isidis Planitia, Mars (a NASA Mars 2020 finalist landing site),
for 15 sols. They split a limited power budget between life support, food production, communications and science;
take spacewalks to collect regolith (radiation shielding), water ice (oxygen) and Martian rocks (science) while their
suit oxygen drains and radiation builds up; and make 10-second decisions during emergencies such as global dust storms,
micrometeorite impacts and solar flares. No choice is free: every gain in science costs energy, oxygen or radiation dose.
Solar-flare risk comes **live from NASA's DONKI API**, and every consequence cites real NASA science — Curiosity RAD
measurements, OSDR biology studies (with OSD IDs), MOXIE, Opportunity and more — inside the game. A 12-minute
communication delay and a solar-conjunction blackout teach why Mars crews must act autonomously.

**How it addresses the challenge:**
- All five required trade-offs: life support, radiation shielding, power budgeting, food production, communication delay.
- Few core resources (energy, oxygen, food, radiation) plus crew health and a science goal.
- No "safe" choice: playing passively survives but earns 1 star; reckless science loses to radiation. Balance validated with 300 simulated games per strategy.
- Replayable: random events, real space weather and different strategies; failure explains what happened instead of punishing.
- Plain language, guided tutorial, touch joystick; runs in any modern browser with no account.

**NASA data used:** DONKI (live solar flares), Curiosity RAD (Hassler et al. 2014), OSDR studies OSD-566, OSD-343, OSD-766,
OSD-678, OSD-342, OSD-177, OSD-87, OSDR RadLab, Mars 2020 landing-site studies / Mars Trek (NE Syrtis), MOXIE, Opportunity, MRO impact survey,
Mars solar conjunction, NASA HRP communication delay. Full mapping: `docs/DATOS_NASA.md`.

**Space agency partner resources:** Canadian Space Agency — food production in space (greenhouse mechanic).

**Tools:** JavaScript, Three.js (WebGL), HTML/CSS, Cloudflare Pages, GitHub.

**Use of AI:** We used an AI coding assistant (Claude) to help write code, check NASA sources and draft documentation.
The team designed the game, reviewed and tested the results, and verified the data against the cited NASA sources.

## 3. Resumen en español (para presentar)
Survival Mars es un juego 3D gratuito en el navegador donde niños de 7 a 12 años dirigen una base en la meseta NE Syrtis (Isidis Planitia)
durante 15 sols. Reparten energía entre oxígeno, comida, comunicaciones y ciencia; salen en caminatas espaciales a
recoger regolito, hielo de agua y rocas marcianas mientras se gasta el oxígeno del traje; y deciden en 10 segundos
ante tormentas de polvo, meteoritos y llamaradas solares. El riesgo de llamaradas viene **en vivo** de la base de datos
DONKI de la NASA, y cada consecuencia cita ciencia real de la NASA (Curiosity, OSDR, MOXIE, Opportunity). Ninguna
decisión es gratis: así aprenden la lógica real de cómo se mantiene viva a una tripulación lejos de la Tierra.
