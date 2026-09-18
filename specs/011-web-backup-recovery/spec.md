# Feature Specification: Backups cifrados y recuperación

**Branch**: feature/web-backend
**Created**: 2026-09-18
**Status**: backend implementado y verificado; frontend web en siguiente etapa.

## User Scenarios & Testing

### User Story 1 - Crear copia verificable (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### User Story 2 - Restaurar sin perder consistencia (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### User Story 3 - Recuperar ante interrupción (Priority: P1)

Given datos de prueba consistentes y un perfil autorizado, When se ejecuta este flujo, Then se cumple el contrato, persiste exactamente una operación y se rechazan perfiles no autorizados.

### Edge Cases

Sesión revocada, concurrencia, caída de proceso, disco lleno, payload inválido, reintento y corrupción.

## Requirements

- **FR-011-01**: Snapshot SQLite online, integrity_check y foreign_key_check, SHA-256 y manifest de versión.
- **FR-011-02**: Contenedor cifrado AES-256-GCM con clave externa de 32 bytes; no claves en DB/Git.
- **FR-011-03**: Creación diaria, retención 14 copias exitosas y respaldo previo a restore; destino externo mediante descarga cifrada.
- **FR-011-04**: Carga limitada, identificadores UUID; no rutas de archivo suministradas por navegador.
- **FR-011-05**: Preview ligado al hash y al usuario, caducidad y confirmación con contraseña actual del jefe.
- **FR-011-06**: Restore bloquea operaciones, exige carritos resueltos, cierra conexión y WAL, journal durable y rollback.
- **FR-011-07**: Al restaurar se revocan todas las sesiones; copia anterior preservada; validar antes de alterar DB.
- **FR-011-08**: Pruebas de corte en swap/reapertura, archivo alterado, clave incorrecta, schema futuro y FK rota.

### Key Entities

Usuarios, sesiones, terminales, turnos, ventas y movimientos; servicios reutilizan snapshots, enteros seguros y transacciones. Backup contiene datos privados y debe permanecer cifrado.

## Success Criteria

Pruebas con SQLite real y HTTP verifican permisos, atomicidad, idempotencia y recuperación. Ningún éxito antes del commit o validación. No frontend en este incremento.

## Assumptions

Un comercio y depósito, servidor central con una API activa. HTTPS del mismo origen para frontend futuro. Sin facturación fiscal ni procesamiento bancario. Instalación pública requiere dominio/host y secretos externos, no se publican por esta tarea. Backups se exportan fuera del servidor durante mantenimiento.
