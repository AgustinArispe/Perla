# Implementation Plan: Backups cifrados y recuperación

**Goal**: completar esta capacidad antes de integrar frontend web.

## Architecture

API y worker separados; permisos y dominio independientes de React/Electron. SQLite central, configuración y secretos de entorno, pruebas con DB temporal.

## Files

- `src/server/backups/service.ts`
- `src/server/backups/codec.ts`
- `src/server/backups/recovery.ts`
- `tests/integration/web-backup.test.ts`

## Verification

Tests primero, confirmar RED, implementar, verificar tipos/lint/tests y HTTP real, revisar y registrar evidencia. Sin despliegue ni datos del cliente.
