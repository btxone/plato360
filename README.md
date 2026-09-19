# Casa Brasa · Menú Visual

MVP de carta digital para restaurantes: una carta tipo Reels con contenido visual, una carta tradicional con fotos y una sección “Tu decides” para validar nuevos platos.

## Ejecutar

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
npm run start
```

Para ejecutarla con el runtime preparado para VPS:

```bash
npm run build
npm run start:vps
```

El health check queda disponible en `/api/health`. La configuración Docker inicial se encuentra en `Dockerfile` y `docker-compose.yml`; el servicio se publica únicamente en `127.0.0.1:4173` del host.

## Rutas

- `/` — redirige a la carta visual.
- `/carta` — carta visual para clientes.
- `/carta/tradicional` — carta digital tradicional con fotos y texto, sin videos.
- `/carta/plato/[slug]` — detalle de un plato.
- `/carta/tu-decides` — platos futuros en prueba y votación.
- `/carta/tu-decides/[slug]` — detalle de un plato futuro.

La ruta anterior `/carta/proximamente` se conserva como alias compatible para enlaces existentes.

## Personalización rápida

- Restaurante, tagline, ubicación, logo y WhatsApp: `data/restaurant.ts`.
- Platos, precios, copy, ingredientes y archivos visuales: `data/dishes.ts`.
- Assets públicos listos para el VPS: `public/assets/`.
- Platos futuros y votos de ejemplo: `data/candidates.ts`.
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

## Alcance actual del MVP

La interfaz pública está limitada a tres experiencias: carta visual, carta tradicional y “Tu decides”. Pedidos, pagos, dashboard de restaurante y generación automática de videos quedan fuera de esta primera versión.

La generación de video se integrará más adelante mediante una petición POST HTTP desde el servidor. Por ahora los videos se cargan manualmente desde `public/assets/videos/`.

## Estado de la carta

Los votos y los avisos usan estado local del navegador y `localStorage` en esta etapa visual. No se envían pedidos ni se conecta ningún servicio externo. La persistencia central de votos y emails corresponde a los siguientes milestones del MVP.
