# Funciones configurables

Las funciones se guardan por local en `feature_flags`. Desactivarlas no elimina datos, pero los próximos endpoints deberán consultar el flag antes de aceptar operaciones o publicar la superficie correspondiente.

| Clave | Valor inicial |
| --- | --- |
| `visual_menu` | Activa |
| `traditional_menu` | Activa |
| `orders` | Activa |
| `candidates` | Activa |
| `fixed_qr` | Activa |
| `dynamic_qr` | Activa |
| `telemetry` | Activa |
| `video_generation` | Desactivada |

Solo SuperAdmin puede consultar o cambiar estas funciones mediante `GET/PATCH /api/admin/features`. La autorización se comprueba en servidor y cada cambio se audita.
