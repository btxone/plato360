# Catálogo público conectado

Las rutas `/`, `/carta` y sus variantes cargan un `CatalogSnapshot` en el servidor antes de renderizar la interfaz.

## Fuente de datos

1. Si `DATABASE_URL` existe y hay contenido publicado, se consultan `products`, `categories`, `menu_entries`, `ingredients`, `media_assets`, `product_media` y las tablas de candidatos.
2. Solo se exponen entradas visuales publicadas, disponibles y asociadas al local.
3. Los votos e interesados de candidatos se cuentan desde PostgreSQL. Si no hay muestra, la interfaz muestra “todavía sin muestra” o “telemetría pendiente” en vez de porcentajes inventados.
4. Si la base no está configurada, está vacía o no responde, se devuelve un catálogo vacío y la interfaz informa que todavía no hay platos publicados.

No existe fallback de datos sintéticos en runtime. `npm run db:seed` es una carga inicial explícita para un entorno nuevo; una vez cargado, la carta depende únicamente del contenido publicado en PostgreSQL.

## Medios

Los `storage_key` de PostgreSQL se convierten en rutas públicas `/assets/*`. Caddy puede servir esos archivos directamente desde la carpeta aislada de medios, mientras que la aplicación conserva la composición del catálogo y sus permisos.
