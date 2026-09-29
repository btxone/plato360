# Autenticación y sesiones

## Principios

- El SuperAdmin no vive en `users`: su nombre y hash Argon2id llegan por `SUPERADMIN_USERNAME` y `SUPERADMIN_PASSWORD_HASH`.
- Admin y Mozo se almacenan en PostgreSQL con hash Argon2id individual, estado activo/suspendido y cambio obligatorio inicial.
- El navegador recibe únicamente un token opaco aleatorio. PostgreSQL conserva su digest SHA-256 en `auth_sessions`.
- La cookie es `HttpOnly`, `SameSite=Strict`, `Path=/` y `Secure` en producción.
- Login, logout y cambio de contraseña escriben auditoría.
- Cinco fallos consecutivos bloquean temporalmente al usuario almacenado y el limitador de proceso protege también la cuenta externa SuperAdmin.
- Las contraseñas nuevas, temporales y restablecidas deben tener al menos 6 caracteres.

## Variables mínimas

```dotenv
SUPERADMIN_USERNAME=admin
SUPERADMIN_PASSWORD_HASH=$argon2id$v=19$m=19456,t=2,p=1$...
```

El hash se genera fuera del repositorio y nunca se reemplaza por la contraseña en claro. La rotación se hace modificando el secreto del VPS y reiniciando la aplicación.

## Endpoints actuales

| Método | Ruta | Resultado |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Valida credenciales y crea sesión opaca. |
| `POST` | `/api/auth/logout` | Revoca la sesión actual y limpia la cookie. |
| `GET` | `/api/auth/me` | Devuelve el rol y la identidad de la sesión actual. |
| `POST` | `/api/auth/password` | Cambia la contraseña de Admin/Mozo y elimina el requisito inicial. |

El cambio de credenciales del SuperAdmin queda deliberadamente fuera de la interfaz y se realiza mediante secretos del VPS.

## Siguientes controles

CSRF, autorización por endpoint, gestión de usuarios y una pantalla operativa de login se incorporarán en los hitos siguientes. La cookie estricta y la autorización en servidor no se sustituyen por controles visuales.
