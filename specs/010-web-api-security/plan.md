# Implementation Plan: API web y seguridad

**Goal**: completar esta capacidad antes de integrar frontend web.

## Architecture

API y worker separados; permisos y dominio independientes de React/Electron. SQLite central, configuración y secretos de entorno, pruebas con DB temporal.

## Files

- `src/server/app.ts`
- `src/server/config.ts`
- `src/server/rpc.ts`
- `src/server/worker.ts`
- `src/server/runtime.ts`
- `src/server/cli.ts`
- `tests/integration/web-api.test.ts`

## Verification

Tests primero, confirmar RED, implementar, verificar tipos/lint/tests y HTTP real, revisar y registrar evidencia. Sin despliegue ni datos del cliente.
