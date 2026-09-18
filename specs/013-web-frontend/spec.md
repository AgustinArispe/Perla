# Feature Specification: Frontend web completo

**Branch**: feature/web-frontend
**Created**: 2026-09-18
**Status**: implementación y verificación.

## User Scenarios & Testing

### User Story 1 - Vender con teclado (Priority: P1)
Con una cuenta de vendedor, elegir terminal, abrir caja, escanear productos, cobrar y cancelar el carrito actual. El lector USB conserva códigos con ceros iniciales y aumenta la cantidad al repetir un código.

### User Story 2 - Administrar el almacén (Priority: P1)
Supervisor y jefe mantienen productos y stock, consultan ventas y turnos. Solo el jefe administra usuarios, configuración y resumen mensual.

### User Story 3 - Resguardar y consultar datos (Priority: P1)
El jefe descarga exportaciones y backups, revisa una copia y la restaura tras confirmar su contraseña. La restauración cierra todas las sesiones.

### Edge Cases
Conexión perdida durante venta, respuesta incierta, sesión revocada, terminal sin caja abierta, revisiones concurrentes, diálogos que suspenden el scanner, stock insuficiente y copia inválida.

## Requirements

- **FR-013-01**: React/TypeScript conectado a la API real, cookies privadas y CSRF en memoria.
- **FR-013-02**: Todos los módulos disponibles según roles y permisos del servidor.
- **FR-013-03**: Caja por unidad y peso, descuentos, pagos habilitados, cambio y borradores. Claves estables para operaciones financieras.
- **FR-013-04**: Apertura, ingresos/retiros, cierre contado y consulta de turnos.
- **FR-013-05**: CRUD e importación CSV, stock y movimientos, ventas y anulaciones, resumen mensual.
- **FR-013-06**: Configuración, usuarios, terminales, auditoría, exportación CSV y backups cifrados.
- **FR-013-07**: Blanco dominante, verde de acento, controles y números grandes, textos breves. Accesibilidad por teclado y adaptación a pantallas pequeñas.
- **FR-013-08**: Mismo origen para aplicación y API; contenedor sirve el frontend sin exponer datos internos.

### Key Entities
Sesión web, terminal, turno, carrito, producto, venta, stock, informe mensual y copia de seguridad. Se reutilizan los modelos del backend; no se modifica el esquema de base de datos.

## Success Criteria
Venta escaneada y cobrada en navegador con persistencia; navegación de todos los módulos; recuperación desde backup con cierre de sesión; permisos vendedor/supervisor/jefe; compilación, tipos, lint y pruebas correctas.

## Assumptions
Servidor central conectado. Sin confirmación offline, sin tickets fiscales y sin ARCA. Las credenciales iniciales se configuran privadamente.
