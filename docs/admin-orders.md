# Bandeja operativa de pedidos

La bandeja administrativa permite que el equipo vea y atienda los pedidos creados desde las mesas.

## Acceso y aislamiento

- SuperAdmin puede consultar un local mediante `locationId`.
- Admin y Mozo quedan limitados al `location_id` de su usuario.
- Cualquier otro perfil recibe 403.
- Las respuestas no exponen tokens QR ni cookies de sesión del comensal.

## Endpoints

- `GET /api/admin/orders?status=pending`: lista pedidos con sus líneas. Se puede filtrar por `pending`, `in_process`, `confirmed` o `cancelled`.
- `PATCH /api/admin/orders/:id` con `{ action: "confirm" | "complete" | "cancel", version? }`: mueve un pedido de pendiente a en proceso, de en proceso a confirmado o lo cancela antes del cierre.
- `PATCH /api/admin/orders/:id` con `{ action: "update", notes, removeItemIds, version? }`: modifica las notas y quita líneas de un pedido pendiente. El total se recalcula y debe quedar al menos un producto.

La edición y transición usan el número de versión del pedido para evitar que dos operadores pisen el mismo cambio. Cada edición, confirmación, finalización o cancelación registra actor, estado anterior, estado siguiente y versión en `order_history`. Un pedido confirmado no admite más cambios.

El envío de notificaciones push queda desacoplado: el siguiente paso puede crear una entrada en `push_outbox` cuando se registra un nuevo pedido, sin bloquear la respuesta del comensal.
