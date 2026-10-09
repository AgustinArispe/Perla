# Tasks: Proveedores y compras

**Input**: `specs/015-suppliers-purchases/` design documents.

**Tests**: required by the project constitution. Every behavior task starts with a failing focused test.

## Phase 1: Setup

- [x] T001 Add `SUPPLIERS_PURCHASES` to feature contracts and operation gating in `src/shared/features.ts`, `src/domain/features.ts`, `src/worker/features/service.ts`, and `tests/unit/features.test.ts`
- [x] T002 Create strict shared supplier, draft, purchase, cost and void schemas with name 2–140, phone 40, contact 120, address 240, notes 1000, maximum 200 unique lines, positive integer quantities/costs in `src/shared/purchases.ts` and `tests/unit/purchases.test.ts`
- [x] T003 Define exact UNIT/KG subtotal calculation and canonical payload hashing helpers in `src/domain/purchases.ts` and failing tests in `tests/unit/purchases.test.ts`

## Phase 2: Foundational

- [x] T004 Create migration 014 with suppliers, purchase drafts, purchases, purchase items, purchase events, indexes, stock purchase references, and the disabled feature row in `src/worker/db/migrations/014_suppliers_purchases.sql`
- [x] T005 Register migration 014 and schema-version assertions in `src/worker/db/migrations.ts` and `tests/integration/migrations.test.ts`
- [x] T006 Extend stock ledger writes with optional `purchaseId` and `purchaseItemId` while preserving sale paths in `src/worker/stock/repository.ts`, `src/shared/stock.ts`, and `tests/integration/stock-ledger.test.ts`
- [x] T007 Add purchase and supplier operations with strict request schemas to `src/shared/operations.ts`, `src/shared/requests.ts`, `src/shared/contracts.ts`, and compile-time client contracts
- [x] T008 Add supervisor/owner/admin purchase permissions and seller denials in `src/domain/permissions.ts` and `tests/unit/permissions.test.ts`

## Phase 3: User Story 1 — Proveedores (P1)

**Goal**: create, search, edit and deactivate suppliers with historical safety.

**Independent Test**: create with only name, search, enrich, deactivate and verify seller denial.

- [x] T009 [US1] Write failing supplier repository and concurrency tests in `tests/integration/purchases.test.ts`
- [x] T010 [US1] Implement supplier mapping, get, cursor search, save and set-active operations in `src/worker/purchases/repository.ts`
- [x] T011 [US1] Implement supplier validation, optimistic concurrency and audit-ready results in `src/worker/purchases/service.ts`
- [x] T012 [US1] Wire supplier operations through `src/worker/application.ts` and verify role enforcement in `tests/integration/purchases.test.ts`
- [x] T013 [US1] Add supplier HTTP contract tests in `tests/integration/purchases-api.test.ts`, then expose routes in `src/server/app.ts`
- [x] T014 [US1] Add supplier methods to web and Electron clients in `src/renderer/web-client.ts` and `src/main/preload.ts`
- [x] T015 [US1] Build compact searchable supplier list and progressive form in `src/renderer/features/purchases/SupplierList.tsx` and `src/renderer/features/purchases/SupplierForm.tsx`

## Phase 4: User Story 2 — Recibir mercadería (P1)

**Goal**: confirm one atomic purchase through scanner/search with exact cost and optional stock.

**Independent Test**: receive UNIT and KG lines with Stock on/off; verify snapshots, exact totals, movements and idempotent replay.

- [x] T016 [US2] Write failing transaction, weighted-cost, revision, feature-off, idempotency and rollback tests in `tests/integration/purchases.test.ts`
- [x] T017 [US2] Implement purchase reads and transaction-bound inserts in `src/worker/purchases/repository.ts`
- [x] T018 [US2] Implement receive validation, canonical hash, snapshot creation, exact totals and idempotent replay in `src/worker/purchases/service.ts`
- [x] T019 [US2] Integrate tracked-stock preparation and `RECEIPT` movements within the purchase transaction in `src/worker/purchases/service.ts` and `src/worker/stock/repository.ts`
- [x] T020 [US2] Implement last-cost query from confirmed non-voided items in `src/worker/purchases/service.ts`
- [x] T021 [US2] Wire receive, find-by-key and last-cost operations and actor snapshots in `src/worker/application.ts`
- [x] T022 [US2] Add receive/find/cost API tests in `tests/integration/purchases-api.test.ts`, then expose routes in `src/server/app.ts`
- [x] T023 [US2] Add purchase API client methods in `src/renderer/web-client.ts`, `src/main/preload.ts`, and `src/shared/contracts.ts`
- [x] T024 [US2] Write failing add/rescan/unit/weight controller tests in `tests/unit/purchase-controller.test.ts`
- [x] T025 [US2] Implement immutable purchase draft controller with one line per product in `src/renderer/features/purchases/controller.ts`
- [x] T026 [US2] Build scanner-first responsive receiving workspace and confirmation summary in `src/renderer/features/purchases/PurchaseDraft.tsx` and `src/renderer/features/purchases/PurchaseWorkspace.tsx`

## Phase 5: User Story 3 — Borrador recuperable (P1)

**Goal**: preserve a purchase across navigation, reload and nested supplier/product creation.

**Independent Test**: save, conflict, reload, resume and cancel without stock/cost side effects.

- [x] T027 [US3] Write failing purchase-draft revision, ownership and cancel tests in `tests/integration/purchases.test.ts`
- [x] T028 [US3] Implement user-owned purchase draft get/save/cancel operations in `src/worker/purchases/repository.ts` and `src/worker/purchases/service.ts`
- [x] T029 [US3] Wire draft operations through worker, HTTP and clients in `src/worker/application.ts`, `src/server/app.ts`, `src/renderer/web-client.ts`, and `src/main/preload.ts`
- [x] T030 [US3] Implement debounced server draft writer plus local pending recovery in `src/renderer/features/purchases/pending.ts` and `tests/unit/purchase-controller.test.ts`
- [x] T031 [US3] Preserve the purchase workspace when opening supplier/product forms and surface only stale lines in `src/renderer/features/purchases/PurchaseWorkspace.tsx`

## Phase 6: User Story 4 — Histórico y corrección (P2)

**Goal**: list immutable purchases and safely void reversible receipts.

**Independent Test**: filter/detail, mutate catalog, preserve snapshots, safe void once, reject unsafe void.

- [x] T032 [US4] Write failing paging, snapshot, preview, safe/unsafe void and replay tests in `tests/integration/purchases.test.ts`
- [x] T033 [US4] Implement cursor history, immutable detail and void preview in `src/worker/purchases/repository.ts` and `src/worker/purchases/service.ts`
- [x] T034 [US4] Implement atomic void event and linked `VOID` stock movements with later-movement safety checks in `src/worker/purchases/service.ts` and `src/worker/stock/repository.ts`
- [x] T035 [US4] Wire history/detail/preview/void through worker, API and clients in `src/worker/application.ts`, `src/server/app.ts`, `src/renderer/web-client.ts`, and `src/main/preload.ts`
- [x] T036 [US4] Build responsive purchase history, detail and void dialog in `src/renderer/features/purchases/PurchaseHistory.tsx` and `src/renderer/features/purchases/PurchaseDetail.tsx`
- [x] T037 [US4] Add purchase CSV export using historical snapshots in `src/worker/operations/export.ts` and `tests/integration/purchases.test.ts`

## Phase 7: User Story 5 — Función configurable (P2)

**Goal**: enable/disable purchases without breaking other modules or losing history.

**Independent Test**: feature defaults off, direct writes rejected while off, history reachable read-only, stock independence preserved.

- [x] T038 [US5] Write failing feature lifecycle tests for disabled operations, historical access and Stock independence in `tests/integration/business-features.test.ts`
- [x] T039 [US5] Protect mutating purchase operations while allowing authorized historical access from settings in `src/domain/features.ts`, `src/worker/features/service.ts`, and `src/worker/application.ts`
- [x] T040 [US5] Add Purchases navigation, role visibility and settings historical action in `src/renderer/App.tsx` and `src/renderer/features/settings/FeaturesPanel.tsx`
- [x] T041 [US5] Update purchase help content with concise task-oriented sections in `src/renderer/features/help/HelpPage.tsx`

## Phase 8: Polish and verification

- [x] T042 Add Perla Negra/PULSE desktop and mobile styles, focus states, 44 px touch targets and no 360 px overflow in `src/renderer/styles/perla.css` and `src/renderer/styles/pulse.css`
- [x] T043 Add full web journey for supplier, restored draft, scanner, receipt and safe void at desktop/mobile viewports in `tests/web-e2e/purchases.spec.ts`
- [x] T044 Add backup/restore verification for suppliers, purchases, costs, events, stock links and feature state in `tests/integration/purchases-backup.test.ts`
- [x] T045 Add 4.000-product search and 100.000-purchase paging measurements without timing assertions on shared CI in `tests/integration/purchases.test.ts`
- [x] T046 Validate no regression in checkout hot path with purchases enabled/disabled in `tests/integration/checkout-hot-path.test.ts`
- [x] T047 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build:web`, and `npm run test:web`; record results in `specs/015-suppliers-purchases/quickstart.md`

## Dependencies

- T001–T008 block every user story.
- US1 provides suppliers used by US2.
- US2 provides confirmed purchases used by US4.
- US3 can begin after T007–T008 and shares repository/service files with US2, so execute it after US2 in one-worker mode.
- US5 depends on T001 and becomes fully testable after US2/US4.
- T042–T047 follow all selected stories.

## Parallel Opportunities

- T001, T002 and T003 affect separate files after agreeing type names.
- T009/T013 test design can proceed while shared contracts are reviewed.
- T024/T025 are client-domain work independent of transaction implementation after T002.
- T042 and T044 affect separate UI/data concerns after behavior stabilizes.

## Implementation Strategy

1. Deliver foundation and US1 as the smallest reviewable supplier increment.
2. Complete US2 and US3 to obtain a usable receiving flow.
3. Add US4 corrections before treating the module as production ready.
4. Add US5 navigation/configuration and complete cross-cutting verification.

All tasks use the existing checkout because the project contains an active, related working set. Do not discard or reset unrelated changes.
