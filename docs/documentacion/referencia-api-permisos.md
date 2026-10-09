# Referencia de rutas, permisos, filtros y contratos

Referencia generada desde el código del repositorio. Corte documental: 9 de octubre de 2026. Esquema 29. No contiene datos del comercio.

[Volver al índice](README.md)

## Interpretación

La tabla de permisos describe el conjunto base. El servicio también controla propiedad del registro, rol administrativo especial, revisión, estado de caja y módulos habilitados. Los adaptadores HTTP tienen operaciones internas que delegan en estos permisos: no se debe autorizar una URL solamente comparando su nombre con esta matriz.

## Matriz base de permisos

| Operación | Vendedor | Supervisor | Jefe | Administrador |
|---|---|---|---|---|
| `audit.list` | — | Sí | Sí | Sí |
| `auth.changePassword` | Sí | Sí | Sí | Sí |
| `auth.logout` | Sí | Sí | Sí | Sí |
| `auth.status` | Sí | Sí | Sí | Sí |
| `auth.unlockUser` | — | — | Sí | Sí |
| `backup.create` | — | — | Sí | Sí |
| `backup.restore` | — | — | Sí | Sí |
| `cash.close` | Sí | Sí | Sí | Sí |
| `cash.current` | Sí | Sí | Sí | Sí |
| `cash.movement` | Sí | Sí | Sí | Sí |
| `cash.open` | Sí | Sí | Sí | Sí |
| `checkout.cancelDraft` | Sí | Sí | Sí | Sí |
| `checkout.getDraft` | Sí | Sí | Sí | Sí |
| `checkout.saveDraft` | Sí | Sí | Sí | Sí |
| `control.execute` | — | Sí | Sí | Sí |
| `costs.get` | — | Sí | Sí | Sí |
| `costs.setReference` | — | Sí | Sí | Sí |
| `customerAccounts.collect` | — | Sí | Sí | Sí |
| `customerAccounts.detail` | — | Sí | Sí | Sí |
| `customers.get` | Sí | Sí | Sí | Sí |
| `customers.save` | Sí | Sí | Sí | Sí |
| `customers.search` | Sí | Sí | Sí | Sí |
| `customers.setActive` | — | Sí | Sí | Sí |
| `customers.setCredit` | — | — | Sí | Sí |
| `dashboard.compare` | — | — | Sí | Sí |
| `dashboard.monthly` | — | — | Sí | Sí |
| `exports.products` | — | — | Sí | Sí |
| `exports.purchases` | — | — | Sí | Sí |
| `exports.sale-items` | — | — | Sí | Sí |
| `exports.sales` | — | — | Sí | Sí |
| `exports.shifts` | — | — | Sí | Sí |
| `exports.stock` | — | — | Sí | Sí |
| `locations.assignTerminal` | — | — | Sí | Sí |
| `locations.inventory` | — | Sí | Sí | Sí |
| `locations.list` | — | Sí | Sí | Sí |
| `locations.save` | — | — | Sí | Sí |
| `locations.summary` | — | — | Sí | Sí |
| `lots.enable` | — | Sí | Sí | Sí |
| `lots.reconcile` | — | Sí | Sí | Sí |
| `lots.setBlocked` | — | Sí | Sí | Sí |
| `lots.status` | — | Sí | Sí | Sí |
| `notifications.list` | — | Sí | Sí | Sí |
| `notifications.markRead` | — | Sí | Sí | Sí |
| `pricing.confirm` | — | — | Sí | Sí |
| `pricing.preview` | — | — | Sí | Sí |
| `products.applyImport` | — | Sí | Sí | Sí |
| `products.createLabel` | — | Sí | Sí | Sí |
| `products.findByBarcode` | Sí | Sí | Sí | Sí |
| `products.get` | Sí | Sí | Sí | Sí |
| `products.labels` | — | Sí | Sí | Sí |
| `products.markLabelPrinted` | — | Sí | Sí | Sí |
| `products.previewImport` | — | Sí | Sí | Sí |
| `products.proposeInternalBarcode` | — | Sí | Sí | Sí |
| `products.save` | — | Sí | Sí | Sí |
| `products.saveBrand` | — | Sí | Sí | Sí |
| `products.saveCategory` | — | Sí | Sí | Sí |
| `products.search` | Sí | Sí | Sí | Sí |
| `products.setActive` | — | Sí | Sí | Sí |
| `products.taxonomy` | — | Sí | Sí | Sí |
| `promotions.get` | — | — | Sí | Sí |
| `promotions.list` | — | — | Sí | Sí |
| `promotions.save` | — | — | Sí | Sí |
| `purchases.cancelDraft` | — | Sí | Sí | Sí |
| `purchases.detail` | — | Sí | Sí | Sí |
| `purchases.findByReceiptKey` | — | Sí | Sí | Sí |
| `purchases.getDraft` | — | Sí | Sí | Sí |
| `purchases.lastCost` | — | Sí | Sí | Sí |
| `purchases.list` | — | Sí | Sí | Sí |
| `purchases.previewVoid` | — | Sí | Sí | Sí |
| `purchases.receive` | — | Sí | Sí | Sí |
| `purchases.saveDraft` | — | Sí | Sí | Sí |
| `purchases.void` | — | Sí | Sí | Sí |
| `receipts.create` | Sí | Sí | Sí | Sí |
| `receipts.list` | — | Sí | Sí | Sí |
| `receipts.markPrinted` | Sí | Sí | Sí | Sí |
| `sales.complete` | Sí | Sí | Sí | Sí |
| `sales.detail` | Sí | Sí | Sí | Sí |
| `sales.findByCheckoutKey` | Sí | Sí | Sí | Sí |
| `sales.list` | — | Sí | Sí | Sí |
| `sales.previewReturn` | — | Sí | Sí | Sí |
| `sales.previewVoid` | — | Sí | Sí | Sí |
| `sales.quote` | Sí | Sí | Sí | Sí |
| `sales.return` | — | Sí | Sí | Sí |
| `sales.returns` | — | Sí | Sí | Sí |
| `sales.void` | — | Sí | Sí | Sí |
| `settings.features.get` | Sí | Sí | Sí | Sí |
| `settings.features.save` | — | — | Sí | Sí |
| `settings.get` | Sí | Sí | Sí | Sí |
| `settings.save` | — | — | Sí | Sí |
| `shifts.details` | Sí | Sí | Sí | Sí |
| `shifts.list` | — | Sí | Sí | Sí |
| `stock.count` | — | Sí | Sí | Sí |
| `stock.get` | — | Sí | Sí | Sí |
| `stock.listLow` | — | Sí | Sí | Sí |
| `stock.movements` | — | Sí | Sí | Sí |
| `stock.opening` | — | Sí | Sí | Sí |
| `stock.operation` | — | Sí | Sí | Sí |
| `stock.record` | — | Sí | Sí | Sí |
| `stock.search` | — | Sí | Sí | Sí |
| `supplierAccounts.detail` | — | Sí | Sí | Sí |
| `supplierAccounts.pay` | — | Sí | Sí | Sí |
| `suppliers.get` | — | Sí | Sí | Sí |
| `suppliers.save` | — | Sí | Sí | Sí |
| `suppliers.search` | — | Sí | Sí | Sí |
| `suppliers.setActive` | — | Sí | Sí | Sí |
| `terminals.active` | Sí | Sí | Sí | Sí |
| `terminals.list` | — | — | Sí | Sí |
| `terminals.save` | — | — | Sí | Sí |
| `transfers.cancel` | — | Sí | Sí | Sí |
| `transfers.detail` | — | Sí | Sí | Sí |
| `transfers.dispatch` | — | Sí | Sí | Sí |
| `transfers.list` | — | Sí | Sí | Sí |
| `transfers.receive` | — | Sí | Sí | Sí |
| `users.list` | — | — | Sí | Sí |
| `users.save` | — | — | Sí | Sí |

## Rutas HTTP (125)

Fuente: [src/server/app.ts](../../src/server/app.ts). Incluye rutas literales y las dos familias registradas mediante bucles. Los archivos estáticos se sirven por separado.

| Método | Ruta | Operación ejecutada |
|---|---|---|
| GET | `/api/v1/audit` | `audit.list` |
| POST | `/api/v1/auth/login` | `auth.login` |
| POST | `/api/v1/auth/logout` | `auth.logout` |
| POST | `/api/v1/auth/password` | `auth.changePassword` |
| GET | `/api/v1/auth/session` | `auth.status` |
| POST | `/api/v1/auth/terminal` | `auth.terminal` |
| POST | `/api/v1/auth/unlock-user` | `auth.unlockUser` |
| GET | `/api/v1/backups` | `backups.list` |
| POST | `/api/v1/backups` | `backups.create` |
| GET | `/api/v1/backups/:id/download` | `backups.download` |
| POST | `/api/v1/backups/:id/preview` | `backups.inspect` |
| POST | `/api/v1/backups/restore` | `backups.restore` |
| POST | `/api/v1/backups/upload` | `backups.upload` |
| GET | `/api/v1/barcodes/:barcode` | `products.findByBarcode` |
| POST | `/api/v1/cash/close` | `cash.close` |
| GET | `/api/v1/cash/current` | `cash.current` |
| GET | `/api/v1/cash/detail` | `shifts.details` |
| POST | `/api/v1/cash/movement` | `cash.movement` |
| POST | `/api/v1/cash/open` | `cash.open` |
| GET | `/api/v1/cash/shifts` | `shifts.list` |
| POST | `/api/v1/checkout/calculate-weight` | `checkout.calculateWeight` |
| POST | `/api/v1/checkout/cancel` | `checkout.cancelDraft` |
| GET | `/api/v1/checkout/draft` | `checkout.getDraft` |
| PUT | `/api/v1/checkout/draft` | `checkout.saveDraft` |
| POST | `/api/v1/control` | `control.execute` |
| POST | `/api/v1/control/export` | `control.export` |
| POST | `/api/v1/customer-collections` | `customerAccounts.collect` |
| GET | `/api/v1/customers` | `customers.search` |
| POST | `/api/v1/customers` | `customers.save` |
| GET | `/api/v1/customers/:id` | `customers.get` |
| GET | `/api/v1/customers/:id/account` | `customerAccounts.detail` |
| POST | `/api/v1/customers/active` | `customers.setActive` |
| POST | `/api/v1/customers/credit` | `customers.setCredit` |
| GET | `/api/v1/dashboard/comparison` | `dashboard.compare` |
| GET | `/api/v1/dashboard/monthly` | `dashboard.monthly` |
| POST | `/api/v1/exports/excel` | `exports.excel` |
| GET | `/api/v1/exports/products` | `exports.products` |
| GET | `/api/v1/exports/purchases` | `exports.purchases` |
| GET | `/api/v1/exports/sale-items` | `exports.sale-items` |
| GET | `/api/v1/exports/sales` | `exports.sales` |
| GET | `/api/v1/exports/shifts` | `exports.shifts` |
| GET | `/api/v1/exports/stock` | `exports.stock` |
| GET | `/api/v1/health` | `internal.health` |
| GET | `/api/v1/locations` | `locations.list` |
| POST | `/api/v1/locations` | `locations.save` |
| GET | `/api/v1/locations/inventory` | `locations.inventory` |
| GET | `/api/v1/locations/summary` | `locations.summary` |
| POST | `/api/v1/locations/terminal` | `locations.assignTerminal` |
| POST | `/api/v1/lots/:id/status` | `lots.setBlocked` |
| GET | `/api/v1/notifications` | `notifications.list` |
| POST | `/api/v1/notifications/read` | `notifications.markRead` |
| POST | `/api/v1/pricing/confirm` | `pricing.confirm` |
| POST | `/api/v1/pricing/preview` | `pricing.preview` |
| GET | `/api/v1/products` | `products.search` |
| POST | `/api/v1/products` | `products.save` |
| GET | `/api/v1/products/:id` | `products.get` |
| GET | `/api/v1/products/:id/cost` | `costs.get` |
| PUT | `/api/v1/products/:id/cost` | `costs.setReference` |
| GET | `/api/v1/products/:id/last-cost` | `purchases.lastCost` |
| GET | `/api/v1/products/:id/lots` | `lots.status` |
| POST | `/api/v1/products/:id/lots/enable` | `lots.enable` |
| POST | `/api/v1/products/:id/lots/reconcile` | `lots.reconcile` |
| POST | `/api/v1/products/active` | `products.setActive` |
| POST | `/api/v1/products/brands` | `products.saveBrand` |
| POST | `/api/v1/products/categories` | `products.saveCategory` |
| POST | `/api/v1/products/import/apply` | `products.applyImport` |
| POST | `/api/v1/products/import/preview` | `internal.importPreview` |
| POST | `/api/v1/products/internal-barcode` | `products.proposeInternalBarcode` |
| GET | `/api/v1/products/labels` | `products.labels` |
| POST | `/api/v1/products/labels` | `products.createLabel` |
| POST | `/api/v1/products/labels/printed` | `products.markLabelPrinted` |
| GET | `/api/v1/products/taxonomy` | `products.taxonomy` |
| GET | `/api/v1/promotions` | `promotions.list` |
| POST | `/api/v1/promotions` | `promotions.save` |
| GET | `/api/v1/promotions/:id` | `promotions.get` |
| GET | `/api/v1/purchases` | `purchases.list` |
| POST | `/api/v1/purchases` | `purchases.receive` |
| GET | `/api/v1/purchases/:id` | `purchases.detail` |
| GET | `/api/v1/purchases/:id/void-preview` | `purchases.previewVoid` |
| GET | `/api/v1/purchases/by-key/:key` | `purchases.findByReceiptKey` |
| GET | `/api/v1/purchases/draft` | `purchases.getDraft` |
| PUT | `/api/v1/purchases/draft` | `purchases.saveDraft` |
| POST | `/api/v1/purchases/draft/cancel` | `purchases.cancelDraft` |
| POST | `/api/v1/purchases/void` | `purchases.void` |
| GET | `/api/v1/receipts` | `receipts.list` |
| POST | `/api/v1/receipts` | `receipts.create` |
| POST | `/api/v1/receipts/printed` | `receipts.markPrinted` |
| GET | `/api/v1/sales` | `sales.list` |
| POST | `/api/v1/sales` | `sales.complete` |
| GET | `/api/v1/sales/:id` | `sales.detail` |
| GET | `/api/v1/sales/:id/return-preview` | `sales.previewReturn` |
| GET | `/api/v1/sales/:id/returns` | `sales.returns` |
| GET | `/api/v1/sales/:id/void-preview` | `sales.previewVoid` |
| GET | `/api/v1/sales/by-key/:key` | `sales.findByCheckoutKey` |
| POST | `/api/v1/sales/quote` | `sales.quote` |
| POST | `/api/v1/sales/returns` | `sales.return` |
| POST | `/api/v1/sales/void` | `sales.void` |
| GET | `/api/v1/settings` | `settings.get` |
| PUT | `/api/v1/settings` | `settings.save` |
| GET | `/api/v1/settings/features` | `settings.features.get` |
| PUT | `/api/v1/settings/features` | `settings.features.save` |
| GET | `/api/v1/stock` | `stock.search` |
| GET | `/api/v1/stock/:id` | `stock.get` |
| GET | `/api/v1/stock/:id/movements` | `stock.movements` |
| POST | `/api/v1/stock/count` | `stock.count` |
| GET | `/api/v1/stock/low` | `stock.listLow` |
| POST | `/api/v1/stock/movement` | `stock.record` |
| POST | `/api/v1/stock/opening` | `stock.opening` |
| GET | `/api/v1/stock/operations/:key` | `stock.operation` |
| POST | `/api/v1/supplier-payments` | `supplierAccounts.pay` |
| GET | `/api/v1/suppliers` | `suppliers.search` |
| POST | `/api/v1/suppliers` | `suppliers.save` |
| GET | `/api/v1/suppliers/:id` | `suppliers.get` |
| GET | `/api/v1/suppliers/:id/account` | `supplierAccounts.detail` |
| POST | `/api/v1/suppliers/active` | `suppliers.setActive` |
| GET | `/api/v1/terminals` | `terminals.list` |
| POST | `/api/v1/terminals` | `terminals.save` |
| GET | `/api/v1/terminals/active` | `terminals.active` |
| GET | `/api/v1/transfers` | `transfers.list` |
| POST | `/api/v1/transfers` | `transfers.dispatch` |
| GET | `/api/v1/transfers/:id` | `transfers.detail` |
| POST | `/api/v1/transfers/cancel` | `transfers.cancel` |
| POST | `/api/v1/transfers/receive` | `transfers.receive` |
| GET | `/api/v1/users` | `users.list` |
| POST | `/api/v1/users` | `users.save` |

## Exportación XLSX: datasets y filtros

Dentro de un filtro múltiple se aplica OR; entre filtros, AND. No se admite combinar simultáneamente la variante simple y múltiple de una misma clave.

| Dataset | Título | Filtros simples admitidos | Variantes múltiples |
|---|---|---|---|
| `users` | Usuarios | `query`, `status`, `role` | `statuses`, `roles` |
| `products` | Productos | `query`, `status`, `categoryId`, `brandId` | `statuses`, `categoryIds`, `brandIds` |
| `stock` | Stock | `query`, `filter`, `categoryId`, `brandId`, `includeInactive` | `stockFilters`, `categoryIds`, `brandIds` |
| `customers` | Clientes | `query`, `activeOnly` | `statuses` |
| `suppliers` | Proveedores | `query`, `status` | `statuses` |
| `promotions` | Promociones | `query`, `view` | `views` |
| `sales` | Ventas | `fromDate`, `toDate`, `status` | `statuses` |
| `purchases` | Compras | `fromDate`, `toDate`, `status` | `statuses` |
| `shifts` | Turnos | `fromDate`, `toDate`, `status`, `terminalId` | `statuses`, `terminalIds` |
| `audit` | Actividad | `fromDate`, `toDate`, `operation` | `operations` |
| `inventory` | Existencias por ubicación | `locationId`, `query` | `locationIds` |
| `transfers` | Traslados | `status` | `statuses` |
| `dashboard` | Resumen mensual | `month` | — |
| `payments` | Medios de pago | `month` | — |
| `ranking` | Productos más vendidos | `month`, `rank` | — |
| `lowStock` | Reposición | `month` | — |
| `profitability` | Margen bruto | `month` | — |
| `locations` | Ubicaciones | `month` | — |
| `comparison` | Comparación | `preset`, `from`, `to` | — |
| `customerAccount` | Cuenta del cliente | `customerId` | — |
| `supplierAccount` | Cuenta del proveedor | `supplierId` | — |
| `movements` | Movimientos de stock | `productId`, `fromDate`, `toDate` | — |
| `saleDetail` | Detalle de venta | `saleId` | — |
| `purchaseDetail` | Detalle de compra | `purchaseId` | — |

## Subacciones de Control

`POST /api/v1/control` recibe `{ area, action, input }`. La exportación usa `/api/v1/control/export` con las acciones de exportación admitidas. Inventario de nombres comparados explícitamente en cada servicio; sus esquemas y puertas de autorización permanecen en el archivo enlazado.

| Área | Acciones declaradas | Servicio |
|---|---|---|
| `workspace` | `applyView`, `deleteView`, `home`, `preference`, `savePreference`, `saveView`, `views` | [src/worker/control/workspace.ts](../../src/worker/control/workspace.ts) |
| `replenishment` | `calendar`, `cancel`, `confirm`, `create`, `detail`, `export`, `list`, `locations`, `receive`, `reschedule`, `saveCalendar`, `saveProductRule`, `suggest`, `suppliers` | [src/worker/control/replenishment.ts](../../src/worker/control/replenishment.ts) |
| `commercial` | `activity`, `export`, `exportActivity`, `exportWeekly`, `options`, `prices`, `review`, `rotation`, `settings`, `weekly.ensure`, `weekly.get`, `weekly.recalculate`, `weekly.versions` | [src/worker/control/commercial.ts](../../src/worker/control/commercial.ts) |
| `operations` | `agenda`, `agendaDate`, `agendaHistory`, `cashDifferences`, `cashReview`, `countApply`, `countGet`, `countLine`, `countSessions`, `countStart`, `expiries`, `export`, `metadata` | [src/worker/control/operations.ts](../../src/worker/control/operations.ts) |

## Contratos compartidos y esquemas Zod

Los nombres siguientes son exportaciones del código; la definición exacta enlazada conserva campos, restricciones y tipos compuestos. Las validaciones adicionales de servicio no se reducen a estos esquemas.

### src/shared/auth.ts

[src/shared/auth.ts](../../src/shared/auth.ts)

`RoleSchema`, `Role`, `PasswordSchema`, `AdminPasswordSchema`, `BootstrapSchema`, `LoginSchema`, `UserSaveSchema`, `ChangePasswordSchema`, `UnlockUserSchema`, `BootstrapInput`, `LoginInput`, `UserSaveInput`, `ChangePasswordInput`, `UnlockUserInput`, `User`, `AuthStatus`, `UserSchema`.

### src/shared/catalog.ts

[src/shared/catalog.ts](../../src/shared/catalog.ts)

`IdSchema`, `ProductInputSchema`, `ProductSaveSchema`, `ProductInput`, `ProductSaveInput`, `Product`, `LabelStatusSchema`, `ProductLabel`, `ProductLabelPage`, `ProductLabelListSchema`, `ProductLabelCreateSchema`, `ProductLabelPrintSchema`, `TaxonomyItemSchema`, `TaxonomyItem`, `ProductTaxonomy`, `TaxonomySaveSchema`, `TaxonomySaveInput`, `ProductSearchSchema`, `ProductSearchInput`, `SetActiveSchema`, `SetActiveInput`, `ProductPage`, `ImportPreview`, `ApplyImportSchema`, `ApplyImportInput`, `ImportResult`, `DraftBodySchema`, `SaveDraftSchema`, `SaveDraftInput`, `DraftRecord`.

### src/shared/commercial-control.ts

[src/shared/commercial-control.ts](../../src/shared/commercial-control.ts)

`CommercialFilterSchema`, `CommercialFilter`, `PriceReviewSchema`, `CommercialSettingsSchema`, `WeekRequestSchema`, `WeekRecalculateSchema`, `CommercialItem`, `CommercialPage`, `WeeklySummary`, `ControlSheet`, `ControlExport`.

### src/shared/contracts.ts

[src/shared/contracts.ts](../../src/shared/contracts.ts)

`SystemStatusSchema`, `SystemStatus`, `AppErrorSchema`, `Result`, `SystemHealthResultSchema`, `BochaApi`, `IPC`.

### src/shared/control.ts

[src/shared/control.ts](../../src/shared/control.ts)

`ControlRequestSchema`, `ControlRequest`, `SavedViewModule`, `SavedViewSchema`, `SavedView`, `ControlPending`, `ControlHome`.

### src/shared/costs.ts

[src/shared/costs.ts](../../src/shared/costs.ts)

`CostReferenceSchema`, `CostReferenceInput`, `ProductCost`.

### src/shared/customers.ts

[src/shared/customers.ts](../../src/shared/customers.ts)

`CustomerSaveSchema`, `CustomerSearchSchema`, `CustomerCreditSchema`, `CustomerSetActiveSchema`, `CustomerCollectionMethodSchema`, `CustomerCollectionInputSchema`, `CustomerSaveInput`, `CustomerCollectionInput`, `Customer`, `CustomerPage`, `CustomerCollection`, `CustomerAccount`.

### src/shared/errors.ts

[src/shared/errors.ts](../../src/shared/errors.ts)

`AppError`, `DomainError`, `normalizeError`, `failure`.

### src/shared/excel.ts

[src/shared/excel.ts](../../src/shared/excel.ts)

`excelTitles`, `ExcelDataset`, `excelFilterKeys`, `excelMultipleKeys`, `ExcelFiltersSchema`, `ExcelFilters`, `ExcelRequestSchema`.

### src/shared/features.ts

[src/shared/features.ts](../../src/shared/features.ts)

`FeatureKeySchema`, `FeatureKey`, `FeatureStateSchema`, `FeatureState`, `FeatureFlagsSchema`, `FeatureFlags`, `FeatureStatusSchema`, `FeatureStatus`, `FeatureSelectionSchema`, `FeatureSelection`, `FeatureChangeInputSchema`, `FeatureChangeInput`.

### src/shared/frontend-operations.ts

[src/shared/frontend-operations.ts](../../src/shared/frontend-operations.ts)

`Terminal`, `RegisterShift`, `RegisterMovement`, `ShiftDetail`, `AuditEvent`, `OperationPage`.

### src/shared/location-reports.ts

[src/shared/location-reports.ts](../../src/shared/location-reports.ts)

`LocationSummaryRequestSchema`, `LocationSummaryRequest`, `LocationSummaryItem`, `LocationSummary`.

### src/shared/locations.ts

[src/shared/locations.ts](../../src/shared/locations.ts)

`LocationSaveSchema`, `LocationInventorySchema`, `LocationInventory`, `TerminalLocationSchema`, `TransferDispatchSchema`, `TransferReceiveSchema`, `TransferCancelSchema`, `TransferListSchema`, `LocationSaveInput`, `TransferDispatchInput`, `TransferReceiveInput`, `TransferCancelInput`, `Location`, `TransferItem`, `StockTransfer`.

### src/shared/lots.ts

[src/shared/lots.ts](../../src/shared/lots.ts)

`LotReconcileSchema`, `LotSetBlockedSchema`, `InventoryLot`, `LotProductStatus`, `LotReconcileInput`, `LotSetBlockedInput`.

### src/shared/notifications.ts

[src/shared/notifications.ts](../../src/shared/notifications.ts)

`NotificationDestinationSchema`, `NotificationMarkReadSchema`, `NotificationMarkRead`, `BusinessNotification`, `NotificationInbox`.

### src/shared/operational-control.ts

[src/shared/operational-control.ts](../../src/shared/operational-control.ts)

`ControlPageSchema`, `CountLot`, `CountLine`, `CountSession`, `ControlPage`, `AgendaRow`, `CashDifference`, `ExpiryRow`, `ControlMetadata`.

### src/shared/operations.ts

[src/shared/operations.ts](../../src/shared/operations.ts)

`OperationSchemas`, `OperationName`.

### src/shared/pricing.ts

[src/shared/pricing.ts](../../src/shared/pricing.ts)

`PriceChangeSchema`, `PricePreviewSchema`, `PriceConfirmSchema`, `PricePreviewInput`, `PriceConfirmInput`, `PricePreview`, `PriceChangeBatch`.

### src/shared/promotions.ts

[src/shared/promotions.ts](../../src/shared/promotions.ts)

`PromotionSaveSchema`, `PromotionSaveInput`, `Promotion`.

### src/shared/purchases.ts

[src/shared/purchases.ts](../../src/shared/purchases.ts)

`SupplierSaveSchema`, `SupplierSetActiveSchema`, `SupplierSearchSchema`, `PurchaseDraftLineSchema`, `PurchaseDraftBodySchema`, `PurchaseDraftSaveSchema`, `PurchaseReceiveSchema`, `PurchaseSearchSchema`, `PurchaseVoidSchema`, `SupplierSaveInput`, `SupplierSetActiveInput`, `SupplierSearchInput`, `PurchaseDraftBody`, `PurchaseDraftSaveInput`, `PurchaseReceiveInput`, `PurchaseSearchInput`, `PurchaseVoidInput`, `Supplier`, `SupplierPage`, `PurchaseDraftRecord`, `PurchaseItem`, `PurchaseEvent`, `PurchaseDetail`, `PurchaseSummary`, `PurchasePage`, `PurchaseVoidPreview`.

### src/shared/receipts.ts

[src/shared/receipts.ts](../../src/shared/receipts.ts)

`ReceiptFormatSchema`, `ReceiptStatusSchema`, `ReceiptCreateSchema`, `ReceiptListSchema`, `ReceiptMarkPrintedSchema`, `ReceiptCreateInput`, `ReceiptSnapshot`, `SaleReceipt`, `ReceiptPage`.

### src/shared/replenishment.ts

[src/shared/replenishment.ts](../../src/shared/replenishment.ts)

`SuggestionQuerySchema`, `OrderCreateSchema`, `OrderChangeSchema`, `OrderConfirmSchema`, `OrderCancelSchema`, `OrderRescheduleSchema`, `OrderReceiveSchema`, `OrderListSchema`, `CalendarSchema`, `ProductRuleSchema`, `ReplenishmentLine`, `ReplenishmentOrder`, `Suggestion`, `SuggestionPage`, `ReplenishmentCalendar`.

### src/shared/reports.ts

[src/shared/reports.ts](../../src/shared/reports.ts)

`MonthSchema`, `MonthlyRequestSchema`, `ComparisonRequestSchema`, `ComparisonRequest`, `ReportTotals`, `RankedProduct`, `ProfitabilityBreakdown`, `MonthlyReport`, `PeriodComparison`.

### src/shared/requests.ts

[src/shared/requests.ts](../../src/shared/requests.ts)

`RequestSchemas`, `Operation`, `validateRequest`, `isTrustedSender`.

### src/shared/returns.ts

[src/shared/returns.ts](../../src/shared/returns.ts)

`ReturnItemSchema`, `ReturnConfirmSchema`, `ReturnConfirmInput`, `ReturnPreview`, `SaleReturnDetail`.

### src/shared/sales.ts

[src/shared/sales.ts](../../src/shared/sales.ts)

`PaymentSchema`, `PaymentInput`, `CheckoutSchema`, `CheckoutInput`, `SaleQuoteSchema`, `SaleQuote`, `VoidSchema`, `VoidInput`, `SalesSearchSchema`, `SalesSearchInput`, `SaleSummary`, `SaleDetail`, `SalePage`, `VoidPreview`.

### src/shared/stock.ts

[src/shared/stock.ts](../../src/shared/stock.ts)

`StockFilterSchema`, `StockState`, `StockCountSchema`, `StockRecordSchema`, `StockSearchSchema`, `StockMovementsSchema`, `StockCountInput`, `StockRecordInput`, `StockSearchInput`, `StockMovementsInput`, `StockBalance`, `StockMovement`, `StockPage`, `MovementPage`.

### src/shared/supplier-accounts.ts

[src/shared/supplier-accounts.ts](../../src/shared/supplier-accounts.ts)

`SupplierPaymentMethodSchema`, `SupplierPaymentInputSchema`, `SupplierPaymentMethod`, `SupplierPaymentInput`, `SupplierPayable`, `SupplierPayment`, `SupplierCredit`, `SupplierAccount`.

### src/shared/web.ts

[src/shared/web.ts](../../src/shared/web.ts)

`SelectTerminalSchema`, `WeightCalculatorSchema`, `BackupIdSchema`, `RestoreBackupSchema`, `WebSession`, `WebLogin`, `WebSaleDetail`.

