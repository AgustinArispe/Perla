# Tasks: Ventas, medios de pago e histórico

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: backend implementado; UI y aceptación completa pendientes. [Evidencia](../../docs/entrega-03-backend-ventas.md).

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: 001-desktop-core, 002-product-catalog, 003-stock-ledger, 004-checkout-scanner, 005-weighted-products.

## Foundation

- [x] T00601 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Cerrar una venta con forma de pago

- [x] T00604 [US1] Crear test `tests/unit/payment-discount.test.ts` para: Mixto 600000 tarjeta + 400000 efectivo recibido 500000 da change=100000; repartir descuento deja suma exacta. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00605 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: sales.complete(CheckoutInput), findByCheckoutKey, list, detail y void. complete devuelve SaleDetail y errores recuperables; genera discount allocations y change en el worker.

- [ ] T00606 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Revisar una venta antigua

- [x] T00607 [US2] Crear test `tests/integration/sale-atomicity.test.ts` para: Inyectar fallo tras cabecera antes de stock: cero venta/pagos/movimientos; repetir key tras commit devuelve mismo id. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00608 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: sales.complete(CheckoutInput), findByCheckoutKey, list, detail y void. complete devuelve SaleDetail y errores recuperables; genera discount allocations y change en el worker.

- [ ] T00609 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Anular sin duplicar reposición

- [ ] T00610 [US3] Crear test `tests/e2e/sales-history.spec.ts` para: Cerrar con F8, confirmar mixto, cambiar precio, filtrar histórico y anular con motivo; stock vuelve una vez. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00611 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: sales.complete(CheckoutInput), findByCheckoutKey, list, detail y void. complete devuelve SaleDetail y errores recuperables; genera discount allocations y change en el worker.

- [ ] T00612 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00620 Verificar todos los FR-006, casos límite y metas SC-006 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [x] T00621 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.

Incremento backend: T00601/04/05/07/08/21 comprobadas con fixtures, RPC y revisión
de migración/reintentos. Las tareas de aceptación por historia y T00611 permanecen
abiertas hasta integrar las pantallas; su parte transaccional de anulación ya está
probada en `sale-atomicity.test.ts` y `sales-backend.spec.ts`.
