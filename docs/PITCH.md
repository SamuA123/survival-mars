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
| 0:45–1:00 | Elegir quién sale (4 dosímetros) → caminata: recoger regolito con **E**, mochila 4/4, panel ☢️ "Radiación actual · Exposición · Afuera" | "Antes de salir, elige quién va: cada astronauta lleva su propio dosímetro. Afuera recoge regolito, hielo y rocas en una mochila de 4 objetos. El panel muestra la radiación de ahora y cuánto lleva acumulado. Cada segundo afuera cuesta oxígeno y dosis." |
| 1:00–1:12 | En la puerta: "📦 Depositar 4 y entrar" → tecla **B** → construir la pared norte: "0,70 → 0,60 mSv por sol" | "Con el regolito construye el blindaje, sección por sección. No es decoración: cada sección baja la radiación que entra al hábitat." |
| 1:12–1:27 | Indicador "☀️ Actividad solar" → alerta 🚨 (grabar con `?alerta=1`: aparece como SIMULACRO) | "El juego vigila el Sol con NASA DONKI durante la partida. Si aparece una llamarada, sube el riesgo: ¿siguen trabajando o vuelven al refugio? En el video mostramos un simulacro, y el juego lo dice." |
| 1:27–1:40 | Botón "Pedir ayuda": "tu mensaje tarda 12 minutos…" | "¿Pedir ayuda a la Tierra? El mensaje tarda minutos en llegar. En Marte, la tripulación decide sola." |
| 1:40–1:52 | Resumen del sol con la tarjeta de OSDR + panel "¿Qué es real?" | "Cada consecuencia muestra un estudio real de la NASA, con su fuente. Y el juego separa lo que es dato en vivo, lo guardado y lo que es regla del juego." |
| 1:52–2:00 | Pantalla final con estrellas + link | "Se juega en el navegador, sin descargas ni cuentas. **survival-mars.pages.dev**. ¿Estás listo para el asiento del comandante?" |

**Consejos de grabación:** usar la versión publicada; borrar `localStorage` para que salga el tutorial; grabar a 1080p;
para mostrar la secuencia corta, usar el modo `?demo=1` identificado en pantalla. Para la alerta solar, grabar con `?alerta=1`:
aparece a los 4 segundos como **SIMULACRO** (no presentarla como una llamarada real). Controles: WASD/flechas, E/Q recoger, R soltar, B construir, Esc cerrar.

## 2. Texto de envío (English — for judges)

**Project name:** Survival Mars — Junior Astronaut Mission Trainer

**High-level summary (≈170 words):**
Survival Mars is a free, browser-based 3D isometric game where kids aged 7–12 command a base on the NE Syrtis plateau at the edge of Isidis Planitia, Mars (a NASA Mars 2020 finalist landing site),
for 10 or 15 sols. They split a limited power budget between life support, food production, communications and science.
They choose which of four crew members goes on a spacewalk — each one carries a personal dosimeter — and walk out to collect
regolith, water ice and Martian rocks in a 4-item backpack while suit oxygen drains and radiation builds up. Back at the base,
they spend regolith to build the habitat's radiation shield section by section (north wall, south wall, east/west walls, roof);
each section really lowers the dose inside. A solar-activity indicator and an in-game check of NASA DONKI every 10 minutes
raise the risk when a new strong flare appears. Emergencies (dust storms, micrometeorites, flares) need a decision in seconds,
and Earth's advice arrives late. No choice is free. Every consequence cites its NASA source, and the game shows what is live data,
stored data or a simplified game rule.

**How it addresses the challenge:**
- All five required trade-offs: life support, radiation shielding, power budgeting, food production, communication delay.
- Radiation is a real decision, not a number: who goes outside (individual dosimeters), how long they stay, which shield section to build, and whether to shelter when DONKI shows a strong flare.
- Few core resources (energy, oxygen, food, radiation) plus crew health and a science goal.
- No "safe" choice: playing passively survives but earns 1 star; reckless science loses to radiation. Balance validated with 300 simulated games per strategy.
- Replayable: random events, real space weather and different strategies; failure explains what happened instead of punishing.
- Plain language, guided tutorial, touch joystick; runs in any modern browser with no account.

**NASA data used:** DONKI solar flares (recent query, 6-hour cache or labelled historical archive, plus an in-game check every 10 minutes), Curiosity RAD (Hassler et al. 2014), 13 OSDR studies (OSD-87, 146, 177, 268, 334, 342, 343, 360, 566, 615, 678, 766, 772), OSDR RadLab, Mars 2020 landing-site studies / Mars Trek (NE Syrtis), MOXIE, Opportunity, MRO impact survey,
Mars solar conjunction, NASA HRP communication delay. Full mapping: `docs/DATOS_NASA.md`.

**Space agency partner resources:** Canadian Space Agency — food production in space (greenhouse mechanic).

**Tools:** JavaScript, Three.js (WebGL), HTML/CSS, Cloudflare Pages, GitHub.

**Use of AI:** We used AI coding assistants (Claude Code and Codex) to help write code, check NASA sources and draft documentation.
The team designed the game, reviewed and tested the results, and verified the data against the cited NASA sources.

## 3. Resumen en español (para presentar)
Survival Mars es un juego 3D gratuito en el navegador donde niños de 7 a 12 años dirigen una base en la meseta NE Syrtis (Isidis Planitia)
durante 10 o 15 sols. Reparten energía entre oxígeno, comida, comunicaciones y ciencia. Eligen cuál de los 4 astronautas sale a caminar
—cada uno con su dosímetro—, recogen regolito, hielo de agua y rocas marcianas en una mochila de 4 objetos mientras se gasta el oxígeno
del traje, y con el regolito construyen el blindaje del hábitat sección por sección (cada sección baja de verdad la radiación que entra).
Un indicador del Sol y una consulta a NASA DONKI cada 10 minutos suben el riesgo si aparece una llamarada fuerte: ¿seguir trabajando
o volver al refugio? Cada consecuencia cita su fuente de la NASA (Curiosity, OSDR, MOXIE, Opportunity) y el juego separa lo que es
dato en vivo, lo guardado y lo que es regla simplificada. Ninguna decisión es gratis.
