# Servicio de códigos QR

El servicio de QR conecta una mesa con la carta pública y, en los siguientes hitos, con una sesión anónima de comensal y sus pedidos. La implementación está pensada para una instalación de Plato360 por local, aunque el esquema ya conserva `location_id` para mantener el aislamiento entre locales.

## Tipos de QR

- `fixed`: QR permanente para imprimir y dejar en una mesa. Solo lo puede emitir SuperAdmin y requiere habilitar `fixed_qr`.
- `dynamic`: QR temporal para rotaciones, pruebas o campañas. Lo pueden emitir los perfiles operativos, requiere `dynamic_qr` y dura entre 15 minutos y 24 horas. Al emitir otro QR dinámico para la misma mesa, el anterior se revoca.

El token está compuesto por un payload firmado con HMAC-SHA256. La base de datos solo conserva la huella SHA-256 del token, nunca el token original. Para invalidar un QR se cambia su estado a `revoked`; un token vencido también se revoca al ser detectado.

## Configuración

Definir `QR_HMAC_SECRET` con al menos 32 caracteres aleatorios. Para construir un enlace completo desde la administración se puede definir `PUBLIC_APP_URL`.

## Endpoints administrativos

- `GET /api/admin/qr`: lista los QR del local de la sesión. No devuelve tokens.
- `POST /api/admin/qr`: crea un QR y devuelve el token una única vez. Recibe `{ kind, tableLabel, durationMinutes?, locationId? }`.
- `DELETE /api/admin/qr/:id`: revoca un QR activo.

Todos los cambios quedan registrados en auditoría como `qr.created` o `qr.revoked`. La API valida la sesión, el rol y el local antes de consultar o modificar datos.

## Próximo encadenamiento

El siguiente hito consume el token desde la carta pública para crear o recuperar una sesión anónima de comensal. A partir de esa sesión se podrán asociar votos, intereses y pedidos sin exponer credenciales ni confiar en precios enviados por el navegador.
