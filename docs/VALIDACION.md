# Validación y siguientes pasos

## Verificación técnica

Pruebas automatizadas, sin dependencias de ejecución del juego:

```powershell
node --experimental-default-type=module --test tests/regresiones.mjs
```

Incluyen respuestas vacías y erróneas de DONKI, segunda fuente, caché con hora original, respaldo histórico, contenido bilingüe y 864 planes de energía comparados con el avance real del motor.

## Revisión a partir del feedback de un jugador

El feedback sobre la URL original motivó estos ajustes en `samuel`:

- Inicio con objetivo, ciclo de tres acciones y elección explícita de guía en cada partida. Saltarla no la marca como completada.
- Panel independiente para cada edificio; tripulación e inventario tienen accesos propios desde Control base.
- Recolección con aviso de 2,5 segundos y ubicación calculada para evitar el HUD y los controles. Las explicaciones completas están en Inventario.
- Invernadero con cosecha, consumo, cambio de reservas y duración estimada. Comida inicial: 50 en Cadete y 40 en Comandante. Con reservas de 20 o menos hay una penalización de hambre de 3 de salud por sol; sin comida, de 10. Son reglas del juego.
- Antena con bandeja de avisos y respuestas, cantidad de mensajes pendientes y explicación de cada nivel. Las respuestas esperan si la antena está apagada.

Las pruebas de Chrome cubren la guía completa, un único sistema por edificio y la ausencia de superposición del aviso de recolección en 1440×1000, 390×844 y 844×390. Se revisa que el botón para terminar el sol no quede recortado en móvil. Las pruebas del motor cubren hambre, recepción de tareas, respuestas pendientes y videollamadas.

La siguiente validación humana debe confirmar si el jugador entiende la comida y la antena sin explicación del equipo. El feedback original es evidencia de problemas de uso; todavía no hay una prueba humana de estas correcciones.

La prueba visual usa el protocolo de depuración de Chrome y Node 22+, sin Playwright:

1. Servir el proyecto: `python -m http.server 5500 --bind 127.0.0.1`.
2. Abrir Chrome con un perfil temporal distinto al personal:

```powershell
$perfilQA = Join-Path (Get-Location) 'node_modules\chrome-qa'
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @('--headless=new', '--remote-debugging-port=9222', ('--user-data-dir="' + $perfilQA + '"'), '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank')
node tests/browser.mjs
```

El script crea y cierra una pestaña propia. Revisa inicio, conservación del nombre, ubicación, consola, eventos y sus resultados, temporizador, ayuda, datos NASA, demo completa, repaso bilingüe y diseño móvil. Guarda capturas en `node_modules/qa/` (fuera de Git). El juego carga Three.js desde CDN: la prueba visual necesita acceso a ese CDN.

## Prueba con usuarios: pendiente

No se han realizado pruebas con niños como parte de esta implementación. Las pruebas automáticas verifican funcionamiento; no demuestran aprendizaje.

Probar con 3–5 participantes de 7–12 años, con acompañamiento de un adulto. No hace falta registrar nombres ni información personal.

Antes de jugar, preguntar sin dar la respuesta:

1. Si falta electricidad, ¿qué relación tiene con el aire de la base?
2. ¿Qué se pierde al proteger a todos en un refugio?
3. ¿Por qué la Tierra no puede resolver una emergencia inmediatamente?

Observar una partida corta sin indicar dónde hacer clic. Anotar si comprende las instrucciones, dónde pide ayuda y si puede explicar una consecuencia. Repetir las preguntas antes de mostrar las respuestas del repaso final; después dejar que practique con el repaso.

| Participante anónimo / rango de edad | Respuestas antes (0–3) | Después, antes de ver feedback (0–3) | Primera dificultad | ¿Explica una decisión con sus palabras? |
|---|---|---|---|---|
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |
| E | | | | |

Usar los resultados como observación exploratoria de una muestra pequeña. El contador del repaso permite corregir respuestas: sirve para practicar, no como medición independiente de aprendizaje.

## Antes de enviar

- Comprobar el enlace público en una ventana de incógnito y en un teléfono.
- Confirmar que Cloudflare esté sirviendo el commit revisado: un push a `samuel` no garantiza que el dominio de producción cambie.
- Grabar el recorrido de `?demo=1&lang=en` y conservar el video para presentar sin depender de la red.
- Confirmar campos, formato de video y hora de cierre en la página del equipo de Space Apps.
- Añadir únicamente resultados de usuarios que realmente se hayan observado.
