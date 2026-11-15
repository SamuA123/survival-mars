# Datos de la NASA usados en Survival Mars

**Survival Mars** es un juego de navegador para niños de 7 a 12 años: dirigen una base en la **meseta NE Syrtis · Isidis Planitia (Marte)**
durante 15 sols. Cada mecánica del juego está anclada en datos o hallazgos reales de la NASA, y el jugador puede verlos
dentro del juego (botón **📡 Datos NASA**, tarjetas "¿Sabías que…?" y "Lo que dice la ciencia real", cada una con su fuente).

> Juego: https://survival-mars.pages.dev · Código: `src/data/` (cada valor indica su fuente)

## 1. Resumen: qué dato alimenta qué mecánica

| Dataset / fuente NASA | Tipo | Mecánica del juego | Por qué |
|---|---|---|---|
| **DONKI – Solar Flares (FLR)** | Consulta reciente / caché / archivo, identificado en pantalla; **más una consulta en vivo cada 10 min durante la partida** | Dificultad de los ejercicios, clase/fecha de las llamaradas utilizadas, indicador "☀️ Actividad solar" y alerta 🚨 | Observaciones reales inspiran escenarios educativos para elegir entre **refugiarse o seguir trabajando**. No es un pronóstico de partículas ni de dosis en Marte. |
| **Curiosity RAD** (Hassler et al. 2014) | 📚 Guardado | Radiación de fondo por sol, límite de la misión, blindaje por secciones, dosímetros de la tripulación | 0,67 mSv/día medidos en la superficie de Marte. Cada sol la tripulación suma radiación; las caminatas y las llamaradas suman más. |
| **OSDR – RadLab** (dosimetría de la ISS) | 📚 Guardado | Comparación ISS vs. Marte | En la ISS se reciben ~0,2–0,5 mSv/día; en Marte, más. Explica por qué Marte es más peligroso que la Estación. |
| **OSDR – estudios de biología espacial** | 📚 Guardado | Tarjeta "Lo que dice la ciencia real" tras cada sol | Cuando pasa algo (llamarada, poca comida, poco oxígeno), el juego muestra el hallazgo de un estudio real con su ID OSD-xxx. |
| **NE Syrtis — sitio finalista de Mars 2020** / Mars Trek | 📚 Guardado | Lugar de la base, relieve (mesas y borde de Isidis), duración del sol, luz solar | NE Syrtis (~18° N, 77° E) fue uno de los 3 finalistas de la NASA para Perseverance. Cuenca Isidis de ~3.960 millones de años; rocas con olivino alterado a carbonato por agua. Sol de 24 h 39 min, ~43 % de la luz solar. |
| **MOXIE** (Perseverance) | 📚 Guardado | Hielo de agua → oxígeno; soporte vital | MOXIE fabricó 122 g de O₂ con el aire de Marte: producir oxígeno in situ es real. |
| **Opportunity** (fin de misión 2018) | 📚 Guardado | Tormenta global de polvo (sols 6–8) | El polvo tapó sus paneles y se quedó sin energía. En el juego: retraer paneles o arriesgarlos. |
| **MRO / HiRISE** (impactos nuevos) | 📚 Guardado | Evento de micrometeorito | Más de 200 cráteres nuevos por año: la atmósfera delgada no frena las rocas pequeñas. |
| **Mars solar conjunction** | 📚 Guardado | Sols 10–11 sin comunicación | Cada ~2 años la NASA pausa los comandos ~2 semanas. |
| **Retraso de comunicaciones** (NASA HRP) | 📚 Guardado | Botón "Pedir ayuda" que responde al día siguiente | 4–24 minutos por trayecto: la tripulación debe decidir sola. |
| **Fission Surface Power** | 📚 Guardado | Mini reactor de la base (energía constante) | Energía de día, de noche y en tormentas. |
| **Veggie / VEG-05** (ISS) | 📚 Guardado | Invernadero | Cultivar comida con luces LED es real. |
| **Agua en la ISS (98 % reciclada)** | 📚 Guardado | Soporte vital / evento del reciclador | El agua se recicla casi por completo; una falla es una emergencia. |

**En vivo vs. guardado:** solo DONKI se consulta en vivo: al cargar (últimos 30 días, con caché de 6 h y un servidor de respaldo de CCMC que no necesita clave) y luego **cada 10 minutos durante la partida** (últimos 2 días, sin caché). Todo lo demás —dosis de Curiosity, RadLab, estudios OSDR, datos del sitio— está **guardado** en el código con su fuente. Si la API no responde (sin internet o límite de la clave),
el juego usa llamaradas **históricas reales** (p. ej. X9.0 del 3/10/2024) y lo dice claramente: "📚 Datos históricos",
nunca "en vivo", tal como pide el reto.

## 2. Detalle por fuente

### 2.1 DONKI – llamaradas solares y procedencia
- Endpoint: `https://api.nasa.gov/DONKI/FLR?startDate=…&endDate=…&api_key=…` (últimos 30 días). Código: `src/data/donki.js`.
- Segunda fuente si falla la primera: notificaciones de DONKI, `https://api.nasa.gov/DONKI/notifications?type=FLR&…`. Solo incluyen las llamaradas **fuertes** que la NASA anunció (clase M5 o más); el juego lo dice en pantalla ("llamaradas fuertes (M5 o más)"). Se toma la clase y la hora pico de cada llamarada (una por *Activity ID*). Se añadió porque el 15/11/2026 la ruta `DONKI/FLR` de api.nasa.gov respondía 404 aunque el resto de DONKI funcionaba.
- Tercera fuente: `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR` (sin clave). Algunas redes, como la de la universidad desde donde probamos, cortan la conexión con este servidor.
- **Consulta reciente:** respuesta obtenida en esta carga. **Consulta guardada:** caché de hasta seis horas. Ambas muestran la hora original de consulta. **Archivo histórico:** respaldo si no se puede consultar NASA.
- Si la consulta devuelve cero eventos, se conserva la lista vacía. Un ejercicio guionado puede usar un ejemplo histórico, identificado como tal; esos ejemplos no se mezclan con los resultados de la consulta.
- Cálculo de riesgo: `riesgo = 0,6 + 0,08 × (llamaradas M) + 0,4 × (llamaradas X)`, limitado a [0,6 – 2,5].
  Es una fórmula de **dificultad del juego**, no un modelo científico de riesgo para Marte. Afecta los eventos aleatorios y la caminata; los eventos guionados siguen su calendario de entrenamiento.
- Cada evento de llamarada usa una **llamarada real** de la lista (clase y fecha) y lo muestra:
  *"Basada en una llamarada real que la NASA detectó el …"*. La llegada de partículas y la dosis del escenario son simuladas: no se deducen científicamente de la clase de la llamarada.
- **Vigilancia durante la partida** (`src/ui/alerta-solar.js`): un minuto después de empezar y luego cada 10 minutos consulta DONKI
  de los últimos 2 días, **sin caché** (mismo orden de fuentes: lista FLR, notificaciones y servidor CCMC). Si aparece una llamarada
  **M o X** que no estaba en la carga inicial, muestra la alerta 🚨 *"NASA DONKI detectó una llamarada clase …"*, sube el riesgo del juego
  con la misma fórmula y pregunta si la tripulación sigue trabajando o vuelve al refugio. Si DONKI no responde, no pasa nada: el juego sigue.
  No consulta en el modo demo (`?demo=1`).
- **Indicador permanente:** *"☀️ Actividad solar normal · Riesgo BAJO/MEDIO/ALTO"*, o *"🚨 ALERTA SOLAR"* si los datos reales cargados
  tienen una llamarada M o X de los últimos 3 días. Al tocarlo se abre el panel de datos.
- **Simulacro** (`?alerta=1`): para presentaciones. Muestra una alerta con una llamarada M5.0 de ejemplo y la etiqueta **SIMULACRO** en el
  indicador y en la alerta; nunca se presenta como dato en vivo.
- **En la caminata**, la dosis por segundo afuera se multiplica por un factor de 0,85 a 1,4 según ese riesgo (`factorRiesgo` en
  `src/world3d/eva.js`), y el panel muestra el nivel: BAJO, MODERADO, ALTO, o EXTREMO si hay una llamarada en curso. Es una regla de juego.
- Fuente: https://kauai.ccmc.gsfc.nasa.gov/DONKI/ · API: https://api.nasa.gov
- Respaldo curado: [X9.0 del 3 de octubre de 2024](https://svs.gsfc.nasa.gov/14701/) y [X8.7 del 14 de mayo de 2024](https://svs.gsfc.nasa.gov/14592/), con publicaciones de NASA SDO. Se retiraron las entradas sin verificación específica del archivo anterior.

### 2.2 Radiación (Curiosity RAD y RadLab)
| Valor | Dato real | En el juego | Fuente |
|---|---|---|---|
| Superficie de Marte | 0,67 mSv/día (cráter Gale, ago 2012 – jun 2013) | 0,7 mSv por sol | Hassler et al. 2014, *Science* 343 — https://ntrs.nasa.gov/citations/20180007641 |
| Viaje a Marte | ~1,8 mSv/día | Dato educativo | Curiosity RAD (crucero) |
| Estación Espacial | ~0,3 mGy/día (detector REM, módulo Columbus, 1–7 abril 2022) · rango típico 0,2–0,5 mSv/día | Panel "¿Qué es real?" (comparación) | API de RadLab — https://visualization.osdr.nasa.gov/radlab/ (consulta de Jorge) |
| Límite de carrera NASA | 600 mSv | Dato educativo | Estándar NASA de protección radiológica |
| **Límite de la misión del juego** | — | **60 mSv** (simplificado) | Diseño de juego |
| Dosis extra por llamarada sin refugio | Muy variable en la realidad | X: 50 · M: 25 · C: 8 mSv × atmósfera 0,5 × blindaje 0,4 | **Simplificado**: solo respeta el orden X > M > C |

### 2.2b Dosímetros de la tripulación y blindaje por secciones (reglas del juego sobre datos reales)
- **Dosímetros:** la tripulación (Lía, Kofi, Mei y Teo) tiene una dosis por persona. La radiación de fondo de cada sol (0,7 mSv, de
  Curiosity RAD, reducida por el blindaje) y las llamaradas sin refugio suman a **todos**; la dosis de una caminata suma **solo a quien
  salió**, y limpiar paneles suma a quien tenga menos dosis. El límite de la misión (60 mSv, simplificado) se aplica por persona: el
  valor que se muestra es la dosis más alta. Código: `dosisATodos`, `dosisA` y `menorDosis` en `src/sim/motor.js`.
- **Por qué:** los astronautas reales llevan dosímetros personales, y la NASA tiene un límite de carrera por persona (600 mSv) y
  aplica el principio **ALARA** (tan bajo como sea razonablemente posible). Elegir quién sale para repartir la dosis es la forma en que
  el juego deja practicar esa idea; **no** describe un procedimiento oficial de asignación de caminatas.
- **Blindaje por secciones** (tecla B, `src/ui/construccion.js` y `MISION.construccion` en `src/sim/config.js`): cada sección
  protege distinto, para que elegir el orden sea una decisión real y no siempre convenga empezar por la más barata.

  | Sección | Costo | Frena del fondo diario (rayos cósmicos) | Frena de una llamarada solar |
  |---|---|---|---|
  | Pared norte | 3 bolsas | 15 % | 5 % |
  | Pared sur | 3 bolsas | 15 % | 5 % |
  | Paredes este y oeste | 4 bolsas | 20 % | 10 % |
  | Techo | 4 bolsas | 10 % | 40 % |
  | **Las 4 juntas** | 14 bolsas | **60 % → entra el 40 %** | **60 % → entra el 40 %** |

  Con las 4 juntas entra el 40 % (= `RADIACION.atenuacionBlindaje`) en la dosis diaria y en las llamaradas, como antes. Dosis diaria
  construyendo en orden norte, sur, lados y techo: 0,70 → 0,60 → 0,49 → 0,35 → 0,28 mSv por sol. Una llamarada X1.0 sin refugio
  da 23 mSv sin blindaje; con solo el techo, 14; con solo las paredes este y oeste, 20. Código: `factorBlindaje(S, 'fondo' | 'llamarada')`,
  `radiacionInterior` y `dosisLlamarada` en `src/sim/motor.js`; prueba en `tests/mecanicas.mjs` ("techo vs. paredes").
- **Por qué (física real, simplificada):** la atmósfera de Marte es delgada justo hacia arriba y muy gruesa hacia el horizonte.
  En Gale, la columna de aire vale unos **21 g/cm² mirando hacia arriba y unos 400 g/cm² cerca del horizonte**
  ([Khaksarighiri et al. 2023, *JGR Planets*, "The Zenith-Angle Dependence of the Downward Radiation Dose Rate on the Martian
  Surface"](https://macau.uni-kiel.de/servlets/MCRFileNodeServlet/macau_derivate_00007955/JGR%20Planets%20-%202023%20-%20Khaksarighiri%20-%20The%20Zenith%E2%80%90Angle%20Dependence%20of%20the%20Downward%20Radiation%20Dose%20Rate%20on%20the%20Martian%20Surface.pdf)).
  - Los **rayos cósmicos** (fondo diario) tienen mucha energía y llegan de muchas direcciones; según ese mismo estudio, los protones
    que más aportan a la dosis llegan bastante inclinados (cerca de 74° del cenit). Por eso, en el juego, las **paredes** frenan más
    el fondo diario.
  - Las partículas de una **llamarada solar** tienen menos energía: el aire largo y oblicuo las frena mucho más que el camino corto
    hacia arriba, así que llegan sobre todo **desde arriba**. Por eso, en el juego, el **techo** frena más las llamaradas. El suelo
    de Marte ya protege por abajo.
  - **Regla simplificada del juego:** los porcentajes de la tabla son inventados para que se entienda la idea; no son una medición.
    Cubrir un hábitat con regolito sí es una idea estudiada para protegerse de la radiación.
- **Regolito:** se recoge en la caminata (mochila de 4 objetos) y se deposita al entrar a la base (1 objeto = 1 bolsa).

### 2.3 Estudios de NASA OSDR mostrados en el juego
Buscados con la API de OSDR (`https://osdr.nasa.gov/osdr/data/search`). Cada tarjeta enlaza a la página del estudio.

| Estudio | Qué encontró (resumen) | Cuándo aparece en el juego |
|---|---|---|
| [OSD-566](https://osdr.nasa.gov/bio/repo/data/studies/OSD-566) | Respuestas inmunes y hormonales de ratones a radiación ionizante | Después de una llamarada |
| [OSD-343](https://osdr.nasa.gov/bio/repo/data/studies/OSD-343) | Estrés mitocondrial como efecto central del vuelo espacial (59 astronautas + Estudio de Gemelos) | Cuando el oxígeno baja de 50 |
| [OSD-766](https://osdr.nasa.gov/bio/repo/data/studies/OSD-766) | VEG-05: tomates cultivados 101 días en la ISS con distintas luces LED | Cuando la comida baja de 30 |
| [OSD-678](https://osdr.nasa.gov/bio/repo/data/studies/OSD-678) | CARA: la luz guía el crecimiento de Arabidopsis en el espacio | Hallazgo adicional de comida |
| [OSD-342](https://osdr.nasa.gov/bio/repo/data/studies/OSD-342) | Rodent Research-19: pérdida de músculo y hueso en 33 días | Disponible (tema "ejercicio") |
| [OSD-177](https://osdr.nasa.gov/bio/repo/data/studies/OSD-177) | Hongo *Fusarium* en las zinnias de Veggie | Disponible (tema "plaga") |
| [OSD-87](https://osdr.nasa.gov/bio/repo/data/studies/OSD-87) | Cambios en la retina de ratones (STS-135) | Disponible (tema "ojos") |
| [OSD-360](https://osdr.nasa.gov/bio/repo/data/studies/OSD-360) | Dosis bajas de radiación espacial cambian la química del bazo (ratones) | Radiación (aporte de Jorge) |
| [OSD-334](https://osdr.nasa.gov/bio/repo/data/studies/OSD-334) | Partículas pesadas y daño al tejido del corazón | Radiación (aporte de Jorge) |
| [OSD-146](https://osdr.nasa.gov/bio/repo/data/studies/OSD-146) | La radiación cambia las bacterias del intestino | Radiación (aporte de Jorge) |
| [OSD-268](https://osdr.nasa.gov/bio/repo/data/studies/OSD-268) | Lechuga roja de Veggie: microbios y nutrientes | Comida (aporte de Jorge) |
| [OSD-772](https://osdr.nasa.gov/bio/repo/data/studies/OSD-772) | PH-04: chiles cultivados en la Estación Espacial (2021) | Comida (aporte de Jorge) |
| [OSD-615](https://osdr.nasa.gov/bio/repo/data/studies/OSD-615) | Sin gravedad cambian las paredes de las raíces | Comida (aporte de Jorge) |

Los 13 hallazgos se mezclan al empezar cada partida. La **consola de la base** también muestra un estudio según el mayor riesgo del tripulante.

### 2.4 Otros datos verificados
| Dato en el juego | Fuente |
|---|---|
| NE Syrtis: finalista de Mars 2020 (con Jezero y Columbia Hills) | https://astrobiology.nasa.gov/news/scientists-shortlist-three-landing-sites-for-mars-2020/ |
| Fondo de Jezero ~2.600 m bajo el nivel de referencia (Isidis, zona baja) | https://www.esa.int/ESA_Multimedia/Images/2021/02/Topographic_map_of_Jezero_crater_and_surrounds |
| Mapa interactivo de la base (botón 📍 Ubicación) | NASA Mars Trek, centrado en ~18,2° N, 77,3° E |
| Cuenca Isidis (~3.960 Ma), lavas de Syrtis (~3.700 Ma), olivino → carbonato | https://www.brown.edu/news/2017-04-20/syrtis |
| Sol = 24 h 39 min | Día solar marciano (24 h 39 min 35 s) |
| MOXIE: 122 g de oxígeno | https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/ |
| ISS recicla el 98 % del agua | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/ |
| Opportunity y la tormenta de 2018 | https://science.nasa.gov/mission/mer-opportunity/ |
| +200 cráteres nuevos por año en Marte | https://www.jpl.nasa.gov/news/nasa-probe-counts-space-rock-impacts-on-mars/ |
| Conjunción solar (~2 semanas cada ~2 años) | https://www.nasa.gov/solar-system/whats-mars-solar-conjunction-and-why-does-it-matter/ |
| Retraso de 4–24 min | https://www.nasa.gov/hrp/hazard-distance-from-earth/ |
| Reactores Fission Surface Power | https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power/ |
| Veggie (lechugas, kale, zinnias) | https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/ |
| Comparador del informe final: 1 radiografía de pecho ≈ 0,1 mSv | FDA / RadiologyInfo.org (referencia médica, no NASA) |

## 3. Simplificaciones (honestas)
Para que un niño de 7 años entienda el trade-off, algunos números son simplificados. Los anotamos para que se puedan verificar:
- **Energía** (kWh por sol de paneles, reactor y sistemas) y **oxígeno/comida** (en %): números de juego, no de ingeniería real.
  Sí respetan las proporciones reales: los paneles en Marte rinden menos que en la Tierra (~43 % de luz) y una tormenta los deja casi en cero.
- **Retraso fijo de 12 minutos** (el real varía de ~4 a ~24 según la posición de los planetas).
- **Límite de la misión: 60 mSv** (el límite real de carrera de la NASA es 600 mSv). Se baja para que la radiación importe en 15 sols.
- **Dosis por llamarada**: X > M > C es una regla de dificultad del juego. La clase de una llamarada no determina por sí sola una dosis en Marte. La llegada de partículas depende de otros factores. El refugio y el blindaje reducen la exposición en el modelo educativo.
- **Dosímetros por persona y blindaje por secciones**: el reparto de dosis, el 15 % por sección y el factor de 0,85–1,4 de la caminata
  son reglas de juego para que el trade-off se entienda; no son mediciones.
- **Hielo en NE Syrtis**: en el Marte real, el hielo superficial abunda más lejos del ecuador; el juego lo coloca cerca de la base para jugar.
  La tarjeta del hielo lo aclara ("sobre todo lejos del ecuador").
