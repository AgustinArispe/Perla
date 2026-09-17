# Data Model: Usuarios y permisos

users: UUID, username normalizado único, nombre, rol SELLER/SUPERVISOR/OWNER,
activo, password_hash, revisión y timestamps. No borrado físico.

auth_sessions: hash SHA256 del token aleatorio, user_id FK, revisión de usuario,
vencimiento. auth_attempts: username, fallos y bloqueo temporal.

audit_events: UUID, operación, entidad, usuario FK, nombre histórico y fecha UTC.
No almacena contraseñas, tokens ni payloads de login.

sales, sale_events y stock_movements: actor_user_id nullable y actor_name;
nullable representa historia legacy sin identidad conocida.

checkout_drafts: id por usuario (FK nullable para registro legacy), revisión y body;
bootstrap adopta el borrador legacy para el primer jefe. Cierre/cancelación sólo
consumen el borrador del usuario autenticado.
