# Locations and Transfers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incorporar ubicaciones y traslados seguros sin modificar el recorrido de un negocio con un solo local.

**Architecture:** SQLite conserva un saldo consolidado compatible y agrega saldos por ubicación. Un servicio transaccional controla despacho, tránsito, recepción, diferencia y cancelación con claves idempotentes; la capa de aplicación aplica funciones y permisos.

**Tech Stack:** TypeScript 6, SQLite/better-sqlite3, Zod, React 19, Vitest, Playwright.

**Spec:** `specs/022-locations-transfers/spec.md`

## Global Constraints

- La ubicación principal debe ser invisible cuando la función está apagada.
- Las operaciones de stock y el ledger del traslado deben confirmar juntos.
- No se usan números de punto flotante para dinero ni cantidades.
- El módulo se entrega apagado y depende de Control de stock.
- La interfaz debe funcionar con teclado, PC y celular.

---

### Task 1: Esquema compatible

**Files:** Create `src/worker/db/migrations/022_locations_transfers.sql`; modify `src/worker/db/migrations.ts`; test `tests/integration/locations-transfers.test.ts`.

**Interfaces:** Produce ubicación principal, `terminal_locations`, `location_inventory_balances`, `stock_transfers`, `stock_transfer_items` y `stock_transfer_events`.

- [ ] Escribir una prueba que migre una base con saldo y terminal previos.
- [ ] Ejecutar la prueba y comprobar el fallo por tablas ausentes.
- [ ] Crear la migración, sembrar ubicación/asignaciones/saldos y registrar versión 22.
- [ ] Ejecutar la prueba y comprobar que saldos y terminales coinciden.

### Task 2: Ledger local y contratos

**Files:** Create `src/shared/locations.ts`; modify `src/worker/stock/repository.ts`; test `tests/integration/locations-transfers.test.ts`.

**Interfaces:** `balance(productId, locationId?)`; `appendWithinTransaction({ locationId?, ... })`; schemas `LocationSaveSchema`, `TransferDispatchSchema`, `TransferReceiveSchema`, `TransferCancelSchema`.

- [ ] Escribir pruebas de saldo local y consolidado.
- [ ] Ejecutarlas y confirmar el fallo.
- [ ] Ampliar el repositorio para actualizar ambos saldos en una transacción.
- [ ] Ejecutar las pruebas y comprobar los importes exactos.

### Task 3: Servicio transaccional

**Files:** Create `src/worker/locations/service.ts`; modify `src/worker/application.ts`; test `tests/integration/locations-transfers.test.ts`.

**Interfaces:** `listLocations`, `saveLocation`, `assignTerminal`, `dispatch`, `receive`, `cancel`, `listTransfers`, `detail`.

- [ ] Escribir casos de despacho, reintento, recepción con diferencia y cancelación.
- [ ] Ejecutar y confirmar que faltan las operaciones.
- [ ] Implementar validación, fotografías de producto/costo, eventos e idempotencia.
- [ ] Ejecutar y verificar estados y saldos.

### Task 4: Funciones, permisos y transporte

**Files:** Modify `src/shared/features.ts`, `src/domain/features.ts`, `src/domain/permissions.ts`, `src/shared/contracts.ts`, `src/main/preload.ts` and API route maps.

**Interfaces:** Feature `LOCATIONS_TRANSFERS`; operations `locations.*` and `transfers.*`; `BochaApi.locations` and `BochaApi.transfers`.

- [ ] Agregar pruebas unitarias de función y permisos.
- [ ] Ejecutar y confirmar el fallo.
- [ ] Integrar catálogos, dependencias, bloqueo por pendientes y adaptadores.
- [ ] Ejecutar unitarias e integración.

### Task 5: Interfaz responsive

**Files:** Create `src/renderer/features/locations/LocationsPage.tsx` and focused child components; modify shell/routes/help/styles.

**Interfaces:** Consume `window.bocha.locations` and `window.bocha.transfers`; expose route `/locations`.

- [ ] Escribir pruebas del recorrido visible y del módulo apagado.
- [ ] Implementar navegación condicional, tarjetas de saldo y flujo de traslado.
- [ ] Verificar a 390 px y escritorio, foco, estados vacíos y errores.

### Task 6: Validación integral

**Files:** Modify `docs/roadmap-modular.md`, `specs/022-locations-transfers/tasks.md`.

- [ ] Ejecutar pruebas específicas de ubicaciones y traslados.
- [ ] Ejecutar `npm run check`.
- [ ] Ejecutar `npm run test:web`.
- [ ] Marcar tareas y roadmap únicamente con evidencia verde.
