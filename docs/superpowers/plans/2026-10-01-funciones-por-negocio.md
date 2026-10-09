# Funciones por negocio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que jefe y administrador activen o pausen capacidades entregadas de Perla Negra sin romper ventas, históricos, permisos o caja.

**Architecture:** Un catálogo de capacidades define nombre, descripción, dependencia y operaciones protegidas. La base conserva el estado y revisión por negocio; el backend aplica el estado antes de ejecutar operaciones, incluso desde URLs directas. React consulta el estado efectivo para mostrar únicamente herramientas disponibles y ofrece un panel simple de Funciones dentro de Configuración.

**Tech Stack:** TypeScript strict, SQLite/better-sqlite3, Fastify, React 19, TanStack Query, Vitest y Playwright.

**Spec:** [014-business-modules/spec.md](../../../specs/014-business-modules/spec.md)

## Global Constraints

- El núcleo de acceso, catálogo mínimo, ventas/pagos, histórico, caja, auditoría y backups no lleva interruptor.
- Dinero usa centavos enteros; cantidades usan unidades enteras o gramos enteros.
- Las ventas confirmadas y sus datos históricos no se reescriben al cambiar funciones.
- Sólo jefe o administrador modifica funciones; cada operación verifica función y permiso en backend.
- Funciones no entregadas no aparecen como opciones activables.
- El primer formulario muestra datos mínimos y las acciones mantienen etiquetas claras y foco accesible.
- Stock desactivado no descuenta mercadería; al reactivarlo cada producto con seguimiento requiere un conteo actual antes de volver a mostrar una existencia válida.

---

## File Structure

- `src/shared/features.ts`: contratos de estado, claves y cambios de funciones.
- `src/domain/features.ts`: catálogo disponible, dependencias, operación protegida y validación de selección.
- `src/worker/db/migrations/013_business_features.sql`: estado durable y migración inicial que conserva todo activo.
- `src/worker/features/service.ts`: lectura, previsualización, cambio atómico, transición de stock y auditoría.
- `src/worker/application.ts`: puerta de autorización de capacidades y consulta de estado efectivo para ventas.
- `src/worker/sales/service.ts`: no registra movimientos de inventario mientras Stock esté apagado.
- `src/shared/requests.ts`, `src/shared/operations.ts`, `src/domain/permissions.ts`, `src/server/app.ts`: contratos, permisos y rutas HTTP.
- `src/renderer/features/settings/FeaturesPanel.tsx`: tarjetas de funciones, revisión de impacto y guardado.
- `src/renderer/App.tsx`, `src/renderer/web-client.ts`: navegación y cliente según estado efectivo.
- `tests/integration/business-features.test.ts`: persistencia, permisos, cambios atómicos y ventas sin stock.
- `tests/web-e2e/modules.spec.ts`: visibilidad de módulos y pantalla de configuración en navegador.

## Task 1: Contratos y catálogo de capacidades

**Files:**
- Create: `src/shared/features.ts`
- Create: `src/domain/features.ts`
- Test: `tests/unit/features.test.ts`

**Interfaces:**
- Produces `FeatureKey`, `FeatureState`, `FeatureDefinition`, `FeatureStatus`, `FeatureChangeInput` y `featureForOperation(operation)`.
- Consumes la clave de operación existente para mapear `stock.*`, `dashboard.monthly`, `receipts.*` y `products.*Label*`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import { availableFeatures, featureForOperation, validateFeatureSelection } from '../../src/domain/features';

test('only delivered optional features are visible and protected operations map to one feature', () => {
  expect(availableFeatures.map((feature) => feature.key)).toEqual([
    'STOCK_CONTROL',
    'MONTHLY_DASHBOARD',
    'RECEIPTS',
    'PRODUCT_LABELS',
  ]);
  expect(featureForOperation('stock.search')).toBe('STOCK_CONTROL');
  expect(featureForOperation('sales.complete')).toBeNull();
  expect(validateFeatureSelection({ STOCK_CONTROL: true })).toEqual({ STOCK_CONTROL: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/features.test.ts`

Expected: FAIL because `src/domain/features.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const availableFeatures = [
  { key: 'STOCK_CONTROL', name: 'Control de stock', description: 'Existencias, conteos y alertas de reposición.' },
  { key: 'MONTHLY_DASHBOARD', name: 'Resumen mensual', description: 'Ventas y comparativos del negocio.' },
  { key: 'RECEIPTS', name: 'Comprobantes', description: 'Comprobantes internos de las ventas.' },
  { key: 'PRODUCT_LABELS', name: 'Etiquetas', description: 'Etiquetas internas para productos.' },
] as const;

export function featureForOperation(operation: string): FeatureKey | null { /* prefijos explícitos */ }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/features.test.ts`

Expected: PASS.

## Task 2: Estado durable y servicio atómico

**Files:**
- Create: `src/worker/db/migrations/013_business_features.sql`
- Modify: `src/worker/db/migrations.ts`
- Create: `src/worker/features/service.ts`
- Test: `tests/integration/business-features.test.ts`

**Interfaces:**
- Consumes `FeatureChangeInput` and `availableFeatures` from Task 1.
- Produces `FeatureService.status()`, `FeatureService.change(input, actor)` and `FeatureService.assertOperation(operation)`.

- [ ] **Step 1: Write the failing test**

```ts
test('owner changes dashboard and receipts together using the current revision', () => {
  const before = fixture.features.status();
  const after = fixture.features.change({
    expectedRevision: before.revision,
    enabled: { STOCK_CONTROL: true, MONTHLY_DASHBOARD: false, RECEIPTS: false, PRODUCT_LABELS: true },
  }, fixture.owner);
  expect(after.enabled.MONTHLY_DASHBOARD).toBe(false);
  expect(after.enabled.RECEIPTS).toBe(false);
  expect(after.revision).toBe(before.revision + 1);
});

test('stale change leaves every feature unchanged', () => {
  const before = fixture.features.status();
  expect(() => fixture.features.change({ expectedRevision: before.revision - 1, enabled: before.enabled }, fixture.owner)).toThrow('La configuración cambió');
  expect(fixture.features.status()).toEqual(before);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/business-features.test.ts`

Expected: FAIL because feature migration/service do not exist.

- [ ] **Step 3: Write minimal implementation**

```sql
CREATE TABLE business_features (
  feature_key TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  revision INTEGER NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

Use one immediate SQLite transaction: read expected revision, update every available key, write audit event `settings.features.save`, then return status. Seed all currently delivered functions as enabled so existing installations retain behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/integration/business-features.test.ts`

Expected: PASS for durable state, audit and stale-write behavior.

## Task 3: Stock transition and execution gates

**Files:**
- Modify: `src/worker/features/service.ts`
- Modify: `src/worker/application.ts`
- Modify: `src/worker/sales/service.ts`
- Modify: `src/shared/requests.ts`
- Modify: `src/shared/operations.ts`
- Modify: `src/domain/permissions.ts`
- Modify: `src/server/app.ts`
- Test: `tests/integration/business-features.test.ts`

**Interfaces:**
- Consumes `FeatureService.assertOperation(operation)` and `FeatureService.isEnabled('STOCK_CONTROL')`.
- Produces `GET /api/v1/features`, `GET /api/v1/settings/features` and `PUT /api/v1/settings/features`.

- [ ] **Step 1: Write the failing test**

```ts
test('a disabled dashboard rejects its direct endpoint while sales remain available', async () => {
  await fixture.ownerDisable('MONTHLY_DASHBOARD');
  expect(await fixture.request('dashboard.monthly', { month: '2026-10' }, fixture.owner)).toMatchObject({
    ok: false,
    error: { code: 'FORBIDDEN' },
  });
  expect(await fixture.completeSale()).toMatchObject({ ok: true });
});

test('disabling stock preserves movements but sales stop changing quantities until recount', () => {
  fixture.disable('STOCK_CONTROL');
  fixture.completeSale();
  expect(fixture.balance(productId).quantityBase).toBe(10);
  fixture.enable('STOCK_CONTROL');
  expect(fixture.balance(productId).initialized).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/business-features.test.ts`

Expected: FAIL because disabled features are still accepted and sales still move stock.

- [ ] **Step 3: Write minimal implementation**

```ts
const feature = featureForOperation(operation);
if (feature && !this.features.isEnabled(feature))
  throw new DomainError('FORBIDDEN', 'Esta función está desactivada para el negocio.');
```

On stock disable, set `stock_initialized=0` for tracked products inside the same change transaction and retain ledger rows. On reenable, leave these products uninitialized until existing count/opening flows establish a current balance. `SalesService.complete` reads the effective stock flag inside its transaction and skips ledger writes only while it is false.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/integration/business-features.test.ts tests/integration/sale-atomicity.test.ts tests/integration/stock-ledger.test.ts`

Expected: PASS; existing sale/stock protections remain green.

## Task 4: Configuración y navegación adaptativa

**Files:**
- Create: `src/renderer/features/settings/FeaturesPanel.tsx`
- Modify: `src/renderer/features/settings/SettingsPage.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/web-client.ts`
- Modify: `src/renderer/styles/perla.css`
- Test: `tests/web-e2e/modules.spec.ts`

**Interfaces:**
- Consumes `FeatureStatus` from `GET /api/v1/features` and owner-only `GET/PUT /api/v1/settings/features`.
- Produces compact feature cards with accessible switch controls and a confirmation dialog that uses `expectedRevision`.

- [ ] **Step 1: Write the failing browser test**

```ts
test('owner can pause dashboard and the menu no longer offers it', async ({ page }) => {
  await loginAsOwner(page);
  await page.getByRole('button', { name: 'Configuración' }).click();
  await page.getByRole('button', { name: 'Funciones del negocio' }).click();
  await page.getByRole('switch', { name: 'Resumen mensual' }).click();
  await page.getByRole('button', { name: 'Aplicar cambios' }).click();
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Resumen mensual' })).toHaveCount(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:web -- --grep "owner can pause dashboard"`

Expected: FAIL because the panel and controls do not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
<section className="settings-features">
  <header><h2>Funciones del negocio</h2><p>Elegí las herramientas que usás todos los días.</p></header>
  {features.map((feature) => <FeatureCard key={feature.key} feature={feature} />)}
</section>
```

Only owner/admin sees edit controls. All roles receive effective flags for navigation. If a screen becomes unavailable after a refresh, App navigates to Caja and preserves its existing draft. Update cached feature status after save; show one review dialog only when the selection changed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:web -- --grep "owner can pause dashboard"`

Expected: PASS and no horizontal overflow at 390 px.

## Task 5: Full verification and operational documentation

**Files:**
- Modify: `specs/014-business-modules/tasks.md`
- Modify: `docs/roadmap-modular.md`
- Test: relevant unit, integration and web test suites

**Interfaces:**
- Consumes the behavior delivered by Tasks 1–4.
- Produces accurate task status and operator guidance for stock pause/reactivation.

- [ ] **Step 1: Add failing coverage for non-owner and stale configuration**

```ts
test('supervisor cannot change functions', async () => {
  const result = await fixture.httpAsSupervisor('PUT', '/api/v1/settings/features', validChange);
  expect(result.statusCode).toBe(403);
});
```

- [ ] **Step 2: Run focused tests to verify failure before completion work**

Run: `npx vitest run tests/integration/business-features.test.ts`

Expected: FAIL if authorization is not enforced by the real HTTP route.

- [ ] **Step 3: Complete missing boundary behavior and documentation**

Document that pausing stock retains historical movements and that reactivation requires a count. Mark only completed tasks in the Spec Kit task list. Do not claim availability for future modules.

- [ ] **Step 4: Run verification**

Run: `npm run typecheck && npm run lint && npm test && npm run test:web`

Expected: each command exits 0. If the full web suite requires a manual service already occupying its port, stop it safely or use the project test server; do not omit it.

## Self-review

- Spec coverage: Tasks 1–5 cover persisted configuration, permissions, atomic changes, direct endpoint guards, historical preservation, stock transition, responsive configuration and future-module exclusion. Future purchases, costs, lots, promotions, notifications, accounts and locations are intentionally outside this first increment and remain roadmap specs.
- Placeholder scan: no TODO/TBD or unspecified implementation steps.
- Type consistency: `FeatureKey`, `FeatureStatus`, `FeatureChangeInput`, `FeatureService`, `featureForOperation` and routes retain the same names throughout.
