# Implementation Plan: Catálogo y carga inicial de productos

**Branch**: sin crear | **Date**: 2026-09-17 | **Spec**: [spec.md](spec.md)
**Input**: `specs/002-product-catalog/spec.md`
**Estado**: borrador de diseño, no se ejecutaron tareas de aplicación.

## Summary

Administrar productos unitarios y por kilo, con búsqueda rápida y una carga inicial revisable de aproximadamente 2.000 artículos.

Repositorio SQL con normalización de búsqueda y caché invalidada tras guardar/importar. PreviewImport usa token asociado al archivo validado y su hash.

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

- `src/worker/products/service.ts`
- `src/worker/products/repository.ts`
- `src/worker/products/import.ts`
- `src/renderer/features/products/ProductList.tsx`
- `src/renderer/features/products/ProductForm.tsx`
- `src/renderer/features/products/ImportPreview.tsx`
- `src/worker/db/migrations/002_products.sql`

### Verification files

- `tests/unit/product-validation.test.ts`
- `tests/integration/catalog-import.test.ts`
- `tests/e2e/product-search.spec.ts`

## Phase 0: Research

[Decisiones y alternativas](research.md); [arquitectura común](../../docs/arquitectura.md),
[scanner/peso](../../docs/scanner-y-peso.md). Las hipótesis de hardware se mantienen
como condiciones de verificación de entrega, no se inventa compatibilidad.

## Phase 1: Data, Contracts and Validation

[Datos](data-model.md), [contrato](contracts/interface.md), [validación](quickstart.md).
El diseño global en docs/modelo-datos.md y docs/contratos.md evita duplicar reglas
de stock y dinero. Confirmar una venta y sus movimientos es una sola transacción.

## Delivery Order

Dependencias: 001-desktop-core.
Ejecutar las tareas de tests, implementación y validación por historia; revisar el
resultado antes del siguiente módulo. No ejecutar código de aplicación durante
la revisión de este plan. Commits locales pequeños por comportamiento probado.
