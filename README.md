# 🔴 Survival Mars — Entrenador de Misiones para Astronautas Junior

Proyecto para el **NASA Space Apps Challenge 2026** (reto *Build a Junior Astronaut Mission Trainer*).
Juego isométrico 3D en el navegador donde niños de 7 a 12 años dirigen una base en el cráter Jezero (Marte)
durante 15 sols. Tienen que balancear energía, oxígeno, comida y radiación, y aprenden con datos reales de la NASA.

## Jugar localmente
No hay que instalar nada:
```bash
python -m http.server 5500 --bind 127.0.0.1
# abrir http://localhost:5500
```
Controles: tocar un edificio para controlarlo · arrastrar para moverse · rueda para zoom · clic derecho para girar.

## Documentación
- [`docs/RETO.md`](docs/RETO.md): qué pide el reto y qué valoran los jueces
- [`docs/PLAN.md`](docs/PLAN.md): decisiones, ramas y tareas del equipo
- [`CLAUDE.md`](CLAUDE.md): estructura del código y contratos de datos

## Datos de la NASA
NASA DONKI (llamaradas solares en vivo), Curiosity RAD, OSDR / RadLab y Mars Trek. Ver el botón **📡 Datos NASA** dentro del juego.
