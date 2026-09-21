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

El arranque prepara automáticamente la base D1 local con `db/seed.sql` y deja el health check disponible en `/api/health`. La configuración Docker inicial se encuentra en `Dockerfile` y `docker-compose.yml`; el servicio se publica únicamente en `127.0.0.1:4173` del host.

Para inicializar o volver a cargar los datos durante el desarrollo:

```bash
npm run build
npm run db:init
```

El estado de D1 local se conserva en `.wrangler/state` y Docker lo monta en el volumen `plato360-wrangler-state`.

## Rutas

- `/` — redirige a la carta visual.
- `/carta` — carta visual para clientes.
- `/carta/tradicional` — carta digital tradicional con fotos y texto, sin videos.
- `/carta/plato/[slug]` — detalle de un plato.
- `/carta/tu-decides` — platos futuros en prueba y votación.
- `/carta/tu-decides/[slug]` — detalle de un plato futuro.
- `/restaurante/login` — acceso privado de la vista restaurante.
- `/restaurante` — métricas y edición de contenido para el restaurante.

## API del MVP

- `GET /api/menu` — restaurante, categorías y platos publicados.
- `GET /api/tu-decides` — candidatos activos y sus métricas iniciales.
- `GET /api/health` — estado del servicio.
- `POST /api/auth/login` y `POST /api/auth/logout` — sesión de la vista restaurante.
- `GET/POST/PATCH/DELETE /api/admin/catalog` — lectura, alta, edición y eliminación protegida de negocio, categorías, platos e ideas. Las categorías con platillos asignados no se pueden borrar hasta mover esos platillos.
- `POST /api/admin/uploads` — carga protegida de imágenes de referencia para producción; en celular acepta cámara o archivos.
- `GET /api/assets/...` — sirve los assets cargados en el bucket R2 local/VPS.
- `GET/POST /api/admin/video-jobs` — cola protegida para solicitar videos por platillo. La llamada al generador HTTP POST queda preparada, pero todavía no se ejecuta.

La ruta anterior `/carta/proximamente` se conserva como alias compatible para enlaces existentes.

## Personalización rápida

- Restaurante, tagline, ubicación, logo y WhatsApp: `data/restaurant.ts`.
- Platos, precios, copy, ingredientes y archivos visuales: `data/dishes.ts`.
- Assets públicos listos para el VPS: `public/assets/`. Las imágenes que el restaurante suba desde el panel se guardan aparte en R2 mediante el binding `BUCKET`.
- Platos futuros y votos de ejemplo: `data/candidates.ts`.
- Esquema y seed persistente: `db/schema.ts` y `db/seed.sql`.
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

En la pestaña “Carta de videos” del panel restaurante, el bloque “Imágenes para producción” permite elegir una imagen, abrir la cámara en dispositivos móviles y subir varias imágenes. Las referencias se conservan en la solicitud de video y se sirven desde `/api/assets/...`.

## Alcance actual del MVP

La interfaz pública incluye tres experiencias: carta visual, carta tradicional y “Tu decides”. El restaurante también cuenta con un panel privado separado en dos productos: “Carta tradicional” para cargar y editar platillos, y “Carta de videos” para gestionar assets y solicitar producción. Pedidos y pagos quedan fuera de esta primera versión.

La generación de video se integrará más adelante mediante una petición POST HTTP desde el servidor. Por ahora, solicitar un video crea una tarea `requested` en la cola local; los videos terminados se pueden cargar manualmente desde `public/assets/videos/`.

## Acceso local del restaurante

En Docker, la demo usa por defecto `admin` / `plato360-local`. Se pueden reemplazar antes de iniciar el contenedor mediante `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET`. Estos valores son únicamente de desarrollo local; antes de publicar en un VPS deben definirse como secretos propios.

## Estado de la carta

Los votos, avisos, catálogo del restaurante y solicitudes de video se guardan en la base local D1 de la demo. No se envían pedidos ni se conecta todavía ningún servicio externo de generación.
