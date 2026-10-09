# Inventario de código, dependencias, comandos y pruebas

Referencia generada desde el código del repositorio. Corte documental: 9 de octubre de 2026. Esquema 29. No contiene datos del comercio.

[Volver al índice](README.md)

## Identificación

Paquete: `perla-negra-pos`. Producto: Perla Negra POS. Versión: 0.1.0. Node: `>=24 <25`. npm: `>=11 <12`.

## Comandos declarados

| Script npm | Comando |
|---|---|
| `setup` | `npm ci --ignore-scripts && npm run postinstall` |
| `postinstall` | `node scripts/install-native.mjs` |
| `dev` | `electron-vite dev` |
| `dev:web` | `vite --config vite.web.config.ts` |
| `build` | `npm run typecheck && electron-vite build` |
| `build:web` | `vite build --config vite.web.config.ts` |
| `start` | `electron-vite preview` |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint . --max-warnings=0` |
| `format` | `prettier --write src tests *.ts *.json *.yaml *.yml scripts/*.{mjs,ts} .github/workflows/*.yml` |
| `format:check` | `prettier --check src tests *.ts *.json *.yaml *.yml scripts/*.{mjs,ts} .github/workflows/*.yml` |
| `test` | `node scripts/build-api.mjs && node scripts/run-tests.mjs` |
| `test:watch` | `node scripts/run-tests.mjs --watch` |
| `test:e2e` | `npm run build && playwright test` |
| `test:packaged` | `node scripts/run-packaged-tests.mjs` |
| `check` | `npm run typecheck && npm run lint && npm test && npm run build && npm run build:web && npm run build:api` |
| `native:check` | `node scripts/install-native.mjs` |
| `pack:win` | `npm run build && electron-builder --win --x64 --dir` |
| `dist:win` | `npm run build && electron-builder --win nsis --x64` |
| `docker:up` | `docker compose up --build -d web` |
| `docker:down` | `docker compose down` |
| `docker:check` | `docker compose --profile tools run --rm check` |
| `build:api` | `node scripts/build-api.mjs` |
| `start:api` | `node dist/api/index.cjs` |
| `demo:market:seed` | `node scripts/seed-market-history.mjs` |
| `demo:market:start` | `node scripts/start-five-month-demo.mjs` |
| `admin:api` | `node dist/api/cli.cjs` |
| `test:web` | `npm run build:web && npm run build:api && playwright test --config playwright.web.config.ts` |

## dependencies

| Dependencia | Versión declarada |
|---|---|
| @fastify/cookie | `11.1.2` |
| @fastify/helmet | `13.1.1` |
| @fastify/rate-limit | `11.2.0` |
| @fontsource/cinzel | `5.2.8` |
| @fontsource/manrope | `5.2.8` |
| @tanstack/react-query | `5.103.1` |
| better-sqlite3 | `13.0.3` |
| csv-parse | `7.0.2` |
| exceljs | `4.4.0` |
| fastify | `5.12.5` |
| react | `19.3.0` |
| react-dom | `19.3.0` |
| zod | `4.6.5` |
| zustand | `5.0.15` |

## devDependencies

| Dependencia | Versión declarada |
|---|---|
| @eslint/js | `10.0.1` |
| @playwright/test | `1.63.0` |
| @swc/core | `1.16.2` |
| @types/better-sqlite3 | `9.6.0` |
| @types/node | `24.13.5` |
| @types/react | `19.3.0` |
| @types/react-dom | `19.3.0` |
| @vitejs/plugin-react | `5.2.0` |
| electron | `44.4.1` |
| electron-builder | `26.15.3` |
| electron-vite | `5.0.0` |
| esbuild | `0.28.2` |
| eslint | `10.10.0` |
| eslint-plugin-react-hooks | `7.1.1` |
| globals | `17.12.0` |
| prettier | `3.9.7` |
| tsx | `4.23.13` |
| typescript | `6.0.3` |
| typescript-eslint | `8.70.0` |
| vite | `7.3.6` |
| vitest | `4.1.11` |

## overrides

| Dependencia | Versión declarada |
|---|---|
| exceljs | `{"uuid":"11.1.1"}` |

## Archivos de implementación (214)

Inventario de TS, TSX, CSS, SQL y HTML. Se excluyen artefactos compilados, imágenes y tipografías.

- [src/domain/barcode.ts](../../src/domain/barcode.ts) — 22 líneas.
- [src/domain/costs.ts](../../src/domain/costs.ts) — 74 líneas.
- [src/domain/features.ts](../../src/domain/features.ts) — 127 líneas.
- [src/domain/inventory.ts](../../src/domain/inventory.ts) — 44 líneas.
- [src/domain/payment.ts](../../src/domain/payment.ts) — 28 líneas.
- [src/domain/permissions.ts](../../src/domain/permissions.ts) — 144 líneas.
- [src/domain/promotions.ts](../../src/domain/promotions.ts) — 136 líneas.
- [src/domain/purchases.ts](../../src/domain/purchases.ts) — 21 líneas.
- [src/domain/returns.ts](../../src/domain/returns.ts) — 34 líneas.
- [src/domain/sale.ts](../../src/domain/sale.ts) — 59 líneas.
- [src/domain/scan-queue.ts](../../src/domain/scan-queue.ts) — 32 líneas.
- [src/domain/supplier-accounts.ts](../../src/domain/supplier-accounts.ts) — 35 líneas.
- [src/domain/values.ts](../../src/domain/values.ts) — 53 líneas.
- [src/domain/weight.ts](../../src/domain/weight.ts) — 13 líneas.
- [src/main/bootstrap.ts](../../src/main/bootstrap.ts) — 78 líneas.
- [src/main/ipc.ts](../../src/main/ipc.ts) — 71 líneas.
- [src/main/preload.ts](../../src/main/preload.ts) — 158 líneas.
- [src/main/worker-client.ts](../../src/main/worker-client.ts) — 253 líneas.
- [src/renderer/App.tsx](../../src/renderer/App.tsx) — 789 líneas.
- [src/renderer/api.ts](../../src/renderer/api.ts) — 16 líneas.
- [src/renderer/components/Dialog.tsx](../../src/renderer/components/Dialog.tsx) — 68 líneas.
- [src/renderer/components/EntityActivity.tsx](../../src/renderer/components/EntityActivity.tsx) — 26 líneas.
- [src/renderer/components/EntityPicker.tsx](../../src/renderer/components/EntityPicker.tsx) — 176 líneas.
- [src/renderer/components/ExportButton.tsx](../../src/renderer/components/ExportButton.tsx) — 583 líneas.
- [src/renderer/components/Icon.tsx](../../src/renderer/components/Icon.tsx) — 71 líneas.
- [src/renderer/components/PerlaNegraLogo.tsx](../../src/renderer/components/PerlaNegraLogo.tsx) — 8 líneas.
- [src/renderer/components/SavedViews.tsx](../../src/renderer/components/SavedViews.tsx) — 173 líneas.
- [src/renderer/components/useRememberedState.ts](../../src/renderer/components/useRememberedState.ts) — 51 líneas.
- [src/renderer/development-crypto.ts](../../src/renderer/development-crypto.ts) — 12 líneas.
- [src/renderer/env.d.ts](../../src/renderer/env.d.ts) — 7 líneas.
- [src/renderer/features/audit/AuditPage.tsx](../../src/renderer/features/audit/AuditPage.tsx) — 171 líneas.
- [src/renderer/features/audit/operation-labels.ts](../../src/renderer/features/audit/operation-labels.ts) — 74 líneas.
- [src/renderer/features/auth/ChangePassword.tsx](../../src/renderer/features/auth/ChangePassword.tsx) — 80 líneas.
- [src/renderer/features/auth/Login.tsx](../../src/renderer/features/auth/Login.tsx) — 124 líneas.
- [src/renderer/features/auth/UserList.tsx](../../src/renderer/features/auth/UserList.tsx) — 352 líneas.
- [src/renderer/features/backups/BackupsPage.tsx](../../src/renderer/features/backups/BackupsPage.tsx) — 287 líneas.
- [src/renderer/features/checkout/Checkout.tsx](../../src/renderer/features/checkout/Checkout.tsx) — 701 líneas.
- [src/renderer/features/checkout/DiscountDialog.tsx](../../src/renderer/features/checkout/DiscountDialog.tsx) — 95 líneas.
- [src/renderer/features/checkout/PaymentDialog.tsx](../../src/renderer/features/checkout/PaymentDialog.tsx) — 497 líneas.
- [src/renderer/features/checkout/ProductSearch.tsx](../../src/renderer/features/checkout/ProductSearch.tsx) — 134 líneas.
- [src/renderer/features/checkout/WeightDialog.tsx](../../src/renderer/features/checkout/WeightDialog.tsx) — 106 líneas.
- [src/renderer/features/checkout/controller.ts](../../src/renderer/features/checkout/controller.ts) — 570 líneas.
- [src/renderer/features/checkout/draft-writer.ts](../../src/renderer/features/checkout/draft-writer.ts) — 85 líneas.
- [src/renderer/features/checkout/scanner-focus.ts](../../src/renderer/features/checkout/scanner-focus.ts) — 12 líneas.
- [src/renderer/features/control/AgendaPanel.tsx](../../src/renderer/features/control/AgendaPanel.tsx) — 324 líneas.
- [src/renderer/features/control/CommercialPanel.tsx](../../src/renderer/features/control/CommercialPanel.tsx) — 471 líneas.
- [src/renderer/features/control/ControlHome.tsx](../../src/renderer/features/control/ControlHome.tsx) — 168 líneas.
- [src/renderer/features/control/OperationsPanel.tsx](../../src/renderer/features/control/OperationsPanel.tsx) — 892 líneas.
- [src/renderer/features/control/ReplenishmentPanel.tsx](../../src/renderer/features/control/ReplenishmentPanel.tsx) — 1036 líneas.
- [src/renderer/features/control/StructuredActivityPanel.tsx](../../src/renderer/features/control/StructuredActivityPanel.tsx) — 281 líneas.
- [src/renderer/features/control/WeeklyPanel.tsx](../../src/renderer/features/control/WeeklyPanel.tsx) — 270 líneas.
- [src/renderer/features/control/client.ts](../../src/renderer/features/control/client.ts) — 26 líneas.
- [src/renderer/features/customers/CustomerPage.tsx](../../src/renderer/features/customers/CustomerPage.tsx) — 458 líneas.
- [src/renderer/features/dashboard/AnimatedValue.tsx](../../src/renderer/features/dashboard/AnimatedValue.tsx) — 35 líneas.
- [src/renderer/features/dashboard/DashboardPage.tsx](../../src/renderer/features/dashboard/DashboardPage.tsx) — 509 líneas.
- [src/renderer/features/dashboard/LocationSummary.tsx](../../src/renderer/features/dashboard/LocationSummary.tsx) — 61 líneas.
- [src/renderer/features/dashboard/LowStock.tsx](../../src/renderer/features/dashboard/LowStock.tsx) — 79 líneas.
- [src/renderer/features/dashboard/MonthlyReportPrint.tsx](../../src/renderer/features/dashboard/MonthlyReportPrint.tsx) — 228 líneas.
- [src/renderer/features/dashboard/PaymentBreakdown.tsx](../../src/renderer/features/dashboard/PaymentBreakdown.tsx) — 44 líneas.
- [src/renderer/features/dashboard/PeriodComparison.tsx](../../src/renderer/features/dashboard/PeriodComparison.tsx) — 150 líneas.
- [src/renderer/features/dashboard/TopProducts.tsx](../../src/renderer/features/dashboard/TopProducts.tsx) — 51 líneas.
- [src/renderer/features/help/HelpPage.tsx](../../src/renderer/features/help/HelpPage.tsx) — 352 líneas.
- [src/renderer/features/help/search.ts](../../src/renderer/features/help/search.ts) — 13 líneas.
- [src/renderer/features/history/ReturnDialog.tsx](../../src/renderer/features/history/ReturnDialog.tsx) — 208 líneas.
- [src/renderer/features/history/SaleDetail.tsx](../../src/renderer/features/history/SaleDetail.tsx) — 383 líneas.
- [src/renderer/features/history/SalesList.tsx](../../src/renderer/features/history/SalesList.tsx) — 184 líneas.
- [src/renderer/features/locations/LocationsPage.tsx](../../src/renderer/features/locations/LocationsPage.tsx) — 838 líneas.
- [src/renderer/features/locations/transfer-validation.ts](../../src/renderer/features/locations/transfer-validation.ts) — 5 líneas.
- [src/renderer/features/notifications/NotificationBell.tsx](../../src/renderer/features/notifications/NotificationBell.tsx) — 147 líneas.
- [src/renderer/features/products/ImportPreview.tsx](../../src/renderer/features/products/ImportPreview.tsx) — 180 líneas.
- [src/renderer/features/products/PriceBulkDialog.tsx](../../src/renderer/features/products/PriceBulkDialog.tsx) — 80 líneas.
- [src/renderer/features/products/ProductForm.tsx](../../src/renderer/features/products/ProductForm.tsx) — 308 líneas.
- [src/renderer/features/products/ProductList.tsx](../../src/renderer/features/products/ProductList.tsx) — 608 líneas.
- [src/renderer/features/products/TaxonomyManager.tsx](../../src/renderer/features/products/TaxonomyManager.tsx) — 218 líneas.
- [src/renderer/features/promotions/PromotionForm.tsx](../../src/renderer/features/promotions/PromotionForm.tsx) — 500 líneas.
- [src/renderer/features/promotions/PromotionPage.tsx](../../src/renderer/features/promotions/PromotionPage.tsx) — 223 líneas.
- [src/renderer/features/purchases/PurchaseDetail.tsx](../../src/renderer/features/purchases/PurchaseDetail.tsx) — 160 líneas.
- [src/renderer/features/purchases/PurchaseDraft.tsx](../../src/renderer/features/purchases/PurchaseDraft.tsx) — 609 líneas.
- [src/renderer/features/purchases/PurchaseHistory.tsx](../../src/renderer/features/purchases/PurchaseHistory.tsx) — 109 líneas.
- [src/renderer/features/purchases/PurchaseWorkspace.tsx](../../src/renderer/features/purchases/PurchaseWorkspace.tsx) — 64 líneas.
- [src/renderer/features/purchases/SupplierAccountDialog.tsx](../../src/renderer/features/purchases/SupplierAccountDialog.tsx) — 405 líneas.
- [src/renderer/features/purchases/SupplierForm.tsx](../../src/renderer/features/purchases/SupplierForm.tsx) — 99 líneas.
- [src/renderer/features/purchases/SupplierList.tsx](../../src/renderer/features/purchases/SupplierList.tsx) — 142 líneas.
- [src/renderer/features/purchases/controller.ts](../../src/renderer/features/purchases/controller.ts) — 52 líneas.
- [src/renderer/features/purchases/draft-writer.ts](../../src/renderer/features/purchases/draft-writer.ts) — 87 líneas.
- [src/renderer/features/purchases/pending.ts](../../src/renderer/features/purchases/pending.ts) — 39 líneas.
- [src/renderer/features/receipts/ReceiptPrint.tsx](../../src/renderer/features/receipts/ReceiptPrint.tsx) — 100 líneas.
- [src/renderer/features/receipts/ReceiptQueue.tsx](../../src/renderer/features/receipts/ReceiptQueue.tsx) — 59 líneas.
- [src/renderer/features/register/RegisterGate.tsx](../../src/renderer/features/register/RegisterGate.tsx) — 444 líneas.
- [src/renderer/features/register/ShiftHistory.tsx](../../src/renderer/features/register/ShiftHistory.tsx) — 329 líneas.
- [src/renderer/features/settings/FeaturesPanel.tsx](../../src/renderer/features/settings/FeaturesPanel.tsx) — 243 líneas.
- [src/renderer/features/settings/SettingsPage.tsx](../../src/renderer/features/settings/SettingsPage.tsx) — 525 líneas.
- [src/renderer/features/stock/LotManager.tsx](../../src/renderer/features/stock/LotManager.tsx) — 187 líneas.
- [src/renderer/features/stock/MovementForm.tsx](../../src/renderer/features/stock/MovementForm.tsx) — 225 líneas.
- [src/renderer/features/stock/MovementHistory.tsx](../../src/renderer/features/stock/MovementHistory.tsx) — 144 líneas.
- [src/renderer/features/stock/PendingMovement.tsx](../../src/renderer/features/stock/PendingMovement.tsx) — 97 líneas.
- [src/renderer/features/stock/StockList.tsx](../../src/renderer/features/stock/StockList.tsx) — 371 líneas.
- [src/renderer/features/stock/pending.ts](../../src/renderer/features/stock/pending.ts) — 49 líneas.
- [src/renderer/index.html](../../src/renderer/index.html) — 18 líneas.
- [src/renderer/main.tsx](../../src/renderer/main.tsx) — 25 líneas.
- [src/renderer/navigation.ts](../../src/renderer/navigation.ts) — 94 líneas.
- [src/renderer/styles/operational.css](../../src/renderer/styles/operational.css) — 1634 líneas.
- [src/renderer/styles/perla.css](../../src/renderer/styles/perla.css) — 3608 líneas.
- [src/renderer/styles/pulse.css](../../src/renderer/styles/pulse.css) — 1360 líneas.
- [src/renderer/styles/tokens.css](../../src/renderer/styles/tokens.css) — 3084 líneas.
- [src/renderer/validation-config.ts](../../src/renderer/validation-config.ts) — 5 líneas.
- [src/renderer/web-client.ts](../../src/renderer/web-client.ts) — 318 líneas.
- [src/server/app.ts](../../src/server/app.ts) — 413 líneas.
- [src/server/backups/service.ts](../../src/server/backups/service.ts) — 535 líneas.
- [src/server/cli.ts](../../src/server/cli.ts) — 180 líneas.
- [src/server/config.ts](../../src/server/config.ts) — 84 líneas.
- [src/server/control-export.ts](../../src/server/control-export.ts) — 41 líneas.
- [src/server/excel.ts](../../src/server/excel.ts) — 1009 líneas.
- [src/server/frontend.ts](../../src/server/frontend.ts) — 34 líneas.
- [src/server/index.ts](../../src/server/index.ts) — 43 líneas.
- [src/server/lease.ts](../../src/server/lease.ts) — 25 líneas.
- [src/server/rpc.ts](../../src/server/rpc.ts) — 101 líneas.
- [src/server/runtime.ts](../../src/server/runtime.ts) — 596 líneas.
- [src/server/worker.ts](../../src/server/worker.ts) — 37 líneas.
- [src/shared/auth.ts](../../src/shared/auth.ts) — 85 líneas.
- [src/shared/catalog.ts](../../src/shared/catalog.ts) — 176 líneas.
- [src/shared/commercial-control.ts](../../src/shared/commercial-control.ts) — 99 líneas.
- [src/shared/contracts.ts](../../src/shared/contracts.ts) — 332 líneas.
- [src/shared/control.ts](../../src/shared/control.ts) — 73 líneas.
- [src/shared/costs.ts](../../src/shared/costs.ts) — 22 líneas.
- [src/shared/customers.ts](../../src/shared/customers.ts) — 131 líneas.
- [src/shared/errors.ts](../../src/shared/errors.ts) — 66 líneas.
- [src/shared/excel.ts](../../src/shared/excel.ts) — 157 líneas.
- [src/shared/features.ts](../../src/shared/features.ts) — 70 líneas.
- [src/shared/frontend-operations.ts](../../src/shared/frontend-operations.ts) — 45 líneas.
- [src/shared/location-reports.ts](../../src/shared/location-reports.ts) — 35 líneas.
- [src/shared/locations.ts](../../src/shared/locations.ts) — 131 líneas.
- [src/shared/lots.ts](../../src/shared/lots.ts) — 47 líneas.
- [src/shared/notifications.ts](../../src/shared/notifications.ts) — 26 líneas.
- [src/shared/operational-control.ts](../../src/shared/operational-control.ts) — 84 líneas.
- [src/shared/operations.ts](../../src/shared/operations.ts) — 80 líneas.
- [src/shared/pricing.ts](../../src/shared/pricing.ts) — 29 líneas.
- [src/shared/promotions.ts](../../src/shared/promotions.ts) — 27 líneas.
- [src/shared/purchases.ts](../../src/shared/purchases.ts) — 204 líneas.
- [src/shared/receipts.ts](../../src/shared/receipts.ts) — 32 líneas.
- [src/shared/replenishment.ts](../../src/shared/replenishment.ts) — 157 líneas.
- [src/shared/reports.ts](../../src/shared/reports.ts) — 87 líneas.
- [src/shared/requests.ts](../../src/shared/requests.ts) — 205 líneas.
- [src/shared/returns.ts](../../src/shared/returns.ts) — 68 líneas.
- [src/shared/sales.ts](../../src/shared/sales.ts) — 117 líneas.
- [src/shared/stock.ts](../../src/shared/stock.ts) — 96 líneas.
- [src/shared/supplier-accounts.ts](../../src/shared/supplier-accounts.ts) — 85 líneas.
- [src/shared/web.ts](../../src/shared/web.ts) — 27 líneas.
- [src/worker/application.ts](../../src/worker/application.ts) — 592 líneas.
- [src/worker/auth/audit.ts](../../src/worker/auth/audit.ts) — 20 líneas.
- [src/worker/auth/password.ts](../../src/worker/auth/password.ts) — 21 líneas.
- [src/worker/auth/service.ts](../../src/worker/auth/service.ts) — 339 líneas.
- [src/worker/control/commercial.ts](../../src/worker/control/commercial.ts) — 781 líneas.
- [src/worker/control/operations.ts](../../src/worker/control/operations.ts) — 779 líneas.
- [src/worker/control/replenishment.ts](../../src/worker/control/replenishment.ts) — 732 líneas.
- [src/worker/control/service.ts](../../src/worker/control/service.ts) — 24 líneas.
- [src/worker/control/workspace.ts](../../src/worker/control/workspace.ts) — 295 líneas.
- [src/worker/costs/service.ts](../../src/worker/costs/service.ts) — 285 líneas.
- [src/worker/customers/service.ts](../../src/worker/customers/service.ts) — 454 líneas.
- [src/worker/db/connection.ts](../../src/worker/db/connection.ts) — 58 líneas.
- [src/worker/db/migrations.ts](../../src/worker/db/migrations.ts) — 128 líneas.
- [src/worker/db/migrations/002_products.sql](../../src/worker/db/migrations/002_products.sql) — 42 líneas.
- [src/worker/db/migrations/003_inventory.sql](../../src/worker/db/migrations/003_inventory.sql) — 25 líneas.
- [src/worker/db/migrations/004_sales.sql](../../src/worker/db/migrations/004_sales.sql) — 47 líneas.
- [src/worker/db/migrations/005_users.sql](../../src/worker/db/migrations/005_users.sql) — 22 líneas.
- [src/worker/db/migrations/006_web_operations.sql](../../src/worker/db/migrations/006_web_operations.sql) — 42 líneas.
- [src/worker/db/migrations/007_system_admin.sql](../../src/worker/db/migrations/007_system_admin.sql) — 2 líneas.
- [src/worker/db/migrations/008_product_taxonomy.sql](../../src/worker/db/migrations/008_product_taxonomy.sql) — 37 líneas.
- [src/worker/db/migrations/009_product_identification.sql](../../src/worker/db/migrations/009_product_identification.sql) — 39 líneas.
- [src/worker/db/migrations/010_receipts.sql](../../src/worker/db/migrations/010_receipts.sql) — 32 líneas.
- [src/worker/db/migrations/011_perla_brand.sql](../../src/worker/db/migrations/011_perla_brand.sql) — 6 líneas.
- [src/worker/db/migrations/012_perla_negra_brand.sql](../../src/worker/db/migrations/012_perla_negra_brand.sql) — 6 líneas.
- [src/worker/db/migrations/013_business_features.sql](../../src/worker/db/migrations/013_business_features.sql) — 14 líneas.
- [src/worker/db/migrations/014_suppliers_purchases.sql](../../src/worker/db/migrations/014_suppliers_purchases.sql) — 88 líneas.
- [src/worker/db/migrations/015_costs_profitability.sql](../../src/worker/db/migrations/015_costs_profitability.sql) — 43 líneas.
- [src/worker/db/migrations/016_sale_returns.sql](../../src/worker/db/migrations/016_sale_returns.sql) — 68 líneas.
- [src/worker/db/migrations/017_inventory_lots.sql](../../src/worker/db/migrations/017_inventory_lots.sql) — 68 líneas.
- [src/worker/db/migrations/018_prices_promotions.sql](../../src/worker/db/migrations/018_prices_promotions.sql) — 71 líneas.
- [src/worker/db/migrations/019_notifications_comparisons.sql](../../src/worker/db/migrations/019_notifications_comparisons.sql) — 12 líneas.
- [src/worker/db/migrations/020_supplier_accounts.sql](../../src/worker/db/migrations/020_supplier_accounts.sql) — 58 líneas.
- [src/worker/db/migrations/021_customers_credit.sql](../../src/worker/db/migrations/021_customers_credit.sql) — 73 líneas.
- [src/worker/db/migrations/022_locations_transfers.sql](../../src/worker/db/migrations/022_locations_transfers.sql) — 119 líneas.
- [src/worker/db/migrations/023_location_scale.sql](../../src/worker/db/migrations/023_location_scale.sql) — 4 líneas.
- [src/worker/db/migrations/024_control_workspace.sql](../../src/worker/db/migrations/024_control_workspace.sql) — 11 líneas.
- [src/worker/db/migrations/025_control_orders.sql](../../src/worker/db/migrations/025_control_orders.sql) — 32 líneas.
- [src/worker/db/migrations/026_control_commercial.sql](../../src/worker/db/migrations/026_control_commercial.sql) — 23 líneas.
- [src/worker/db/migrations/027_control_counts.sql](../../src/worker/db/migrations/027_control_counts.sql) — 25 líneas.
- [src/worker/db/migrations/028_control_agenda.sql](../../src/worker/db/migrations/028_control_agenda.sql) — 13 líneas.
- [src/worker/db/migrations/029_control_weekly.sql](../../src/worker/db/migrations/029_control_weekly.sql) — 16 líneas.
- [src/worker/drafts.ts](../../src/worker/drafts.ts) — 62 líneas.
- [src/worker/features/service.ts](../../src/worker/features/service.ts) — 195 líneas.
- [src/worker/index.ts](../../src/worker/index.ts) — 60 líneas.
- [src/worker/locations/service.ts](../../src/worker/locations/service.ts) — 758 líneas.
- [src/worker/lots/service.ts](../../src/worker/lots/service.ts) — 480 líneas.
- [src/worker/notifications/service.ts](../../src/worker/notifications/service.ts) — 149 líneas.
- [src/worker/operations/cash.ts](../../src/worker/operations/cash.ts) — 346 líneas.
- [src/worker/operations/export.ts](../../src/worker/operations/export.ts) — 59 líneas.
- [src/worker/operations/service.ts](../../src/worker/operations/service.ts) — 231 líneas.
- [src/worker/pricing/service.ts](../../src/worker/pricing/service.ts) — 81 líneas.
- [src/worker/products/import.ts](../../src/worker/products/import.ts) — 339 líneas.
- [src/worker/products/repository.ts](../../src/worker/products/repository.ts) — 586 líneas.
- [src/worker/promotions/service.ts](../../src/worker/promotions/service.ts) — 62 líneas.
- [src/worker/purchases/hash.ts](../../src/worker/purchases/hash.ts) — 17 líneas.
- [src/worker/purchases/repository.ts](../../src/worker/purchases/repository.ts) — 172 líneas.
- [src/worker/purchases/service.ts](../../src/worker/purchases/service.ts) — 613 líneas.
- [src/worker/receipts/service.ts](../../src/worker/receipts/service.ts) — 110 líneas.
- [src/worker/reports/month.ts](../../src/worker/reports/month.ts) — 25 líneas.
- [src/worker/reports/period.ts](../../src/worker/reports/period.ts) — 45 líneas.
- [src/worker/reports/queries.ts](../../src/worker/reports/queries.ts) — 243 líneas.
- [src/worker/returns/service.ts](../../src/worker/returns/service.ts) — 314 líneas.
- [src/worker/sales/service.ts](../../src/worker/sales/service.ts) — 533 líneas.
- [src/worker/stock/repository.ts](../../src/worker/stock/repository.ts) — 104 líneas.
- [src/worker/stock/service.ts](../../src/worker/stock/service.ts) — 394 líneas.
- [src/worker/supplier-accounts/service.ts](../../src/worker/supplier-accounts/service.ts) — 312 líneas.

## Archivos de pruebas (93)

Los títulos son declaraciones estáticas encontradas en el código. No representan un conteo de casos ejecutados: existen parametrizaciones, bucles y selecciones por proyecto. Este inventario no certifica aprobación de pruebas en la fecha de documentación.

### tests/e2e/desktop-startup.spec.ts

[tests/e2e/desktop-startup.spec.ts](../../tests/e2e/desktop-startup.spec.ts)

- abre el escritorio con SQLite en worker y renderer aislado

### tests/e2e/monthly-dashboard.spec.ts

[tests/e2e/monthly-dashboard.spec.ts](../../tests/e2e/monthly-dashboard.spec.ts)

- jefe consulta neto y pagos aplicados; supervisor y vendedor no pueden consultarlos

### tests/e2e/product-search.spec.ts

[tests/e2e/product-search.spec.ts](../../tests/e2e/product-search.spec.ts)

- crear, editar, buscar y desactivar con datos persistidos y teclado
- elegir CSV, revisar errores y aplicar una carga sin duplicarla

### tests/e2e/sales-backend.spec.ts

[tests/e2e/sales-backend.spec.ts](../../tests/e2e/sales-backend.spec.ts)

- backend IPC confirma, recupera tras reiniciar y anula una venta offline

### tests/e2e/sales-history.spec.ts

[tests/e2e/sales-history.spec.ts](../../tests/e2e/sales-history.spec.ts)

- Caja con scanner, peso, descuento y mixto conecta Histórico y stock

### tests/e2e/stock-count.spec.ts

[tests/e2e/stock-count.spec.ts](../../tests/e2e/stock-count.spec.ts)

- recupera un ingreso guardado sin confirmación después de reiniciar y no lo repite
- contar, ingresar, registrar merma y revisar movimientos desde Stock

### tests/e2e/users-roles.spec.ts

[tests/e2e/users-roles.spec.ts](../../tests/e2e/users-roles.spec.ts)

- jefe crea perfiles, vendedor sólo ve Caja y supervisor gestiona sin dashboard

### tests/integration/auth-roles.test.ts

[tests/integration/auth-roles.test.ts](../../tests/integration/auth-roles.test.ts)

- actualiza esquema 4 conservando stock y adopta borrador legacy para el primer jefe
- sesión vencida se rechaza y un fallo de auditoría revierte el cambio durable
- registro de intentos lleno falla cerrado y una cuenta inactiva no ingresa
- bootstrap único, hashes privados, login genérico, bloqueo y logout
- el bloqueo de login aumenta dentro de una ventana de quince minutos
- el jefe puede destrabar un acceso, pero no conceder el perfil administrador
- jefe administra, supervisor sin dashboard/usuarios, vendedor sólo circuito de venta
- revoca sesiones al cambiar rol o contraseña y protege el último jefe
- borradores separados, cancelar exige revisión y ventas conservan actor sin doble auditoría

### tests/integration/business-features.test.ts

[tests/integration/business-features.test.ts](../../tests/integration/business-features.test.ts)

- el jefe cambia tablero y comprobantes juntos con la revisión vigente
- el tablero apagado rechaza el acceso directo y Caja puede seguir cerrando ventas
- un cambio con revisión vencida no altera ninguna función
- Costos apagado oculta mantenimiento y al activarlo conserva la referencia
- Compras apagado bloquea nuevas recepciones y conserva el histórico para el jefe
- Cuenta de proveedores requiere Compras y no oculta saldos pendientes
- Ubicaciones requiere Stock y no se apaga con mercadería en tránsito

### tests/integration/catalog-identification.test.ts

[tests/integration/catalog-identification.test.ts](../../tests/integration/catalog-identification.test.ts)

- identificación interna del catálogo
- genera un código interno único y una etiqueta pendiente al crear un producto sin código de fábrica

### tests/integration/catalog-import.test.ts

[tests/integration/catalog-import.test.ts](../../tests/integration/catalog-import.test.ts)

- catálogo e importación atómica
- migra categorías existentes y conserva categoría y marca al buscar productos
- encuentra códigos Unicode con tildes y mayúsculas
- guarda, busca sin tildes, mantiene ceros y rechaza edición vieja/duplicados
- muestra fila inválida 1500 y no aplica nada; repetir un hash válido no duplica
- exige confirmar precios, detecta cambios desde preview y revierte todo el lote
- pagina sin repetir filas y bloquea cambios de unidad con uso histórico
- conserva el último borrador y evita sobrescribir una revisión más nueva
- filtra los productos por kilo antes de paginar y ata el cursor al filtro

### tests/integration/checkout-hot-path.test.ts

[tests/integration/checkout-hot-path.test.ts](../../tests/integration/checkout-hot-path.test.ts)

- mantiene rápido el camino crítico de caja con búsqueda de código y confirmación local
- mantiene Caja independiente cuando Compras se activa o se pausa

### tests/integration/control-api.test.ts

[tests/integration/control-api.test.ts](../../tests/integration/control-api.test.ts)

- control web exige perfil, exportar no ejecuta mutaciones y XLSX conserva filtros

### tests/integration/control-commercial.test.ts

[tests/integration/control-commercial.test.ts](../../tests/integration/control-commercial.test.ts)

- control comercial
- prioriza 50 unidades antiguas y descuenta una devolución total del último movimiento
- filtra producto exacto en consulta y exportación
- invalida revisión cuando precio cambió y volvió al valor anterior
- recupera semanas pendientes después de una interrupción sin duplicarlas
- muestra historial anterior sin inventar cambios estructurados
- audita antes y después sin secretos y conserva eventos inmutables
- exporta rotación con función costos desactivada sin exponer márgenes
- registra solo cambios efectivos de precio, no ediciones de nombre
- usa margen sobre venta, revisa sin cambiar precio y reabre ante costo nuevo
- rechaza permisos y funciones deshabilitadas
- no etiqueta productos nuevos y no inventa costo faltante
- snapshot idempotente conserva versiones y concilia una semana entre meses

### tests/integration/control-operations.test.ts

[tests/integration/control-operations.test.ts](../../tests/integration/control-operations.test.ts)

- recupera borrador, distingue vacío de cero, rechaza stock cambiado y aplica una sola vez
- vendedor no accede a conteos, caja ni agenda
- fecha nullable no inventa vencimiento; cobro se imputa a obligación elegida y detecta saldo cambiado
- conteo por lotes conserva ledger y cantidades de ubicación en un ajuste idempotente
- caja conserva faltantes/sobrantes al revisar y supervisor no obtiene agregados ni revisa

### tests/integration/control-replenishment.test.ts

[tests/integration/control-replenishment.test.ts](../../tests/integration/control-replenishment.test.ts)

- reposición y pedidos
- recibe stock y lotes en el destino y revierte todo cuando falta el lote obligatorio
- pagina y exporta los mismos filtros con 4000 artículos
- incluye días abiertos sin ventas y devoluciones, sin mezclar gramos con unidades
- excluye lotes bloqueados/vencidos y revalida ventas concurrentes al confirmar
- reconfirma la fecha de pedidos retrasados sin duplicar el compromiso
- redondea por unidad de compra y conserva aislada la existencia del depósito
- descuenta solo confirmado dentro del horizonte y recibe parcialmente una sola compra/deuda
- rechaza permisos, datos extra, revisiones viejas y conserva compromisos con módulo oculto

### tests/integration/control-workspace.test.ts

[tests/integration/control-workspace.test.ts](../../tests/integration/control-workspace.test.ts)

- vistas privadas validan filtros, revisión y dueño; supervisor no recibe datos financieros

### tests/integration/costs.test.ts

[tests/integration/costs.test.ts](../../tests/integration/costs.test.ts)

- costos vigentes
- guarda una referencia manual con historial y revisión optimista
- actualiza el promedio y puede restaurar el costo anterior
- una compra actualiza el promedio y cada venta congela su costo

### tests/integration/customer-accounts.test.ts

[tests/integration/customer-accounts.test.ts](../../tests/integration/customer-accounts.test.ts)

- clientes y cuenta corriente
- caja permite al vendedor crear un cliente, pero no editarlo ni habilitar crédito
- vende a cuenta, controla el límite y aplica cobros parciales sin duplicar ventas
- el cobro en efectivo entra una sola vez a la caja
- una devolución cancela primero la deuda y reintegra sólo lo ya cobrado

### tests/integration/database.test.ts

[tests/integration/database.test.ts](../../tests/integration/database.test.ts)

- SQLite local
- recupera una inicialización interrumpida en archivo vacío y rechaza bases ajenas
- respalda y verifica la base anterior antes de migrar
- aplica una migración una sola vez y conserva datos al reabrir
- revierte una transacción completa ante un error

### tests/integration/excel-exports.test.ts

[tests/integration/excel-exports.test.ts](../../tests/integration/excel-exports.test.ts)

- Excel incluye todas las páginas filtradas, importes numéricos y códigos como texto

### tests/integration/location-consolidation.test.ts

[tests/integration/location-consolidation.test.ts](../../tests/integration/location-consolidation.test.ts)

- consolidación por ubicación
- suma exactamente las ventas y mantiene cada stock aislado
- el supervisor no puede consultar el consolidado

### tests/integration/location-performance.test.ts

[tests/integration/location-performance.test.ts](../../tests/integration/location-performance.test.ts)

- resume cinco ubicaciones con 4.000 productos sin recorrer por fila desde la aplicación

### tests/integration/location-web-isolation.test.ts

[tests/integration/location-web-isolation.test.ts](../../tests/integration/location-web-isolation.test.ts)

- la web ignora una ubicación manipulada y usa la asignada a la terminal

### tests/integration/locations-transfers.test.ts

[tests/integration/locations-transfers.test.ts](../../tests/integration/locations-transfers.test.ts)

- ubicaciones y traslados
- consulta existencias por origen sin mezclar depósitos y busca por nombre o código
- conserva saldos y terminales al actualizar una base anterior
- migra el stock existente a una ubicación principal
- despacha y recibe con diferencia sin duplicar stock al reintentar
- cancelar un traslado repone el origen una sola vez
- los lotes conservan su identidad y registran la diferencia durante el traslado

### tests/integration/lots.test.ts

[tests/integration/lots.test.ts](../../tests/integration/lots.test.ts)

- lotes FEFO
- repone el lote original al anular una venta completa
- revierte una recepción por lote sólo si no tuvo movimientos posteriores
- conecta venta y devolución con el lote histórico sin cambiar Caja cuando no aplica
- exige distribuir el stock existente antes de habilitar operaciones por lote
- asigna primero el vencimiento más próximo y deja sin fecha para el final
- no vende vencidos o bloqueados y no deja un movimiento parcial

### tests/integration/migrations.test.ts

[tests/integration/migrations.test.ts](../../tests/integration/migrations.test.ts)

- migraciones trazables
- crea compras y proveedores desactivados por defecto con vínculos de stock
- actualiza los nombres anteriores sin reemplazar nombres personalizados ni repetir la revisión
- acepta checksum legacy CRLF y lo normaliza para mover la base entre Windows y Linux
- conserva configuración legacy al actualizar y revierte un lote fallido
- actualiza v5 conservando catálogo y usuarios; invalida sesiones previas
- bloquea una base futura o un checksum alterado sin mutaciones

### tests/integration/monthly-performance.test.ts

[tests/integration/monthly-performance.test.ts](../../tests/integration/monthly-performance.test.ts)

- concilia reporte SQL con 2000 productos y 100000 ventas en DB temporal

### tests/integration/monthly-reconciliation.test.ts

[tests/integration/monthly-reconciliation.test.ts](../../tests/integration/monthly-reconciliation.test.ts)

- concilia descuentos, aplicado sin vuelto, KG separado y anulaciones del mes original

### tests/integration/notifications-comparisons.test.ts

[tests/integration/notifications-comparisons.test.ts](../../tests/integration/notifications-comparisons.test.ts)

- los avisos respetan función, rol y vuelven a pendientes si cambia la condición
- el comparativo usa períodos iguales y centavos netos

### tests/integration/pricing.test.ts

[tests/integration/pricing.test.ts](../../tests/integration/pricing.test.ts)

- actualización masiva de precios
- previsualiza, confirma todo el lote y reintenta sin duplicar
- rechaza el lote completo si un producto cambió después del preview

### tests/integration/promotions-performance.test.ts

[tests/integration/promotions-performance.test.ts](../../tests/integration/promotions-performance.test.ts)

- cotiza sobre 4.000 productos y 100 promociones sin recorrer el catálogo completo

### tests/integration/promotions.test.ts

[tests/integration/promotions.test.ts](../../tests/integration/promotions.test.ts)

- aplica y congela una promoción activa al confirmar la venta

### tests/integration/purchases-api.test.ts

[tests/integration/purchases-api.test.ts](../../tests/integration/purchases-api.test.ts)

- API web expone proveedores y recepción sólo con función y rol autorizados

### tests/integration/purchases-performance.test.ts

[tests/integration/purchases-performance.test.ts](../../tests/integration/purchases-performance.test.ts)

- pagina compras grandes y busca en un catálogo de 4.000 productos sin cargar todo

### tests/integration/purchases.test.ts

[tests/integration/purchases.test.ts](../../tests/integration/purchases.test.ts)

- proveedores y compras
- guarda, recupera y cancela un borrador propio con revisión optimista
- crea, busca, edita y desactiva proveedores con revisión optimista
- confirma costos y snapshots una sola vez cuando Stock está apagado
- aumenta stock preparado dentro de la misma confirmación
- lista snapshots y anula una recepción segura una sola vez
- bloquea la anulación automática si hubo una salida posterior

### tests/integration/receipts.test.ts

[tests/integration/receipts.test.ts](../../tests/integration/receipts.test.ts)

- comprobantes no fiscales
- crea una emisión pendiente con una instantánea inmutable de la venta

### tests/integration/returns.test.ts

[tests/integration/returns.test.ts](../../tests/integration/returns.test.ts)

- devoluciones parciales
- conserva los centavos al devolver por partes una venta con descuento
- prorratea, repone stock y conserva idempotencia sin exceder lo vendido
- revierte la operación completa si falla después de tocar stock

### tests/integration/sale-atomicity.test.ts

[tests/integration/sale-atomicity.test.ts](../../tests/integration/sale-atomicity.test.ts)

- guarda snapshots, stock, vuelto y borrador juntos; 100 reintentos no duplican
- confirma una venta rápida sin esperar el autosave del borrador y lo elimina en la misma transacción
- fallo después de descontar stock revierte toda la venta y conserva el borrador
- anula por movimientos originales aunque cambie tracking y sólo repone una vez
- revalida precio, borrador y stock; advierte conteo posterior antes de anular

### tests/integration/sales-edge-cases.test.ts

[tests/integration/sales-edge-cases.test.ts](../../tests/integration/sales-edge-cases.test.ts)

- venta y ledger comparten fecha al cruzar medianoche; registra retroceso observable del reloj
- stock desconocido sigue desconocido y una venta bonificada no necesita pagos
- rechaza cambios de precio y productos inactivos sin perder el borrador
- suma porciones del mismo producto y exige motivo para stock negativo
- anulación fallida revierte reposición y estado; motivo distinto con misma key se rechaza
- pagina el histórico sin repetir y vincula cursor con filtros

### tests/integration/stock-ledger.test.ts

[tests/integration/stock-ledger.test.ts](../../tests/integration/stock-ledger.test.ts)

- agrega inventario al catálogo v2 sin inventar existencias ni alterar productos
- registra apertura, recepción, merma y conteo con saldo conciliado e idempotencia
- exige confirmación explícita para negativo y revierte saldo si falla el movimiento
- conserva historial al desactivar tracking y exige un nuevo conteo al reactivarlo
- importa conteo real en la misma transacción y no lo repite ni reemplaza uno existente
- pagina movimientos con igual timestamp y filtra por fecha comercial argentina
- muestra reposición de 2.000 productos y mantiene desconocidos por separado

### tests/integration/supplier-accounts.test.ts

[tests/integration/supplier-accounts.test.ts](../../tests/integration/supplier-accounts.test.ts)

- cuenta de proveedores
- crea deuda y aplica pagos parciales FIFO de forma idempotente
- vincula efectivo una sola vez y una anulación pagada deja crédito

### tests/integration/web-api.test.ts

[tests/integration/web-api.test.ts](../../tests/integration/web-api.test.ts)

- producción entrega cookie __Host privada y segura, CSP estricta y protección de framing
- filtros web de clientes, traslados y resumen por ubicación admiten parámetros válidos y rechazan extras
- cookies privadas, CSRF/origin y deny-default; bootstrap y rutas internas no públicos
- roles web: vendedor solo caja; supervisor gestiona stock; jefe crea usuarios
- seguridad producción, no origen wildcard, límites por cuenta e inyección de proxy no confiado
- administrador del sistema conserva acceso a copias y administración web
- solo jefe o administrador cambia funciones y el estado se expone a usuarios autenticados

### tests/integration/web-backup.test.ts

[tests/integration/web-backup.test.ts](../../tests/integration/web-backup.test.ts)

- backup acepta esquema con fin de línea de Windows para recuperarlo en Linux
- rejects authenticated checksum mismatches and bounded decompression bombs
- exports authenticated ciphertext and restores a verified online snapshot, revoking sessions
- rejects a backup encrypted with another key and a missing or future application schema
- rejects tampering, foreign keys, oversized imports and arbitrary paths
- invalidates preview after writes, expiry and ciphertext replacement
- blocks all nonempty carts and rolls back a failed reopen
- recovers an interrupted atomic swap to the prior database
- cleans abandoned plaintext recovery files before opening the database
- creates one daily backup per day and retains fourteen daily copies
- recovers corrupt and missing databases offline and preserves the corrupt original
- rolls back an interrupted offline recovery without validating the corrupt original

### tests/integration/web-cli.test.ts

[tests/integration/web-cli.test.ts](../../tests/integration/web-cli.test.ts)

- CLI privada rechaza alta incompleta sin crear una cuenta con el nombre de una opción
- CLI privada crea un único administrador con contraseña reforzada
- la recuperación privada del jefe elimina sus intentos bloqueados

### tests/integration/web-concurrency-qa.test.ts

[tests/integration/web-concurrency-qa.test.ts](../../tests/integration/web-concurrency-qa.test.ts)

- HTTP concurrente: dos ventas distintas de la última unidad guardan solo una y un ingreso
- HTTP concurrente: editar el mismo producto con una revisión no sobreescribe la primera edición
- HTTP concurrente: dos guardados de borrador con revisión cero conservan un único carrito
- HTTP concurrente: dos devoluciones diferentes de la misma unidad reintegran una sola vez
- HTTP concurrente: un código de barras no puede identificar dos productos nuevos

### tests/integration/web-flow.test.ts

[tests/integration/web-flow.test.ts](../../tests/integration/web-flow.test.ts)

- worker real: caja, kilos, venta concurrente idempotente, arqueo y restauración web
- sesiones web refrescan actividad, vencen inactivas y revocan otro ingreso

### tests/integration/web-lease.test.ts

[tests/integration/web-lease.test.ts](../../tests/integration/web-lease.test.ts)

- exclusión real entre servicio y administración/recuperación; libera al cerrar

### tests/integration/web-operations.test.ts

[tests/integration/web-operations.test.ts](../../tests/integration/web-operations.test.ts)

- shift filters use Argentine days and preserve shortage, surplus and pending closure
- product export is alphabetical, paginated and uses readable Argentine prices
- settings revision, terminal ownership, cash replay and immutable closure
- seller owns shifts, audit failure rolls back, drafts prevent close, exports neutralize formulas
- mixed cash reconciles applied amount, refund in next shift leaves closure intact
- CSV exports are bounded, exclude credentials and neutralize spreadsheet formulas
- exports sale detail and closed shifts with the business values needed for reconciliation
- movement exact retry survives close, changed payload and reused cross-operation key reject
- audit keyset pagination has no duplicates and cursor cannot change filters

### tests/integration/worker-client.test.ts

[tests/integration/worker-client.test.ts](../../tests/integration/worker-client.test.ts)

- token permanece en main y un error de contraseña no destruye la sesión
- agrupa reconexiones concurrentes en un único worker y rechaza operaciones durante el cambio

### tests/unit/barcode.test.ts

[tests/unit/barcode.test.ts](../../tests/unit/barcode.test.ts)

- códigos internos
- genera un EAN-13 interno con prefijo 200 y dígito verificador válido
- rechaza un EAN-13 cuyo dígito verificador fue alterado

### tests/unit/checkout-controller.test.ts

[tests/unit/checkout-controller.test.ts](../../tests/unit/checkout-controller.test.ts)

- rechaza cambio de unidad al actualizar un carrito por peso
- consulta un cobro sin acuse antes de habilitar otra venta
- bloquea captura y consultas superpuestas al recuperar un cobro pendiente
- reutiliza el producto escaneado y confirma un cobro rápido sin esperar un borrador pendiente
- vuelve a guardar el carrito si un cobro rápido es rechazado

### tests/unit/checkout-scanner-focus.test.ts

[tests/unit/checkout-scanner-focus.test.ts](../../tests/unit/checkout-scanner-focus.test.ts)

- does not capture scanner focus or shortcuts while any dialog is open
- preserves form edits and permits scanner input and non-editing surfaces

### tests/unit/costs.test.ts

[tests/unit/costs.test.ts](../../tests/unit/costs.test.ts)

- cost math
- converts unit and kilogram prices to microcents per base unit
- rounds a weighted average to the closest microcent with ties upwards
- starts from received stock when previous stock is zero or negative
- rounds line costs in cents without floating point
- reports coverage against net sales in basis points

### tests/unit/dashboard-comparison-export.test.ts

[tests/unit/dashboard-comparison-export.test.ts](../../tests/unit/dashboard-comparison-export.test.ts)

- explora y exporta las fechas del mes histórico elegido, sin resolver el mes actual
- exporta las fechas ya resueltas y el mismo resultado de un preset, sin volver a resolverlo al descargar

### tests/unit/draft-writer.test.ts

[tests/unit/draft-writer.test.ts](../../tests/unit/draft-writer.test.ts)

- flush serializa cambios y recupera una escritura confirmada sin acuse
- no descarta contenido si falla guardado y resultado no existe
- permite guardar después de un flush sin cambios

### tests/unit/features.test.ts

[tests/unit/features.test.ts](../../tests/unit/features.test.ts)

- solo las funciones opcionales entregadas son visibles y las operaciones protegidas se asignan

### tests/unit/help-search.test.ts

[tests/unit/help-search.test.ts](../../tests/unit/help-search.test.ts)

- búsqueda de ayuda por vocabulario del comercio
- encuentra el lector por scanner, escáner o pistola
- encuentra cuenta corriente por fiar o fiado
- combina términos sin depender de su orden y conserva búsquedas distintas

### tests/unit/ipc-validation.test.ts

[tests/unit/ipc-validation.test.ts](../../tests/unit/ipc-validation.test.ts)

- frontera IPC
- rechaza operaciones desconocidas, payloads inválidos y campos adicionales
- permite sólo la ventana principal de la app, nunca iframes ni otros orígenes
- no muestra fallos SQLite como éxitos ni filtra rutas internas

### tests/unit/month-boundaries.test.ts

[tests/unit/month-boundaries.test.ts](../../tests/unit/month-boundaries.test.ts)

- compara mes abierto con mismos días locales y trunca febrero

### tests/unit/navigation.test.ts

[tests/unit/navigation.test.ts](../../tests/unit/navigation.test.ts)

- administración conserva actividad cuando es su única área autorizada
- resultados requiere autorización propia y vendedor conserva caja
- cada destino histórico mantiene un acceso en los contenedores

### tests/unit/payment-discount.test.ts

[tests/unit/payment-discount.test.ts](../../tests/unit/payment-discount.test.ts)

- calcula gramos, redondea y reparte el descuento conservando cada centavo
- conciliación de pagos mixtos usa aplicado y calcula vuelto
- rechaza excesos, descuento mayor al subtotal y admite venta bonificada sin pagos

### tests/unit/permissions.test.ts

[tests/unit/permissions.test.ts](../../tests/unit/permissions.test.ts)

- matriz explícita y operaciones desconocidas denegadas incluso para administrador
- roles acumulativos: el jefe incluye toda la caja y toda la supervision

### tests/unit/product-validation.test.ts

[tests/unit/product-validation.test.ts](../../tests/unit/product-validation.test.ts)

- valores del catálogo
- conserva ceros de barcode y exige revisión al editar
- normaliza tildes y convierte mínimos en kilos a gramos enteros

### tests/unit/promotions.test.ts

[tests/unit/promotions.test.ts](../../tests/unit/promotions.test.ts)

- motor de promociones
- aplica X por Y repetible y deja el excedente disponible
- resuelve la misma prioridad por mayor ahorro y desempata estable
- prorratea un combo con suma exacta entre productos
- aplica un precio especial desde la cantidad indicada

### tests/unit/purchase-controller.test.ts

[tests/unit/purchase-controller.test.ts](../../tests/unit/purchase-controller.test.ts)

- agrega un producto y un nuevo escaneo incrementa la misma línea
- actualiza cantidades y elimina el renglón al llevarlo a cero

### tests/unit/purchase-draft-writer.test.ts

[tests/unit/purchase-draft-writer.test.ts](../../tests/unit/purchase-draft-writer.test.ts)

- serializa el autoguardado y recupera una confirmación sin respuesta
- conserva cambios pendientes cuando el servidor no los recibió

### tests/unit/purchase-pending.test.ts

[tests/unit/purchase-pending.test.ts](../../tests/unit/purchase-pending.test.ts)

- recupera y limpia el último borrador local válido
- ignora contenido local alterado o incompatible

### tests/unit/purchases.test.ts

[tests/unit/purchases.test.ts](../../tests/unit/purchases.test.ts)

- el proveedor requiere solo nombre y agrupa datos opcionales limitados
- el borrador rechaza productos repetidos y cantidades no enteras
- permite preparar un costo pendiente pero no confirmar la compra
- calcula costos exactos por unidad y kilogramo sin floats persistidos
- el hash canónico no depende del orden de propiedades

### tests/unit/report-periods.test.ts

[tests/unit/report-periods.test.ts](../../tests/unit/report-periods.test.ts)

- resuelve hoy, semana, mes y rango con un tramo anterior equivalente
- rechaza rangos invertidos o excesivos

### tests/unit/returns.test.ts

[tests/unit/returns.test.ts](../../tests/unit/returns.test.ts)

- prorrateo acumulado de devoluciones
- conserva cada centavo al devolver una línea en varias partes
- funciona igual con gramos y costos históricos
- rechaza cero, excesos y enteros inseguros

### tests/unit/scan-queue.test.ts

[tests/unit/scan-queue.test.ts](../../tests/unit/scan-queue.test.ts)

- cola preserva orden, repetidos son legítimos y un error no pierde lo que sigue
- cancelar descarta cola y lookup en curso sin agregar después de salir

### tests/unit/stock-pending.test.ts

[tests/unit/stock-pending.test.ts](../../tests/unit/stock-pending.test.ts)

- conserva payload y clave del registro pendiente y no los reemplaza al reintentar
- no permite enviar un registro si no se pudo conservar su intención

### tests/unit/stock-units.test.ts

[tests/unit/stock-units.test.ts](../../tests/unit/stock-units.test.ts)

- convierte kilos en gramos y distingue desconocido, cero, bajo y negativo
- rechaza merma cero, recepción negativa y fracciones en unidad base

### tests/unit/supplier-accounts.test.ts

[tests/unit/supplier-accounts.test.ts](../../tests/unit/supplier-accounts.test.ts)

- imputación de pagos a proveedores
- aplica primero a la deuda más antigua y permite un pago parcial
- rechaza importe cero y pagos mayores al saldo

### tests/unit/transfer-ui-validation.test.ts

[tests/unit/transfer-ui-validation.test.ts](../../tests/unit/transfer-ui-validation.test.ts)

- availability before dispatching a transfer
- blocks a cached balance while changing or rechecking origin
- preserves kg base quantities and rejects invalid, missing and negative stock

### tests/unit/web-client.test.ts

[tests/unit/web-client.test.ts](../../tests/unit/web-client.test.ts)

- keeps CSRF in memory and sends cookies without retrying writes
- un 401 ilegible invalida la sesión antes de informar el error de respuesta
- subida y descarga fallidas muestran el mismo error útil sin interpretar HTML como datos
- reports an uncertain network result without replaying a sale

### tests/unit/web-config.test.ts

[tests/unit/web-config.test.ts](../../tests/unit/web-config.test.ts)

- producción exige HTTPS y clave externa; ignora configuración insegura

### tests/unit/weight-calculation.test.ts

[tests/unit/weight-calculation.test.ts](../../tests/unit/weight-calculation.test.ts)

- gramos y kilos explícitos coinciden, sin subgramos ni límites silenciosos

### tests/web-e2e/backup-recovery.spec.ts

[tests/web-e2e/backup-recovery.spec.ts](../../tests/web-e2e/backup-recovery.spec.ts)

- una consulta fallida no se presenta como ausencia de copias y permite reintentar
- copia descargada: restaura venta, stock y cierre y revoca todas las sesiones

### tests/web-e2e/control-tools.spec.ts

[tests/web-e2e/control-tools.spec.ts](../../tests/web-e2e/control-tools.spec.ts)

- Inicio, vistas, resumen semanal y actividad en escritorio y móvil

### tests/web-e2e/customer-credit-circuit.spec.ts

[tests/web-e2e/customer-credit-circuit.spec.ts](../../tests/web-e2e/customer-credit-circuit.spec.ts)

- fallo de consulta de clientes se muestra como error y se recupera con Reintentar
- cliente: alta, límite, venta a cuenta, cobro parcial y saldo cancelado en celular

### tests/web-e2e/dashboard-navigation.spec.ts

[tests/web-e2e/dashboard-navigation.spec.ts](../../tests/web-e2e/dashboard-navigation.spec.ts)

- el dashboard conserva el mes elegido y permite consultar días con teclado y celular

### tests/web-e2e/excel-export.spec.ts

[tests/web-e2e/excel-export.spec.ts](../../tests/web-e2e/excel-export.spec.ts)

- Excel: filtros actuales, descarga real y diálogo usable en celular

### tests/web-e2e/frontend-interactions.spec.ts

[tests/web-e2e/frontend-interactions.spec.ts](../../tests/web-e2e/frontend-interactions.spec.ts)

- Excel conserva el alcance al abrir y cerrar el ajuste de filtros
- Caja selecciona con teclado, conserva búsqueda en error y devuelve foco
- El alta de categoría y marca conserva el producto y los filtros al volver

### tests/web-e2e/modules.spec.ts

[tests/web-e2e/modules.spec.ts](../../tests/web-e2e/modules.spec.ts)

- web real: módulos, terminal, venta escaneada y consulta
- web: permisos de vendedor y supervisor

### tests/web-e2e/notifications.spec.ts

[tests/web-e2e/notifications.spec.ts](../../tests/web-e2e/notifications.spec.ts)

- web real: avisa stock bajo y compara períodos en celular

### tests/web-e2e/promotions.spec.ts

[tests/web-e2e/promotions.spec.ts](../../tests/web-e2e/promotions.spec.ts)

- web real: crea una promoción responsive y cotiza el ahorro

### tests/web-e2e/purchases.spec.ts

[tests/web-e2e/purchases.spec.ts](../../tests/web-e2e/purchases.spec.ts)

- web real: recibe una compra y conserva su detalle histórico

### tests/web-e2e/qa-edge-circuits.spec.ts

[tests/web-e2e/qa-edge-circuits.spec.ts](../../tests/web-e2e/qa-edge-circuits.spec.ts)

- precio cambiado durante carrito: revisión visible, actualización explícita e histórico intacto
- cobro sin conexión antes de guardar: reintento explícito y doble clic no duplican
- revocación de usuario con sesión abierta: bloquea nuevas operaciones desde su sesión
- stock insuficiente: rechazo conserva carrito y saldo; corregir cantidad permite cobrar
- producto desactivado durante carrito: retirar y reescanear no reutiliza datos activos antiguos

### tests/web-e2e/scanner-circuit.spec.ts

[tests/web-e2e/scanner-circuit.spec.ts](../../tests/web-e2e/scanner-circuit.spec.ts)

- lector USB simulado: ráfaga, demoras, errores, foco, borrador y cobro único

### tests/web-e2e/security-circuit.spec.ts

[tests/web-e2e/security-circuit.spec.ts](../../tests/web-e2e/security-circuit.spec.ts)

- web adversarial: XSS, CSRF, permisos, importes manipulados e idempotencia

### tests/web-e2e/store-day.spec.ts

[tests/web-e2e/store-day.spec.ts](../../tests/web-e2e/store-day.spec.ts)

- jornada real: dos cajeros, promoción, peso, cobro incierto, devolución y cierres

## Especificaciones y planes de desarrollo

Los estados de tareas son marcas documentales, no evidencia de ejecución actual. Una casilla completa no sustituye pruebas ni lectura del código.

| Especificación | Artefactos disponibles | Tareas marcadas / total |
|---|---|---|
| 001-desktop-core | [specs/001-desktop-core/data-model.md](../../specs/001-desktop-core/data-model.md), [specs/001-desktop-core/plan.md](../../specs/001-desktop-core/plan.md), [specs/001-desktop-core/quickstart.md](../../specs/001-desktop-core/quickstart.md), [specs/001-desktop-core/research.md](../../specs/001-desktop-core/research.md), [specs/001-desktop-core/spec.md](../../specs/001-desktop-core/spec.md), [specs/001-desktop-core/tasks.md](../../specs/001-desktop-core/tasks.md) | 6 / 12 |
| 002-product-catalog | [specs/002-product-catalog/data-model.md](../../specs/002-product-catalog/data-model.md), [specs/002-product-catalog/plan.md](../../specs/002-product-catalog/plan.md), [specs/002-product-catalog/quickstart.md](../../specs/002-product-catalog/quickstart.md), [specs/002-product-catalog/research.md](../../specs/002-product-catalog/research.md), [specs/002-product-catalog/spec.md](../../specs/002-product-catalog/spec.md), [specs/002-product-catalog/tasks.md](../../specs/002-product-catalog/tasks.md) | 7 / 12 |
| 003-stock-ledger | [specs/003-stock-ledger/data-model.md](../../specs/003-stock-ledger/data-model.md), [specs/003-stock-ledger/plan.md](../../specs/003-stock-ledger/plan.md), [specs/003-stock-ledger/quickstart.md](../../specs/003-stock-ledger/quickstart.md), [specs/003-stock-ledger/research.md](../../specs/003-stock-ledger/research.md), [specs/003-stock-ledger/spec.md](../../specs/003-stock-ledger/spec.md), [specs/003-stock-ledger/tasks.md](../../specs/003-stock-ledger/tasks.md) | 11 / 12 |
| 004-checkout-scanner | [specs/004-checkout-scanner/data-model.md](../../specs/004-checkout-scanner/data-model.md), [specs/004-checkout-scanner/plan.md](../../specs/004-checkout-scanner/plan.md), [specs/004-checkout-scanner/quickstart.md](../../specs/004-checkout-scanner/quickstart.md), [specs/004-checkout-scanner/research.md](../../specs/004-checkout-scanner/research.md), [specs/004-checkout-scanner/spec.md](../../specs/004-checkout-scanner/spec.md), [specs/004-checkout-scanner/tasks.md](../../specs/004-checkout-scanner/tasks.md) | 6 / 12 |
| 005-weighted-products | [specs/005-weighted-products/data-model.md](../../specs/005-weighted-products/data-model.md), [specs/005-weighted-products/plan.md](../../specs/005-weighted-products/plan.md), [specs/005-weighted-products/quickstart.md](../../specs/005-weighted-products/quickstart.md), [specs/005-weighted-products/research.md](../../specs/005-weighted-products/research.md), [specs/005-weighted-products/spec.md](../../specs/005-weighted-products/spec.md), [specs/005-weighted-products/tasks.md](../../specs/005-weighted-products/tasks.md) | 5 / 12 |
| 006-sales-payments-history | [specs/006-sales-payments-history/data-model.md](../../specs/006-sales-payments-history/data-model.md), [specs/006-sales-payments-history/plan.md](../../specs/006-sales-payments-history/plan.md), [specs/006-sales-payments-history/quickstart.md](../../specs/006-sales-payments-history/quickstart.md), [specs/006-sales-payments-history/research.md](../../specs/006-sales-payments-history/research.md), [specs/006-sales-payments-history/spec.md](../../specs/006-sales-payments-history/spec.md), [specs/006-sales-payments-history/tasks.md](../../specs/006-sales-payments-history/tasks.md) | 8 / 12 |
| 007-monthly-dashboard | [specs/007-monthly-dashboard/data-model.md](../../specs/007-monthly-dashboard/data-model.md), [specs/007-monthly-dashboard/plan.md](../../specs/007-monthly-dashboard/plan.md), [specs/007-monthly-dashboard/quickstart.md](../../specs/007-monthly-dashboard/quickstart.md), [specs/007-monthly-dashboard/research.md](../../specs/007-monthly-dashboard/research.md), [specs/007-monthly-dashboard/spec.md](../../specs/007-monthly-dashboard/spec.md), [specs/007-monthly-dashboard/tasks.md](../../specs/007-monthly-dashboard/tasks.md) | 11 / 12 |
| 008-backup-installation | [specs/008-backup-installation/data-model.md](../../specs/008-backup-installation/data-model.md), [specs/008-backup-installation/plan.md](../../specs/008-backup-installation/plan.md), [specs/008-backup-installation/quickstart.md](../../specs/008-backup-installation/quickstart.md), [specs/008-backup-installation/research.md](../../specs/008-backup-installation/research.md), [specs/008-backup-installation/spec.md](../../specs/008-backup-installation/spec.md), [specs/008-backup-installation/tasks.md](../../specs/008-backup-installation/tasks.md) | 0 / 12 |
| 009-users-roles | [specs/009-users-roles/data-model.md](../../specs/009-users-roles/data-model.md), [specs/009-users-roles/plan.md](../../specs/009-users-roles/plan.md), [specs/009-users-roles/quickstart.md](../../specs/009-users-roles/quickstart.md), [specs/009-users-roles/research.md](../../specs/009-users-roles/research.md), [specs/009-users-roles/spec.md](../../specs/009-users-roles/spec.md), [specs/009-users-roles/tasks.md](../../specs/009-users-roles/tasks.md) | 9 / 9 |
| 010-web-api-security | [specs/010-web-api-security/data-model.md](../../specs/010-web-api-security/data-model.md), [specs/010-web-api-security/plan.md](../../specs/010-web-api-security/plan.md), [specs/010-web-api-security/quickstart.md](../../specs/010-web-api-security/quickstart.md), [specs/010-web-api-security/research.md](../../specs/010-web-api-security/research.md), [specs/010-web-api-security/spec.md](../../specs/010-web-api-security/spec.md), [specs/010-web-api-security/tasks.md](../../specs/010-web-api-security/tasks.md) | 5 / 5 |
| 011-web-backup-recovery | [specs/011-web-backup-recovery/data-model.md](../../specs/011-web-backup-recovery/data-model.md), [specs/011-web-backup-recovery/plan.md](../../specs/011-web-backup-recovery/plan.md), [specs/011-web-backup-recovery/quickstart.md](../../specs/011-web-backup-recovery/quickstart.md), [specs/011-web-backup-recovery/research.md](../../specs/011-web-backup-recovery/research.md), [specs/011-web-backup-recovery/spec.md](../../specs/011-web-backup-recovery/spec.md), [specs/011-web-backup-recovery/tasks.md](../../specs/011-web-backup-recovery/tasks.md) | 5 / 5 |
| 012-web-business-operations | [specs/012-web-business-operations/data-model.md](../../specs/012-web-business-operations/data-model.md), [specs/012-web-business-operations/plan.md](../../specs/012-web-business-operations/plan.md), [specs/012-web-business-operations/quickstart.md](../../specs/012-web-business-operations/quickstart.md), [specs/012-web-business-operations/research.md](../../specs/012-web-business-operations/research.md), [specs/012-web-business-operations/spec.md](../../specs/012-web-business-operations/spec.md), [specs/012-web-business-operations/tasks.md](../../specs/012-web-business-operations/tasks.md) | 6 / 6 |
| 013-web-frontend | [specs/013-web-frontend/data-model.md](../../specs/013-web-frontend/data-model.md), [specs/013-web-frontend/plan.md](../../specs/013-web-frontend/plan.md), [specs/013-web-frontend/quickstart.md](../../specs/013-web-frontend/quickstart.md), [specs/013-web-frontend/research.md](../../specs/013-web-frontend/research.md), [specs/013-web-frontend/spec.md](../../specs/013-web-frontend/spec.md), [specs/013-web-frontend/tasks.md](../../specs/013-web-frontend/tasks.md) | 13 / 13 |
| 014-business-modules | [specs/014-business-modules/spec.md](../../specs/014-business-modules/spec.md), [specs/014-business-modules/tasks.md](../../specs/014-business-modules/tasks.md) | 6 / 6 |
| 015-suppliers-purchases | [specs/015-suppliers-purchases/data-model.md](../../specs/015-suppliers-purchases/data-model.md), [specs/015-suppliers-purchases/plan.md](../../specs/015-suppliers-purchases/plan.md), [specs/015-suppliers-purchases/quickstart.md](../../specs/015-suppliers-purchases/quickstart.md), [specs/015-suppliers-purchases/research.md](../../specs/015-suppliers-purchases/research.md), [specs/015-suppliers-purchases/spec.md](../../specs/015-suppliers-purchases/spec.md), [specs/015-suppliers-purchases/tasks.md](../../specs/015-suppliers-purchases/tasks.md) | 47 / 47 |
| 016-costs-profitability | [specs/016-costs-profitability/data-model.md](../../specs/016-costs-profitability/data-model.md), [specs/016-costs-profitability/plan.md](../../specs/016-costs-profitability/plan.md), [specs/016-costs-profitability/quickstart.md](../../specs/016-costs-profitability/quickstart.md), [specs/016-costs-profitability/spec.md](../../specs/016-costs-profitability/spec.md), [specs/016-costs-profitability/tasks.md](../../specs/016-costs-profitability/tasks.md) | 10 / 10 |
| 017-stock-lots-returns | [specs/017-stock-lots-returns/data-model.md](../../specs/017-stock-lots-returns/data-model.md), [specs/017-stock-lots-returns/plan.md](../../specs/017-stock-lots-returns/plan.md), [specs/017-stock-lots-returns/spec.md](../../specs/017-stock-lots-returns/spec.md), [specs/017-stock-lots-returns/tasks.md](../../specs/017-stock-lots-returns/tasks.md) | 12 / 12 |
| 018-prices-promotions | [specs/018-prices-promotions/data-model.md](../../specs/018-prices-promotions/data-model.md), [specs/018-prices-promotions/plan.md](../../specs/018-prices-promotions/plan.md), [specs/018-prices-promotions/quickstart.md](../../specs/018-prices-promotions/quickstart.md), [specs/018-prices-promotions/spec.md](../../specs/018-prices-promotions/spec.md), [specs/018-prices-promotions/tasks.md](../../specs/018-prices-promotions/tasks.md) | 9 / 9 |
| 019-notifications-comparisons | [specs/019-notifications-comparisons/data-model.md](../../specs/019-notifications-comparisons/data-model.md), [specs/019-notifications-comparisons/plan.md](../../specs/019-notifications-comparisons/plan.md), [specs/019-notifications-comparisons/quickstart.md](../../specs/019-notifications-comparisons/quickstart.md), [specs/019-notifications-comparisons/spec.md](../../specs/019-notifications-comparisons/spec.md), [specs/019-notifications-comparisons/tasks.md](../../specs/019-notifications-comparisons/tasks.md) | 8 / 8 |
| 020-supplier-accounts | [specs/020-supplier-accounts/data-model.md](../../specs/020-supplier-accounts/data-model.md), [specs/020-supplier-accounts/plan.md](../../specs/020-supplier-accounts/plan.md), [specs/020-supplier-accounts/quickstart.md](../../specs/020-supplier-accounts/quickstart.md), [specs/020-supplier-accounts/spec.md](../../specs/020-supplier-accounts/spec.md), [specs/020-supplier-accounts/tasks.md](../../specs/020-supplier-accounts/tasks.md) | 8 / 8 |
| 021-customers-credit | [specs/021-customers-credit/data-model.md](../../specs/021-customers-credit/data-model.md), [specs/021-customers-credit/plan.md](../../specs/021-customers-credit/plan.md), [specs/021-customers-credit/quickstart.md](../../specs/021-customers-credit/quickstart.md), [specs/021-customers-credit/spec.md](../../specs/021-customers-credit/spec.md), [specs/021-customers-credit/tasks.md](../../specs/021-customers-credit/tasks.md) | 7 / 7 |
| 022-locations-transfers | [specs/022-locations-transfers/data-model.md](../../specs/022-locations-transfers/data-model.md), [specs/022-locations-transfers/plan.md](../../specs/022-locations-transfers/plan.md), [specs/022-locations-transfers/quickstart.md](../../specs/022-locations-transfers/quickstart.md), [specs/022-locations-transfers/spec.md](../../specs/022-locations-transfers/spec.md), [specs/022-locations-transfers/tasks.md](../../specs/022-locations-transfers/tasks.md) | 6 / 6 |
| 023-consolidation-scale | [specs/023-consolidation-scale/plan.md](../../specs/023-consolidation-scale/plan.md), [specs/023-consolidation-scale/quickstart.md](../../specs/023-consolidation-scale/quickstart.md), [specs/023-consolidation-scale/spec.md](../../specs/023-consolidation-scale/spec.md), [specs/023-consolidation-scale/tasks.md](../../specs/023-consolidation-scale/tasks.md) | 6 / 6 |
| 024-dashboard-navigation | [specs/024-dashboard-navigation/plan.md](../../specs/024-dashboard-navigation/plan.md), [specs/024-dashboard-navigation/spec.md](../../specs/024-dashboard-navigation/spec.md), [specs/024-dashboard-navigation/tasks.md](../../specs/024-dashboard-navigation/tasks.md) | 8 / 8 |
| 025-store-day-dashboard-motion | [specs/025-store-day-dashboard-motion/plan.md](../../specs/025-store-day-dashboard-motion/plan.md), [specs/025-store-day-dashboard-motion/spec.md](../../specs/025-store-day-dashboard-motion/spec.md), [specs/025-store-day-dashboard-motion/tasks.md](../../specs/025-store-day-dashboard-motion/tasks.md) | 9 / 9 |
| 026-web-circuits-security | [specs/026-web-circuits-security/plan.md](../../specs/026-web-circuits-security/plan.md), [specs/026-web-circuits-security/spec.md](../../specs/026-web-circuits-security/spec.md), [specs/026-web-circuits-security/tasks.md](../../specs/026-web-circuits-security/tasks.md) | 12 / 12 |
| 027-control-home-saved-views | [specs/027-control-home-saved-views/plan.md](../../specs/027-control-home-saved-views/plan.md), [specs/027-control-home-saved-views/spec.md](../../specs/027-control-home-saved-views/spec.md), [specs/027-control-home-saved-views/tasks.md](../../specs/027-control-home-saved-views/tasks.md) | 5 / 6 |
| 028-replenishment-orders | [specs/028-replenishment-orders/plan.md](../../specs/028-replenishment-orders/plan.md), [specs/028-replenishment-orders/spec.md](../../specs/028-replenishment-orders/spec.md), [specs/028-replenishment-orders/tasks.md](../../specs/028-replenishment-orders/tasks.md) | 5 / 6 |
| 029-merchandise-price-review | [specs/029-merchandise-price-review/plan.md](../../specs/029-merchandise-price-review/plan.md), [specs/029-merchandise-price-review/spec.md](../../specs/029-merchandise-price-review/spec.md), [specs/029-merchandise-price-review/tasks.md](../../specs/029-merchandise-price-review/tasks.md) | 6 / 6 |
| 030-guided-stock-cash-controls | [specs/030-guided-stock-cash-controls/plan.md](../../specs/030-guided-stock-cash-controls/plan.md), [specs/030-guided-stock-cash-controls/spec.md](../../specs/030-guided-stock-cash-controls/spec.md), [specs/030-guided-stock-cash-controls/tasks.md](../../specs/030-guided-stock-cash-controls/tasks.md) | 6 / 6 |
| 031-collections-payment-agenda | [specs/031-collections-payment-agenda/plan.md](../../specs/031-collections-payment-agenda/plan.md), [specs/031-collections-payment-agenda/spec.md](../../specs/031-collections-payment-agenda/spec.md), [specs/031-collections-payment-agenda/tasks.md](../../specs/031-collections-payment-agenda/tasks.md) | 6 / 6 |
| 032-weekly-summary-audit | [specs/032-weekly-summary-audit/plan.md](../../specs/032-weekly-summary-audit/plan.md), [specs/032-weekly-summary-audit/spec.md](../../specs/032-weekly-summary-audit/spec.md), [specs/032-weekly-summary-audit/tasks.md](../../specs/032-weekly-summary-audit/tasks.md) | 4 / 6 |
| 033-frontend-consistency | [specs/033-frontend-consistency/plan.md](../../specs/033-frontend-consistency/plan.md), [specs/033-frontend-consistency/spec.md](../../specs/033-frontend-consistency/spec.md), [specs/033-frontend-consistency/tasks.md](../../specs/033-frontend-consistency/tasks.md) | 15 / 20 |
