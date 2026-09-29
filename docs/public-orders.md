# Pedidos públicos

La ruta `POST /api/public/orders` transforma el carrito de la carta en un pedido persistido. Solo acepta una sesión anónima creada desde un QR válido y solo toma productos publicados y disponibles del mismo local.

## Reglas del servidor

- La cookie de sesión identifica la mesa; el navegador no puede elegir local, mesa ni `diner_session_id`.
- El payload recibe slugs, cantidades y notas, pero no confía en precios, nombres ni totales enviados por el navegador.
- El servidor consulta `products.price_cents`, calcula cada línea y el total, y guarda snapshots en `order_items`.
- Un pedido nace como `pending` y registra una entrada `created` en `order_history`.
- En administración puede pasar a `in_process` y luego a `confirmed`; los estados `in_process` y `confirmed` se muestran al comensal como `confirmed`.
- Los slugs repetidos se rechazan y cada cantidad debe estar entre 1 y 20.
- La bandera `orders` puede apagar el flujo por local sin tocar datos existentes.

## Endpoints

- `POST /api/public/orders`: crea un pedido con `{ items: [{ slug, quantity, notes? }], notes? }`.
- `GET /api/public/orders`: devuelve los pedidos de la sesión actual, con sus líneas y estados.

Las respuestas usan `totalCents` y `priceCents` para mantener precisión monetaria. La interfaz formatea esos valores según la presentación de la carta. El siguiente hito añadirá la bandeja operativa para que Mozo/Admin pueda consultar y confirmar pedidos.
