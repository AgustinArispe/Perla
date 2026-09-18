# Contratos internos propuestos

Todos los métodos devuelven `Promise<Result<T>>`; errores por código legible para
UI: VALIDATION, NOT_FOUND, INACTIVE, REVISION_CONFLICT, INSUFFICIENT_STOCK,
IDEMPOTENCY_CONFLICT, DB_BUSY, DISK_FULL, BACKUP_INVALID, SCHEMA_TOO_NEW.
Result = `{ok:true,value:T}` | `{ok:false,error:{code,message,retryable}}`.
Sin filesystem, SQL, rutas arbitrarias o canales IPC libres desde renderer.

```typescript
type Id = string;
type MoneyCents = number; // integer seguro; rangos validados
type QuantityBase = number; // unidades o gramos, según saleUnit
type SaleUnit = 'UNIT' | 'KG';
type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'OTHER';
type Discount = {type:'NONE'} | {type:'PERCENT';basisPoints:number}
  | {type:'FIXED';amountCents:MoneyCents};
type SaleLineInput = {lineId:Id;productId:Id;quantityBase:QuantityBase;
  expectedProductRevision:number;expectedPriceCents:MoneyCents};
type PaymentInput = {method:PaymentMethod;amountCents:MoneyCents;
  tenderedCents?:MoneyCents};
type CheckoutInput = {checkoutKey:Id;lines:SaleLineInput[];discount:Discount;
  payments:PaymentInput[];negativeStockOverride?:{reason:string}};
type DateRange = {fromDate:string;toDate:string}; // YYYY-MM-DD inclusivo
type PageInput = {limit:number;cursor?:string}; // limit máximo 100
```

Contrato `window.bocha` propuesto:

| Método | Entrada | Salida |
|---|---|---|
| system.health | sin entrada | versión app, schema, estado worker |
| products.findByBarcode | barcode:string | Product o NOT_FOUND |
| products.search | query:string, activeOnly:boolean, PageInput | página ProductSummary |
| products.save | ProductInput, expectedRevision?:number | Product |
| products.setActive | productId, active, expectedRevision | Product |
| products.previewImport | file elegido en main | filas validadas, errores, previewToken |
| products.applyImport | previewToken, operationKey | ImportResult |
| stock.opening | productId, countedBase, operationKey, reason | StockBalance |
| stock.get | productId | StockBalance, incluyendo UNKNOWN/DISABLED |
| stock.search | query, filter, includeInactive, PageInput | página StockBalance |
| stock.operation | operationKey | resultado original guardado o null |
| stock.record | productId, deltaBase, kind, reason, operationKey, expectedRevision | StockBalance |
| stock.count | productId, countedBase, reason, operationKey, expectedRevision | StockBalance |
| stock.listLow | PageInput | balances inicializados bajos, unidad y mínimo |
| stock.movements | productId, DateRange, PageInput | movimientos paginados |
| checkout.saveDraft | draft, expectedRevision | Draft |
| checkout.getDraft | sin entrada | Draft o vacío |
| sales.complete | CheckoutInput | SaleDetail |
| sales.findByCheckoutKey | checkoutKey | SaleDetail o NOT_FOUND |
| sales.list | DateRange, status, PageInput | página SaleSummary |
| sales.detail | saleId | SaleDetail |
| sales.void | saleId, reason, operationKey | SaleDetail |
| dashboard.monthly | month:YYYY-MM | MonthlyReport |
| backups.create | destination elegido en main | BackupResult |
| backups.inspectRestore | archivo elegido en main | previewToken, fecha, schema |
| backups.restore | previewToken, confirm:true | RestoreResult y reinicio controlado |

ProductInput: sku, barcode nullable, name, category nullable, saleUnit, priceCents,
active, trackStock, minStockBase. Cantidad actual nunca se edita vía products.save.
StockBalance: productId, quantityBase, initialized, unit, minStockBase, revision.
Las mutaciones de Stock también exigen `expectedProductRevision` y
`expectedRevision` (cero antes del primer balance). `quantityBase` es null si no
se contó o el control está desactivado. Incluye nombre, SKU, barcode, active,
trackStock, productRevision y state para la interfaz. `stock.record` sólo expone
RECEIPT/WASTE; para saldo negativo exige `allowNegative:true` y motivo.
Los movimientos se filtran por fecha comercial argentina y se paginan por secuencia.
La importación exige `confirmStockCounts:true` cuando incluye conteos iniciales.
SaleDetail: timestamps, status, snapshots de líneas y totales, pagos y vuelto,
eventos y motivo de anulación. MonthlyReport: rango, totals, paymentAmounts,
paymentSaleCounts, dailyTotals, topByRevenue, topByUnits, topByKg, cancellations,
previousComparison, currentLowStock y reglas visibles.

La especificación de cada método se completa en la spec responsable; estos tipos
son documentación de diseño, no una API ya implementada. IDs UUID internos;
número de venta correlativo visible independiente del UUID para uso en caja.

## Reporte mensual implementado

`dashboard.monthly(month)` retorna `Result<MonthlyReport>`; requiere OWNER. Definición exacta en `src/shared/reports.ts`: period, totals, comparison, payments, cardCents, daily, rankings y lowStock. LowStock siempre representa existencias actuales. Los importes enteros se validan como seguros antes de salir del worker.
