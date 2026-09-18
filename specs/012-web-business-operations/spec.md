# Feature Specification: Operación completa de caja y administración

**Branch**: feature/web-backend
**Created**: 2026-09-18
**Status**: backend implementado y verificado; frontend web en siguiente etapa.

## User Scenarios & Testing

### User Story 1 - Configurar negocio y cajas (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### User Story 2 - Abrir y cerrar caja (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### User Story 3 - Auditar y exportar (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### Edge Cases

Sesión revocada, concurrencia, caída de proceso, disco lleno, payload inválido, reintento y corrupción.

## Requirements

- **FR-012-01**: Configuración versionada y medios de pago habilitados; cambios sólo por OWNER.
- **FR-012-02**: Terminales activas, una caja abierta por terminal; SELLER limitado a su caja/sesión y operaciones de Caja.
- **FR-012-03**: Apertura, ingresos/retiros con motivo, cierre contado/esperado/diferencia; claves estables y revisión.
- **FR-012-04**: Venta web exige caja abierta; cabecera terminal/shift y stock/pagos/auditoría son un commit.
- **FR-012-05**: Anulación de venta en turno cerrado registra devolución de efectivo en turno abierto actual; cierre anterior no se reescribe.
- **FR-012-06**: Histórico de cierres para supervisor/jefe; vendedor ve su turno. Supervisor no accede a dashboard ni exportación global.
- **FR-012-07**: Consulta paginada de auditoría sin credenciales; recuperación administrativa revoca sesiones.
- **FR-012-08**: Exportación CSV para Excel, filtros y neutralización de fórmulas; no exportar hashes ni sesiones.

### Key Entities

Usuarios, sesiones, terminales, turnos, ventas y movimientos; servicios reutilizan snapshots, enteros seguros y transacciones. Backup contiene datos privados y debe permanecer cifrado.

## Success Criteria

Pruebas con SQLite real y HTTP verifican permisos, atomicidad, idempotencia y recuperación. Ningún éxito antes del commit o validación. No frontend en este incremento.

## Assumptions

Un comercio y depósito, servidor central con una API activa. HTTPS del mismo origen para frontend futuro. Sin facturación fiscal ni procesamiento bancario. Instalación pública requiere dominio/host y secretos externos, no se publican por esta tarea. Backups se exportan fuera del servidor durante mantenimiento.
