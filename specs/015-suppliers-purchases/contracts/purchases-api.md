# Contract: Proveedores y compras API

All routes use the existing same-origin session, CSRF protection and `{ok,value|error}` envelope. Seller receives `403` for every route below. Supplier, draft, confirmation, cost and void mutations require `SUPPLIERS_PURCHASES` enabled. Historical list/detail/export routes remain available to authorized owner/admin users from Configuración when the feature is disabled.

## Suppliers

- `GET /api/v1/suppliers?query=&status=ACTIVE&limit=30&cursor=` → `SupplierPage`
- `GET /api/v1/suppliers/:id` → `Supplier`
- `POST /api/v1/suppliers` with `SupplierSaveInput` → `Supplier`
- `POST /api/v1/suppliers/active` with `{supplierId,active,expectedRevision}` → `Supplier`

`SupplierSaveInput` requires `name`; optional values are nullable strings. An update requires `id` and `expectedRevision` together.

## Purchase draft

- `GET /api/v1/purchases/draft` → `PurchaseDraftRecord | null`
- `PUT /api/v1/purchases/draft` with `{body,expectedRevision}` → `PurchaseDraftRecord`
- `POST /api/v1/purchases/draft/cancel` with `{expectedRevision}` → `null`

Draft body:

```json
{
  "receiptKey": "uuid",
  "supplierId": "uuid-or-null",
  "businessDate": "2026-10-02",
  "lines": [
    {
      "lineId": "uuid",
      "productId": "uuid",
      "quantityBase": 2500,
      "unitCostCents": 890000,
      "expectedProductRevision": 4
    }
  ]
}
```

## Confirmation and history

- `POST /api/v1/purchases` with `PurchaseReceiveInput` → `PurchaseDetail`
- `GET /api/v1/purchases/by-key/:receiptKey` → `PurchaseDetail | null`
- `GET /api/v1/purchases?fromDate=&toDate=&supplierId=&status=&limit=&cursor=` → `PurchasePage`
- `GET /api/v1/purchases/:id` → `PurchaseDetail`
- `GET /api/v1/purchases/:id/void-preview` → `PurchaseVoidPreview`
- `POST /api/v1/purchases/void` with `{purchaseId,operationKey,reason}` → `PurchaseDetail`

Confirmation uses the draft body plus `expectedDraftRevision`. The server re-reads supplier, products, stock state and feature revision inside the transaction. A repeated `receiptKey` with identical canonical payload returns the existing detail; different payload returns `IDEMPOTENCY_CONFLICT`.

## Cost lookup

- `GET /api/v1/products/:id/last-cost` → `{productId,unitCostCents,purchaseId,receivedAt} | null`

Only supervisor, owner and administrator may read cost.

## Errors

- `VALIDATION`: malformed quantities/costs, duplicate product, invalid dates.
- `INACTIVE`: supplier or product was deactivated.
- `REVISION_CONFLICT`: draft, supplier, product, feature or stock changed.
- `IDEMPOTENCY_CONFLICT`: operation key reused with another payload.
- `INSUFFICIENT_STOCK`: safe purchase reversal would make stock negative.
- `FORBIDDEN`: role or feature state does not authorize the action.
- `DB_BUSY`, `DISK_FULL`: no partial receipt; client queries by key before retry.
