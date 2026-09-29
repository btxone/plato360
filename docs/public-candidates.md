# Votos e intereses de platos en prueba

La sección “Tu decides” ya persiste la participación del comensal cuando existe una sesión QR.

## Votos

`POST /api/public/candidates/:slug/vote` busca el candidato publicado dentro del local de la sesión y registra como máximo un voto por `diner_session_id`. Repetir la solicitud es idempotente: devuelve el conteo actual sin insertar otro registro.

## Intereses

`POST /api/public/candidates/:slug/interest` recibe `{ email, acceptedNotification }`. El email se valida, se normaliza a minúsculas para la restricción de unicidad y se guarda junto al candidato. Repetir el mismo email para el mismo candidato tampoco genera duplicados.

Ambos endpoints exigen sesión pública, validan la bandera `candidates` y aíslan los datos por local. La carta carga los conteos desde PostgreSQL; si la sesión o el servidor rechazan la acción, la interfaz revierte el estado optimista y muestra el motivo.
