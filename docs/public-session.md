# Sesiones públicas de comensal

La ruta `POST /api/public/session` convierte un token QR válido en una sesión anónima vinculada a un local, una mesa y el código QR utilizado. No requiere cuenta ni expone credenciales.

## Flujo

1. El navegador recibe un enlace `/carta?qr=...` desde un QR emitido por administración.
2. La carta envía el token a `/api/public/session` y elimina el parámetro de la barra de direcciones con `history.replaceState`.
3. El servidor verifica la firma HMAC, la vigencia y el estado del QR.
4. Si no existe una sesión válida para ese local y mesa, crea un registro anónimo.
5. El servidor entrega una cookie `HttpOnly`, `SameSite=Lax`, con duración de 12 horas.

La cookie contiene un token opaco; PostgreSQL conserva únicamente su huella SHA-256. Si el visitante vuelve a escanear un QR de la misma mesa, se reutiliza la sesión y se actualiza el QR activo. Si cambia de mesa o local, se crea una sesión independiente.

## Respuesta pública

La respuesta expone solo el identificador de sesión, local, mesa, QR asociado, identificador anónimo y marcas de tiempo. No contiene el token de sesión, la huella almacenada ni credenciales.

## Encadenamiento futuro

Pedidos, votos, intereses y telemetría usarán esta sesión como contexto. Los precios y la identidad de los platos seguirán resolviéndose en el servidor desde PostgreSQL; el navegador no podrá imponer el total de un pedido.
