# Telemetría pública

`POST /api/public/telemetry` recibe eventos anónimos vinculados a la sesión QR. El endpoint admite impresiones, aperturas de detalle, agregados al carrito, pedidos, votos e intereses.

Cada evento requiere una `idempotencyKey`. El servidor la combina con la sesión y guarda una huella SHA-256; los reintentos devuelven cuántos eventos nuevos fueron aceptados y cuántos ya existían. Los slugs de productos/candidatos y los pedidos se validan contra el local y la sesión antes de insertar.

La respuesta no expone cookies ni datos personales. La bandera `telemetry` permite apagar el registro por local. Los agregados diarios se mantienen en el esquema para el siguiente job de consolidación y dashboard.
