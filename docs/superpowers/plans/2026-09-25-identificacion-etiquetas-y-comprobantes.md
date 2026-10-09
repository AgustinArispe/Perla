# Identificación, Etiquetas y Comprobantes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir códigos internos escaneables, etiquetas registradas y comprobantes no fiscales imprimibles sin afectar la atomicidad de la venta.

**Architecture:** El núcleo de catálogo administra códigos de fabricante e internos en una migración transaccional. Etiquetas y comprobantes son registros inmutables que se crean después de identificar un producto o al cerrar una venta, respectivamente; la UI imprime una instantánea HTML y luego registra el resultado de impresión.

**Tech Stack:** TypeScript, Zod, SQLite/better-sqlite3, Fastify, React, Vitest y Playwright.

**Spec:** `docs/superpowers/specs/2026-09-25-identificacion-y-etiquetas-design.md`, `docs/superpowers/specs/2026-09-25-comprobantes-no-fiscales-design.md`

## Global Constraints

- No sustituir ni generar GTIN oficial de fabricante; el código automático es exclusivamente interno.
- El EAN-13 interno usa prefijo `200` y dígito verificador correcto.
- Las ventas se guardan antes de crear o imprimir comprobantes.
- Todo comprobante visible lleva `COMPROBANTE DE VENTA — NO FISCAL`.
- La impresión inicial usa el navegador; no agregar dependencias de hardware ni integración ARCA.

---

### Task 1: Dominio de código interno

**Files:**
- Create: `src/domain/barcode.ts`
- Test: `tests/unit/barcode.test.ts`

**Interfaces:**
- Produces: `ean13CheckDigit(payload: string): string`, `createInternalEan13(sequence: number): string`, `isValidEan13(value: string): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
it('genera un EAN-13 interno con prefijo 200 y dígito verificador válido', () => {
  expect(createInternalEan13(42)).toBe('2000000000428');
  expect(isValidEan13('2000000000428')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/barcode.test.ts`

Expected: FAIL because `src/domain/barcode.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function ean13CheckDigit(payload: string): string { /* GS1 weighted sum */ }
export function createInternalEan13(sequence: number): string {
  const payload = `200${String(sequence).padStart(9, '0')}`;
  return payload + ean13CheckDigit(payload);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/barcode.test.ts`

Expected: PASS.

### Task 2: Persistir códigos internos y etiquetas

**Files:**
- Create: `src/worker/db/migrations/009_product_identification.sql`
- Modify: `src/worker/db/migrations.ts`
- Modify: `src/shared/catalog.ts`
- Modify: `src/worker/products/repository.ts`
- Test: `tests/integration/catalog-identification.test.ts`

**Interfaces:**
- Produces: `Product.internalBarcode`, `CatalogRepository.proposeInternalBarcode()`, `CatalogRepository.labels()`.

- [ ] **Step 1: Write the failing integration test**

```ts
it('genera un código interno único y una etiqueta pendiente al crear un producto sin código de fábrica', () => {
  const product = repo.save({ ...input, barcode: null, generateInternalBarcode: true });
  expect(product.internalBarcode).toMatch(/^200\d{10}$/);
  expect(repo.findByBarcode(product.internalBarcode!)).toMatchObject({ id: product.id });
  expect(repo.labels({ status: 'PENDING' }).items).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/catalog-identification.test.ts`

Expected: FAIL because the schema and repository API are absent.

- [ ] **Step 3: Implement migration and transactional repository support**

Add `internal_barcode`, a sequence table and immutable `product_labels`; reserve the sequence and create the label inside the same immediate transaction as product insertion. Reject values duplicated across factory and internal code columns.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/integration/catalog-identification.test.ts`

Expected: PASS.

### Task 3: Exponer identificación y etiquetas por API

**Files:**
- Modify: `src/shared/contracts.ts`
- Modify: `src/shared/requests.ts`
- Modify: `src/domain/permissions.ts`
- Modify: `src/worker/application.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/renderer/web-client.ts`
- Modify: `src/server/app.ts`
- Test: `tests/integration/web-api.test.ts`

**Interfaces:**
- Produces: `products.proposeInternalBarcode`, `products.labels`, `products.createLabel`, `products.markLabelPrinted`.

- [ ] **Step 1: Write the failing permission test**

```ts
it('deniega a vendedor la creación y gestión de etiquetas', () => {
  expect(hasPermission('SELLER', 'products.createLabel')).toBe(false);
  expect(hasPermission('SUPERVISOR', 'products.createLabel')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/permissions.test.ts`

Expected: FAIL because the new permission is absent.

- [ ] **Step 3: Implement validated operations and routes**

Register exact Zod schemas, authorize operations, expose desktop/web clients and add Fastify routes following the existing product API conventions.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/permissions.test.ts tests/integration/web-api.test.ts`

Expected: PASS.

### Task 4: Alta de producto y gestión de etiquetas

**Files:**
- Modify: `src/renderer/features/products/ProductForm.tsx`
- Modify: `src/renderer/features/products/ProductList.tsx`
- Create: `src/renderer/features/products/LabelsPage.tsx`
- Modify: `src/renderer/App.tsx`
- Test: `tests/web-e2e/modules.spec.ts`

- [ ] **Step 1: Write the failing UI test**

```ts
await page.getByRole('button', { name: 'Generar código interno' }).click();
await expect(page.getByLabel('Código interno')).toHaveValue(/^200\d{10}$/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test --config playwright.web.config.ts tests/web-e2e/modules.spec.ts`

Expected: FAIL because the button and field are absent.

- [ ] **Step 3: Implement product identification controls and label list**

Use explicit labels, no manual code required; list pending labels with a printable A4 layout and a `Marcar impresa` action.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test --config playwright.web.config.ts tests/web-e2e/modules.spec.ts`

Expected: PASS.

### Task 5: Persistir perfiles y comprobantes no fiscales

**Files:**
- Create: `src/worker/db/migrations/010_receipts.sql`
- Modify: `src/worker/db/migrations.ts`
- Create: `src/shared/receipts.ts`
- Create: `src/worker/receipts/service.ts`
- Modify: `src/worker/sales/service.ts`
- Test: `tests/integration/receipts.test.ts`

**Interfaces:**
- Produces: `ReceiptService.createForSale`, `ReceiptService.list`, `ReceiptService.markPrinted`.

- [ ] **Step 1: Write the failing integration test**

```ts
it('crea una emisión pendiente sin impedir que la venta se complete', () => {
  const sale = sales.complete(checkout);
  const receipt = receipts.createForSale({ saleId: sale.id, format: 'THERMAL_80' }, actor);
  expect(receipt.status).toBe('PENDING');
  expect(JSON.parse(receipt.snapshotJson).title).toBe('COMPROBANTE DE VENTA — NO FISCAL');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/receipts.test.ts`

Expected: FAIL because receipt service does not exist.

- [ ] **Step 3: Implement immutable receipt records and profiles**

Snapshot the completed sale detail, not product rows. Add profile CRUD and create a pending receipt only after successful sale completion in the existing immediate transaction.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/integration/receipts.test.ts`

Expected: PASS.

### Task 6: Exponer e imprimir comprobantes

**Files:**
- Modify: `src/shared/contracts.ts`
- Modify: `src/shared/requests.ts`
- Modify: `src/domain/permissions.ts`
- Modify: `src/worker/application.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/renderer/web-client.ts`
- Modify: `src/server/app.ts`
- Create: `src/renderer/features/receipts/ReceiptPrint.tsx`
- Create: `src/renderer/features/receipts/ReceiptQueue.tsx`
- Modify: `src/renderer/features/checkout/Checkout.tsx`
- Modify: `src/renderer/features/settings/SettingsPage.tsx`
- Test: `tests/web-e2e/modules.spec.ts`

- [ ] **Step 1: Write the failing receipt rendering test**

```ts
await expect(page.getByText('COMPROBANTE DE VENTA — NO FISCAL')).toBeVisible();
await expect(page.getByText('Venta N.º 1')).toBeVisible();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test --config playwright.web.config.ts tests/web-e2e/modules.spec.ts`

Expected: FAIL because no receipt view exists.

- [ ] **Step 3: Implement printing UI and operational screens**

Render the stored snapshot in a print-only layout for 58 mm, 80 mm and A4. Use `window.print()` only after receipt creation; on return, let the operator mark the job as printed. Include printer profile controls in Settings for owner only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test --config playwright.web.config.ts tests/web-e2e/modules.spec.ts`

Expected: PASS.

### Task 7: Full verification

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/backend-web.md`

- [ ] **Step 1: Document behavior and limits**

Document that labels are internal and receipts are non-fiscal, plus the future local print-bridge boundary.

- [ ] **Step 2: Run complete verification**

Run: `npm run check && npm run test:web`

Expected: all commands exit 0.
