# Consolidation and Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir indicadores consolidados por ubicación y validar aislamiento y rendimiento con 4.000 productos.

**Architecture:** Una consulta agrupada usa `sales.location_id` y saldos locales como fuente autoritativa. El dashboard consume un contrato breve y los permisos del servidor limitan el consolidado a jefe/administrador.

**Tech Stack:** TypeScript, SQLite, Zod, React, TanStack Query, Vitest, Playwright.

**Spec:** `specs/023-consolidation-scale/spec.md`

## Global Constraints

- Una sola instancia de API escribe SQLite.
- Todo dinero y cantidad se conserva como entero.
- El cliente no decide la ubicación de una venta web.
- El resumen consolidado es exclusivo de jefe/administrador.

---

### Task 1: Contrato y consulta

**Files:** Create `src/shared/location-reports.ts`; modify `src/worker/locations/service.ts`; test `tests/integration/location-consolidation.test.ts`.

- [ ] Escribir pruebas con ventas en dos ubicaciones.
- [ ] Comprobar el fallo por operación ausente.
- [ ] Implementar agrupación mensual y total consolidado.
- [ ] Verificar suma, ticket, stock bajo y tránsito.

### Task 2: Seguridad y transportes

**Files:** Modify permissions, requests, contracts, preload, web client and server routes.

- [ ] Probar que supervisor y vendedor reciben FORBIDDEN.
- [ ] Registrar `locations.summary` como operación de jefe.
- [ ] Exponer GET `/api/v1/locations/summary`.
- [ ] Ejecutar pruebas de API.

### Task 3: Dashboard

**Files:** Create `src/renderer/features/dashboard/LocationSummary.tsx`; modify `DashboardPage.tsx` and `perla.css`.

- [ ] Construir tarjetas compactas de ubicación.
- [ ] Añadir estados vacío, carga y error.
- [ ] Adaptar a una columna en celular.

### Task 4: Escala y cierre

**Files:** Create `tests/integration/location-performance.test.ts`; update roadmap and tasks.

- [ ] Medir resumen con 4.000 productos y varias ubicaciones.
- [ ] Verificar aislamiento de Caja y anulaciones.
- [ ] Ejecutar `npm run check` y `npm run test:web`.
