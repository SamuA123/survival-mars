# 🔴 Survival Mars — Entrenador de Misiones para Astronautas Junior

Proyecto para el **NASA Space Apps Challenge** (reto *Junior Astronaut Mission Trainer*).
Un juego de navegador donde niños de 7 a 12 años dirigen una base en Marte durante 20 sols
y toman decisiones reales: energía, soporte vital, comida, blindaje contra radiación y
comunicaciones con retraso.

## Cómo jugar / probar

No hace falta instalar nada. Se puede abrir `index.html` con doble clic, o servirlo con un
servidor local (recomendado para que la llamada a la API de la NASA no tenga problemas):

```bash
python -m http.server 8000      # luego abrir http://localhost:8000
```

Para publicarlo gratis: GitHub Pages, Netlify o Vercel (es un sitio estático).

## Qué enseña cada mecánica

| Mecánica | Lección real |
|---|---|
| ⚡ Presupuesto de energía (solar + reactor + batería) | No hay energía ilimitada: cada sistema que enciendes le quita energía a otro |
| 🫁 Soporte vital | El oxígeno y el agua se fabrican y se reciclan con electricidad |
| 🌱 Invernadero | La comida se cultiva; si la apagas para ahorrar, se acaba la comida |
| 🔥 Calefacción | Marte promedia -60 °C |
| 🌪️ Tormenta de polvo (sols 8-10, con aviso en el sol 6) | Caso real del rover Opportunity (2018). Retraer los paneles = perder energía hoy para no perderla para siempre |
| ☀️ Llamaradas solares con **datos reales de NASA DONKI** | La actividad real del Sol de los últimos 30 días cambia el riesgo del juego |
| 🧱 Blindaje de regolito | Idea real de la NASA para protegerse de la radiación |
| 📡 Retraso de comunicación (12 min) | El botón "Pedir ayuda" llega tarde: la tripulación debe decidir sola |
| 🌞 Conjunción solar (sols 13-14) | Cada 2 años el Sol bloquea la comunicación Tierra-Marte |
| ⏱️ Emergencias con 10 segundos | Si no decides, también hay consecuencias |

## Estructura

```
index.html        Página y layout
css/style.css     Estilos
js/data.js        ⚙️ Números del juego, sistemas, mensajes y datos "¿Sabías que?"  ← balancear aquí
js/donki.js       Conexión con la API DONKI de la NASA (llamaradas solares)
js/escena.js      Dibujo animado de la base (canvas)
js/juego.js       Lógica: simulación de cada sol, eventos, modales
```

## Datos de la NASA

- **DONKI – Solar Flares (FLR)**: `https://api.nasa.gov/DONKI/FLR` — se consultan las
  llamaradas de los últimos 30 días. Si no hay conexión se usan llamaradas históricas reales
  (ej. X9.0 del 3 de octubre de 2024).
- Cambien `DEMO_KEY` en `js/donki.js` por una clave gratuita de https://api.nasa.gov antes de la demo.
- Valores de referencia: radiación en la superficie de Marte ≈ 0,7 mSv/sol (Curiosity/RAD);
  Marte recibe ≈ 43 % de la luz solar de la Tierra; retraso de señal 3–22 min.
  Los números del juego están simplificados para niños.

## Ideas para seguir (posible reparto para el equipo de 6)

1. **Arte y sonido**: sprites/ilustraciones propias, música, efectos.
2. **Contenido educativo**: revisar datos, agregar más eventos y "¿Sabías que?", glosario.
3. **Datos NASA**: sumar CMEs (`DONKI/CME`) y tormentas geomagnéticas (`DONKI/GST`); mostrar un panel "el Sol hoy".
4. **Accesibilidad e idiomas**: versión en inglés, modo lectura en voz alta, textos más grandes.
5. **Pruebas con niños** y balance de dificultad (fácil / normal / difícil).
6. **Presentación**: video demo, página del proyecto, diapositivas para los jueces.
