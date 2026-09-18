# Frontend web — implementación

**Objetivo:** entregar todos los módulos conectados a la API real.
**Arquitectura:** conservar los módulos React y el controlador de caja; adaptar su contrato al transporte HTTP con cookies y CSRF. Completar operación de caja, configuración y recuperación. Servir el frontend desde el mismo origen que la API.

- [x] Adaptador HTTP, sesión, importación CSV y pruebas de transporte.
- [x] Navegación por roles y sesión web; preservar borradores al navegar.
- [x] Terminal, apertura, cierre y movimientos; consulta de turnos y auditoría.
- [x] Configuración, terminales, exportaciones y recuperación de backups.
- [x] Unificar presentación, reducir textos y revisar todos los módulos existentes.
- [x] Publicación de archivos web en el servidor y contenedor.
- [x] Verificar tipos, seguridad, flujos reales y presentación en navegador.

**Criterios:** no almacenar credenciales en el navegador; no reintentar escrituras automáticamente; conservar claves de operaciones ante respuestas inciertas; no confirmar ventas sin conexión. El jefe accede a todo, el supervisor no accede al resumen ni administración y el vendedor opera solo caja.
