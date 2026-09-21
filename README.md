# Casa Brasa · Menú Visual

Sitio comercial para restaurantes: una carta tipo Reels con contenido visual, un pedido local, platos “Tu decides” y dos vistas de restaurante con datos de ejemplo.

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
3. Comprobar `https://DOMINIO/api/health` y revisar `docker compose ps`.

La aplicación escucha dentro de Docker en el puerto 3000. PostgreSQL persiste en un volumen independiente. Caddy termina HTTPS, publica únicamente `/assets/*` desde `public/assets` y envía el resto al servicio de aplicación en los puertos 80 y 443.

Para aplicar migraciones en un entorno con PostgreSQL disponible:

```bash
npm run db:migrate
```

El modelo relacional y sus decisiones están documentados en `docs/data-model.md`.

## Rutas

- `/` — landing comercial.
- `/carta` — carta visual para clientes.
- `/carta/tradicional` — carta digital tradicional con fotos y texto, sin videos.
- `/carta/plato/[slug]` — detalle de un plato.
- `/carta/pedido` — selección local del pedido.
- `/carta/proximamente` — platos futuros en prueba.
- `/carta/proximamente/[slug]` — detalle de un plato futuro.
- `/carta/restaurante` — resumen de interés.
- `/carta/restaurante/pruebas` — ranking de platos futuros.
- `/api/health` — comprobación de disponibilidad para Docker y el proxy.

## Personalización rápida

- Restaurante, tagline, ubicación, logo y WhatsApp: `data/restaurant.ts`.
- Platos, precios, copy, ingredientes y archivos visuales: `data/dishes.ts`.
- Assets públicos listos para el VPS: `public/assets/`.
- Platos futuros y votos de ejemplo: `data/candidates.ts`.
- Datos del dashboard e insights: `data/analytics.ts`.
- Sistema visual completo: `app/globals.css`.

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

La interfaz detecta si un video todavía no existe y muestra un fallback visual; cada archivo puede reemplazarse sin editar componentes.

## Estado de la carta

El pedido, los votos y los avisos usan estado local del navegador y `localStorage`. No se envía ningún pedido ni se conecta ningún servicio externo.
