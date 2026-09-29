# Gestión de usuarios y RBAC

## Matriz implementada en servidor

| Acción | SuperAdmin | Admin | Mozo |
| --- | --- | --- | --- |
| Listar usuarios internos | Sí | Sí, solo de su local | No |
| Crear Admin | Sí | No | No |
| Crear Mozo | Sí | Sí | No |
| Editar Admin | Sí | No | No |
| Editar Mozo | Sí | Sí | No |
| Activar/suspender Admin | Sí | No | No |
| Activar/suspender Mozo | Sí | Sí | No |
| Eliminar Admin | Sí | No | No |
| Eliminar Mozo | Sí | Sí | No |
| Restablecer contraseña Admin | Sí | No | No |
| Restablecer contraseña Mozo | Sí | Sí | No |

La cuenta SuperAdmin externa no se inserta en `users` y por ello tampoco aparece en el listado. Todos los Mozos activos comparten las mismas capacidades; no hay permisos individuales por acción.

## Endpoints

- `GET /api/admin/users`: lista usuarios internos visibles para el rol actual.
- `POST /api/admin/users`: crea Admin o Mozo con contraseña temporal y cambio obligatorio.
- `PATCH /api/admin/users/:id` con `activate`, `suspend`, `update` o `reset_password`: modifica datos, cambia estado o restablece contraseña.
- `DELETE /api/admin/users/:id`: elimina un usuario y revoca sus sesiones por cascada.

Cada operación valida sesión, rol y local en el servidor, revoca sesiones al suspender/restablecer y escribe `audit_logs`.
