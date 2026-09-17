# Implementation Plan: Ventas, medios de pago e histórico

**Branch**: sin crear | **Date**: 2026-09-17 | **Spec**: [spec.md](spec.md)
**Input**: `specs/006-sales-payments-history/spec.md`
**Estado**: borrador de diseño, no se ejecutaron tareas de aplicación.

## Summary

Confirmar cobro, registrar venta y stock atómicamente, conservar precios históricos y permitir consulta/anulación trazable.

Sales service coordinador transaccional y snapshots; historial paginado por cursor; anulación como evento con motivo y contramovimientos.

## Technical Context

- **Language/Version**: TypeScript strict; Node.js 24 LTS como herramienta de desarrollo.
- **Primary Dependencies**: React, Vite, Electron, better-sqlite3, Zustand, TanStack Query y validación de DTOs. Versiones exactas se fijan en lockfile en 001 tras verificar compatibilidad nativa.
- **Storage**: SQLite local, SQL parametrizado y migraciones versionadas.
- **Testing**: Vitest para dominio/integración; Playwright para teclado/UI; Windows físico para scanner/instalación.
- **Target Platform**: Windows 11 x64, PC de referencia SSD/8 GB RAM.
- **Project Type**: aplicación de escritorio offline, un comercio y una caja.
- **Performance Goals**: [metas y dataset común](../../docs/arquitectura.md#persistencia-y-rendimiento).
- **Constraints**: [constitución](../../.specify/memory/constitution.md); sin operaciones fiscales ni procesamiento bancario.
- **Scale/Scope**: 2.000 productos inicialmente; prueba con 10.000 productos y 100.000 ventas.

## Constitution Check

- [x] Reglas de dinero entero, cantidades base y snapshots aplicadas.
- [x] UI local separada del acceso SQL; sin servidor HTTP ni acceso SQL desde renderer.
- [x] Operaciones durables/idempotentes planificadas y errores observables.
- [x] Validación automática y física definida, sin afirmar pruebas no ejecutadas.
- [x] Diseño no incluye ampliaciones fuera del alcance declarado.
Revisión previa y posterior al diseño: cumple sin excepciones propuestas.

## Project Structure

### Documentation (this feature)

spec.md, plan.md, research.md, data-model.md, contracts/interface.md,
quickstart.md, tasks.md y checklists/requirements.md.

### Source Code (repository root)

- `src/domain/sale.ts`
- `src/domain/payment.ts`
- `src/worker/sales/service.ts`
- `src/worker/sales/repository.ts`
- `src/renderer/features/checkout/PaymentDialog.tsx`
- `src/renderer/features/history/SalesList.tsx`
- `src/renderer/features/history/SaleDetail.tsx`
- `src/worker/db/migrations/006_sales.sql`

### Verification files

- `tests/unit/payment-discount.test.ts`
- `tests/integration/sale-atomicity.test.ts`
- `tests/e2e/sales-history.spec.ts`

## Phase 0: Research

[Decisiones y alternativas](research.md); [arquitectura común](../../docs/arquitectura.md),
[scanner/peso](../../docs/scanner-y-peso.md). Las hipótesis de hardware se mantienen
como condiciones de verificación de entrega, no se inventa compatibilidad.

## Phase 1: Data, Contracts and Validation

[Datos](data-model.md), [contrato](contracts/interface.md), [validación](quickstart.md).
El diseño global en docs/modelo-datos.md y docs/contratos.md evita duplicar reglas
de stock y dinero. Confirmar una venta y sus movimientos es una sola transacción.

## Delivery Order

Dependencias: 001-desktop-core, 002-product-catalog, 003-stock-ledger, 004-checkout-scanner, 005-weighted-products.
Ejecutar las tareas de tests, implementación y validación por historia; revisar el
resultado antes del siguiente módulo. No ejecutar código de aplicación durante
la revisión de este plan. Commits locales pequeños por comportamiento probado.
