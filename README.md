# Plato360 · Producto operativo

Producto para restaurantes: carta pública de videos, pedidos asociados a mesa, QR operativos y consola autenticada para SuperAdmin, Admin y Mozo. El contenido visible se carga desde PostgreSQL.

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

El proyecto se ejecuta con Next.js sobre Node.js. El adaptador Vinext/Cloudflare se conserva únicamente como compatibilidad temporal en los comandos `*:vinext`.

Para ejecutar la prueba de humo de las rutas principales con el servidor local activo:

```bash
npm run test:smoke
```

Para generar la versión de producción:

```bash
npm run build
npm run start
```

El comando `start` usa el servidor standalone generado por Next.js, que es el mismo artefacto que ejecuta la imagen Docker.

## Despliegue en VPS

El despliegue reproducible para el VPS está definido en `Dockerfile`, `docker-compose.yml` y `Caddyfile`.

1. Copiar `.env.example` a `.env` y definir `DOMAIN`, `POSTGRES_PASSWORD`, `SUPERADMIN_PASSWORD_HASH` y `QR_HMAC_SECRET`.
2. Ejecutar `docker compose up -d --build`.
3. Aplicar `npm run db:migrate` y `npm run db:seed` usando la conexión local `postgres://...@localhost:5433/plato360`.
4. Comprobar `http://localhost/api/health` y revisar `docker compose ps`.

La aplicación escucha dentro de Docker en el puerto 3000. PostgreSQL persiste en un volumen independiente y publica el puerto 5433 solo en `127.0.0.1` para facilitar migraciones locales. Caddy termina HTTPS, publica únicamente `/assets/*` desde `public/assets` y envía el resto al servicio de aplicación en los puertos 80 y 443.

Para aplicar migraciones en un entorno con PostgreSQL disponible:

```bash
npm run db:migrate
```

El modelo relacional y sus decisiones están documentados en `docs/data-model.md`.

## Rutas

- `/` — redirección a la carta.
- `/carta` — carta pública de videos publicada en el local.
- `/carta/plato/[slug]` — detalle de un plato.
- `/carta/pedido` — selección local del pedido.
- `/carta/proximamente` — platos futuros en prueba.
- `/carta/proximamente/[slug]` — detalle de un plato futuro.
- `/panel` — consola operativa protegida por sesión. `/admin` redirige a esta ruta para conservar accesos anteriores.
- `/api/health` — comprobación de disponibilidad para Docker y el proxy.
- `/api/public/session` — abre o reutiliza la sesión anónima de una mesa a partir de un token QR.
- `/api/public/orders` — crea y consulta pedidos asociados a la sesión de la mesa.
- `/api/public/candidates/:slug/vote` — registra un voto por sesión para un plato en prueba.
- `/api/public/candidates/:slug/interest` — registra un email interesado, sin duplicados.
- `/api/public/telemetry` — registra eventos anónimos idempotentes de la sesión QR.
- `/api/admin/orders` — bandeja protegida para consultar y atender pedidos por local.
- `/api/admin/users` — gestión de usuarios internos por rol.
- `/api/admin/qr` — emisión, consulta y revocación de QR.
- `/api/admin/features` — funciones del local, sólo para SuperAdmin.

## Personalización rápida

- Los fixtures iniciales de carga están en `data/` y sólo los consume `npm run db:seed`; la aplicación no los usa como fallback.
- El contenido operativo se administra en PostgreSQL y sus medios se sirven desde `public/assets/`.
- Sistema visual completo: `app/globals.css`.

El catálogo público sólo muestra productos publicados y disponibles en PostgreSQL. Si la base no está configurada o no tiene contenido, la carta muestra un estado vacío y no inventa datos.

Los códigos QR, las sesiones anónimas, los pedidos públicos, la participación en candidatos, la telemetría y la bandeja operativa están documentados en `docs/qr-service.md`, `docs/public-session.md`, `docs/public-orders.md`, `docs/public-candidates.md`, `docs/telemetry.md` y `docs/admin-orders.md`.

## Assets

La carpeta pública completa está organizada así:

```text
public/assets/
├── brand/casa-brasa.svg
├── favicon.svg
├── images/menu/              # Fotos de la carta tradicional
├── images/posters/           # Posters de videos
├── videos/                   # Videos de carta y Tu decides
└── misc/                     # Assets auxiliares del starter
```

Al desplegar, se debe copiar la carpeta `public/assets/` junto con la aplicación. Las rutas públicas empiezan con `/assets/`, por lo que funcionan igual en local y en el VPS.

La carta reproduce únicamente videos publicados. Si un medio falta, se informa el estado sin sustituirlo por contenido sintético.

## Estado de la carta

Los pedidos, votos, avisos y eventos de telemetría se persisten en PostgreSQL cuando la persona entra desde una sesión QR válida. La sesión del carrito sólo conserva la selección actual del navegador hasta enviar el pedido.
