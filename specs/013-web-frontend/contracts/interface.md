# Interface
Se consume /api/v1 bajo el mismo origen. JSON Result<T> con errores de dominio. GET auth/session entrega usuario, terminal y CSRF; POST auth/login activa cookie. Todas las mutaciones requieren CSRF. Download de CSV/backups devuelve archivos; upload de backup usa application/octet-stream. El contrato completo está en [backend web](../../../docs/backend-web.md).
