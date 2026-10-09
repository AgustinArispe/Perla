# Quickstart validation: Proveedores y compras

## Prerequisites

- Node.js 24 and npm 11.
- Dependencies installed with `npm ci`.
- Test database isolated from production data.

## Static and automated checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build:web
npm run test:web
```

Expected: all commands exit with code 0. Tests must include SQLite transaction failure, idempotent retry, role denial, feature off, backup restore and the mobile purchase flow.

## End-to-end scenario

1. Sign in as owner and enable `Proveedores y compras`.
2. Create supplier `Puerto Fresco` with only its name.
3. Start a purchase and scan one unit product twice.
4. Add a kilogram product with `2500 g` and a cost per kilogram.
5. Reload the browser and verify the draft is restored.
6. Confirm with Stock active and verify one purchase, two historical lines and the corresponding stock increases.
7. Repeat the exact request and verify the original purchase is returned.
8. Reuse the receipt key with another cost and verify `IDEMPOTENCY_CONFLICT`.
9. Change supplier and product names; verify the purchase detail remains unchanged.
10. Preview and execute a safe void; verify linked reason and exact stock reversal.

## Feature-off scenario

1. Disable Stock and confirm another purchase.
2. Verify cost history is present and no stock movement was created.
3. Disable Purchases and verify its ordinary navigation disappears.
4. Open its records from Configuración > Funciones and verify read-only access.

## Responsive and keyboard scenario

- Repeat create, scan, edit quantity, save draft and confirm at 360×800 and 1366×768.
- Verify no page-level horizontal scroll, touch targets at least 44 px and visible focus.
- Verify scanner input regains focus after adding a product and dialogs restore focus to their trigger.

## Recovery scenario

1. Create an encrypted backup after at least one received and one voided purchase.
2. Restore it in the recovery procedure.
3. Verify suppliers, purchase snapshots, cost history, stock links, feature state and audit events.

## Resultado verificado — 2026-10-02

- `npm run typecheck`: correcto.
- `npm run lint`: correcto, sin advertencias.
- `npm test`: 43 archivos y 153 pruebas aprobadas.
- `npm run build:web`: correcto.
- `npm run build:api`: correcto.
- `npm run test:web`: 3 recorridos reales aprobados en Chromium, incluida compra, recuperación del borrador, vista móvil y anulación.
- Fixture de volumen: búsqueda sobre 4.000 productos y primera página sobre 100.000 compras, sin cargar el histórico completo en memoria.
- Recuperación: copia cifrada restaura proveedor, compra, evento y estado de la función.
