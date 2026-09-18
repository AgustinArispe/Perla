# Implementation Plan: Operación completa de caja y administración

**Goal**: completar esta capacidad antes de integrar frontend web.

## Architecture

API y worker separados; permisos y dominio independientes de React/Electron. SQLite central, configuración y secretos de entorno, pruebas con DB temporal.

## Files

- `src/shared/operations.ts`
- `src/worker/operations/service.ts`
- `src/worker/operations/cash.ts`
- `src/worker/operations/export.ts`
- `src/worker/db/migrations/006_web_operations.sql`
- `tests/integration/web-operations.test.ts`

## Verification

Tests primero, confirmar RED, implementar, verificar tipos/lint/tests y HTTP real, revisar y registrar evidencia. Sin despliegue ni datos del cliente.
