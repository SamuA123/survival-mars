# El reto: Build a Junior Astronaut Mission Trainer (NASA Space Apps 2026)

Fuente: https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/
Nivel: Intermedio / Principiante-Juventud · Temas: Juegos, Planetas y Lunas, Software, Exploración espacial, Sol.
**Fecha de entrega: 15/11/2026.**

## Qué piden (resumen)
Diseñar y construir un **juego o app interactiva** donde niños de **7 a 12 años** dirijan una base en la Luna o Marte,
equilibrando necesidades que compiten entre sí, para que vivan las decisiones que hacen que una misión falle o tenga éxito.

### Obligatorio
- **Prototipo funcional** (no solo idea).
- El jugador decide sobre: **soporte vital, blindaje contra radiación, presupuesto de energía, producción de comida y retraso de comunicaciones**.
- Las decisiones tienen consecuencias a lo largo de una misión simulada ("ahorrar energía hoy puede costar oxígeno mañana").
- **Ninguna decisión gratis**: cada una enseña algo verdadero sobre misiones reales.
- Meta: que el niño **salga entendiendo una limitación real** de la supervivencia en el espacio, no solo que se divierta.
- Formato libre (navegador, móvil, escritorio).

### Consejos del reto (lo que miran los jueces)
**Accesibilidad**
- Lenguaje simple; si hay término técnico (dosis de radiación, sol, microgravedad) explicarlo en el momento.
- Jugable en navegador, **sin descargas ni cuentas**.
- Que sirva también para hermanos mayores, padres y aulas.

**Datos reales**
- Usar APIs/datos abiertos de la NASA en vez de inventar números.
- **Atribuir las fuentes dentro del juego.**
- Si se usan datos guardados (no en vivo), **no presentarlos como en vivo**.

**Errores a evitar**
- Una opción "segura" sin costo.
- Que la belleza visual reemplace la precisión ("un juego simple que enseña algo real gana a uno bonito que no").
- Demasiados sistemas a la vez: **2-3 recursos principales** mejor que 5-6.

**Lo que hace destacar**
1. Conectar una decisión del juego con datos reales actuales (ej.: blindaje ↔ clima espacial de hoy).
2. **Rejugabilidad**: eventos que varían; fallar enseña sin sentirse castigo.
3. Explicación corta de **qué datasets NASA se usaron y por qué** (trazable por los jueces).

## Recursos oficiales del reto
| Recurso | URL | Uso en el juego |
|---|---|---|
| NASA Open APIs (clave gratis) | https://api.nasa.gov | Necesitamos clave propia (DEMO_KEY da error 429) |
| DONKI (llamaradas, CME, tormentas geomagnéticas) | https://kauai.ccmc.gsfc.nasa.gov/DONKI/ | ✅ Llamaradas reales de los últimos 30 días → evento de llamarada y riesgo |
| OSDR (salud de astronautas, biología espacial) | https://osdr.nasa.gov/bio/ | Hallazgos reales mostrados como consecuencia (`src/data/salud.js`) |
| RadLab (dosimetría de la ISS, dentro de OSDR) | https://visualization.osdr.nasa.gov/radlab/ | Dosis reales para comparar (`src/data/radiacion.js`) |
| Mars Trek (imágenes/relieve de Marte) | https://trek.nasa.gov/mars/ | Sitio de la base: meseta NE Syrtis · Isidis Planitia (`src/data/sitio.js`) |
| CSA – recursos STEM y producción de comida en la Luna | https://www.asc-csa.gc.ca/eng/youth-educators/ | Base del invernadero |

## Entregables
- Prototipo jugable con **link público**.
- Explicación de los datos NASA usados (→ `docs/DATOS_NASA.md`).
- Video/presentación corta (→ `docs/PITCH.md`). Revisar en la página del equipo el formato exacto de envío.
