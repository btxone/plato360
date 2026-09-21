# Línea base de la demo

Este documento congela el comportamiento observable de la demo antes de iniciar la migración a una aplicación operativa.

## Entorno de referencia

- URL local: `http://localhost:5173`
- Marca demostrativa: Casa Brasa
- Ubicación de ejemplo: Montevideo
- Estado de los datos: estáticos y de demostración
- Persistencia: `localStorage` del navegador

## Rutas cubiertas por la prueba de humo

| Ruta | Texto de referencia |
|---|---|
| `/` | Hacé que tus platos se vendan |
| `/carta` | Así se ve |
| `/carta/tradicional` | Todo lo rico |
| `/carta/plato/smash-trufa` | Smash Trufa |
| `/carta/pedido` | Lo que te |
| `/carta/proximamente` | TU DECIDES |
| `/carta/proximamente/burger-bbq-ahumada` | Burger BBQ Ahumada |
| `/carta/restaurante` | Qué está pasando en tu carta |
| `/carta/restaurante/pruebas` | Qué plato debería llegar a la carta |

## Comportamientos que se conservan

- La landing navega a la carta visual y al dashboard.
- La carta visual muestra un plato por pantalla y reproduce el video activo.
- La carta tradicional filtra por categoría y comparte el pedido con la carta visual.
- Los detalles de platos permiten agregar productos.
- El pedido permite sumar, restar, eliminar y calcular el total.
- “Tu decides” permite votar candidatos y marcar interés localmente.
- El dashboard muestra métricas estáticas identificadas como datos de ejemplo.
- Los medios faltantes tienen fallback visual.

## Alcance de este hito

Este hito no modifica la experiencia de usuario. Solo añade una prueba de humo automatizable y la documentación de referencia. Las capturas visuales de las pantallas principales están en [visual-baseline.md](./visual-baseline.md).
