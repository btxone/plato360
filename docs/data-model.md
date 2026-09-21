# Modelo de datos operativo de Plato360

## Alcance

La migración inicial prepara PostgreSQL para un único local, pero todas las entidades operativas llevan `location_id`. Así se evita mezclar datos entre locales si el proyecto crece sin convertir la aplicación en un SaaS.

La fuente de verdad es `db/schema.ts` y la primera migración generada es `drizzle/0000_fluffy_tag.sql`.

## Bloques principales

| Bloque | Tablas | Decisiones |
| --- | --- | --- |
| Local y acceso | `locations`, `users`, `auth_sessions`, `audit_logs`, `feature_flags` | SuperAdmin es externo a `users`; Admin y Mozo sí se almacenan en PostgreSQL. |
| Catálogo | `categories`, `products`, `ingredients`, `product_ingredients`, `media_assets`, `product_media`, `menu_entries`, `publication_schedules` | Precios en centavos enteros; publicación y disponibilidad se separan; medios temporales y finales tienen estado explícito. |
| “Eliges tú” | `candidate_campaigns`, `candidate_votes`, `candidate_interests` | Un voto único por candidato y sesión anónima; los interesados se deduplican por email normalizado. |
| QR y visita | `qr_codes`, `diner_sessions` | Se guardan únicamente identificadores/digests; el token firmado no se persiste en claro. QR fijo y dinámico tienen reglas de vencimiento distintas. |
| Pedidos | `orders`, `order_items`, `order_history` | Los ítems guardan snapshot de nombre y precio; el pedido usa versión para concurrencia y no admite reapertura. |
| Push | `push_subscriptions`, `push_outbox` | Las suscripciones pertenecen a usuarios; los envíos salen por outbox con reintentos. |
| Analítica | `telemetry_events`, `telemetry_daily_aggregates` | Eventos idempotentes y anónimos; los agregados diarios quedan separados del detalle. |

## Estados que sí existen

Los pedidos usan exclusivamente:

```text
pendiente ──► confirmado
    │              │
    └──────────────┴──► cancelado
```

La base no define estados `entregado`, `bloqueado` ni `reabierto`. Un pedido confirmado conserva edición y puede cancelarse; uno cancelado queda como lectura histórica.

El contenido usa `draft`, `scheduled`, `published` y `retired`. La disponibilidad inmediata se representa con `is_available`, sin inventar un quinto estado de publicación.

## Protecciones incorporadas

- UUID como identificador interno y claves públicas separadas para QR.
- Restricciones de unicidad por local para slugs, nombres de usuario, categorías y funciones.
- Restricciones de cantidades y precios no negativos.
- Snapshots de pedido y `order_history` para auditoría de cada cambio.
- Índices para bandeja de pedidos por mesa/estado, publicación pendiente, votos, sesiones y telemetría.
- `on delete` explícito según el caso: el historial operativo restringe borrados, mientras que relaciones auxiliares se limpian en cascada.
- Check de consistencia para sesiones de usuario/SuperAdmin, objetivos de programación, vencimiento de QR y versión de pedido.

## Pendiente de los siguientes hitos

El esquema no sustituye todavía las fuentes estáticas de la interfaz ni implementa los servicios de autenticación, QR, pedidos o telemetría. Es la base de persistencia para conectar esos servicios de forma incremental, manteniendo la demo funcional durante la migración.
