# Bandeja operativa de pedidos

La bandeja administrativa permite que el equipo vea y atienda los pedidos creados desde las mesas.

## Acceso y aislamiento

- SuperAdmin puede consultar un local mediante `locationId`.
- Admin y Mozo quedan limitados al `location_id` de su usuario.
- Cualquier otro perfil recibe 403.
- Las respuestas no exponen tokens QR ni cookies de sesión del comensal.

## Endpoints

- `GET /api/admin/orders?status=pending`: lista pedidos con sus líneas. Se puede filtrar por `pending`, `confirmed` o `cancelled`.
- `PATCH /api/admin/orders/:id` con `{ action: "confirm" | "cancel", version? }`: cambia un pedido pendiente.

La transición usa el número de versión del pedido para evitar que dos operadores pisen el mismo cambio. Cada confirmación o cancelación registra actor, estado anterior, estado siguiente y versión en `order_history`.

El envío de notificaciones push queda desacoplado: el siguiente paso puede crear una entrada en `push_outbox` cuando se registra un nuevo pedido, sin bloquear la respuesta del comensal.
