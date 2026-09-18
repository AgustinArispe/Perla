# Feature Specification: API web y seguridad

**Branch**: feature/web-backend
**Created**: 2026-09-18
**Status**: backend implementado y verificado; frontend web en siguiente etapa.

## User Scenarios & Testing

### User Story 1 - Autenticar y revocar sesiones (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### User Story 2 - Vender con permisos y concurrencia (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### User Story 3 - Operar el servidor de forma segura (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### Edge Cases

Sesión revocada, concurrencia, caída de proceso, disco lleno, payload inválido, reintento y corrupción.

## Requirements

- **FR-010-01**: Fastify HTTP /api/v1; worker dedicado; SQLite central en volumen persistente, una réplica API.
- **FR-010-02**: Cookies HttpOnly, Secure y SameSite=Strict en producción; CSRF ligado a sesión, Origin exacto y JSON estricto.
- **FR-010-03**: Sin bootstrap ni recuperación pública; aprovisionamiento y recuperación mediante CLI privada.
- **FR-010-04**: RBAC en servidor, control de propiedad, rate limit por IP/usuario, sesión absoluta 8 h e inactividad 30 min.
- **FR-010-05**: Límites de body, cola, tiempos; proxy de confianza explícito, errores sin stack ni secretos.
- **FR-010-06**: TLS en Caddy, contenedor no root, red interna, health/readiness y apagado ordenado.
- **FR-010-07**: No confirmar ventas offline; reintento con checkoutKey, borrador por vendedor y una sesión web activa por usuario.

### Key Entities

Usuarios, sesiones, terminales, turnos, ventas y movimientos; servicios reutilizan snapshots, enteros seguros y transacciones. Backup contiene datos privados y debe permanecer cifrado.

## Success Criteria

Pruebas con SQLite real y HTTP verifican permisos, atomicidad, idempotencia y recuperación. Ningún éxito antes del commit o validación. No frontend en este incremento.

## Assumptions

Un comercio y depósito, servidor central con una API activa. HTTPS del mismo origen para frontend futuro. Sin facturación fiscal ni procesamiento bancario. Instalación pública requiere dominio/host y secretos externos, no se publican por esta tarea. Backups se exportan fuera del servidor durante mantenimiento.
