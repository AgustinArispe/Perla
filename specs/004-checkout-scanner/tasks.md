# Tasks: Caja rápida y scanner USB

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: Caja conectada; aceptación integral en PC y scanner físicos pendiente. [Evidencia](../../docs/entrega-05-caja-historico.md).

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: 001-desktop-core, 002-product-catalog, 003-stock-ledger.

## Foundation

- [x] T00401 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Agregar productos con scanner

- [x] T00404 [US1] Crear test `tests/unit/scan-queue.test.ts` para: Simular resoluciones invertidas: el orden de captura queda preservado y el código repetido suma legítimamente. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00405 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: products.findByBarcode y search; checkout.saveDraft/getDraft; handoff a sales.complete en 006. Cola usa orden de captura y puede detenerse ante entrada de peso.

- [ ] T00406 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Corregir una venta sin perderse

- [ ] T00407 [US2] Crear test `tests/integration/checkout-draft.test.ts` para: Guardar revisión, rechazar stale write y recuperar sin crear una venta ni movimiento. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00408 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: products.findByBarcode y search; checkout.saveDraft/getDraft; handoff a sales.complete en 006. Cola usa orden de captura y puede detenerse ante entrada de peso.

- [ ] T00409 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Recuperar una operación pendiente

- [ ] T00410 [US3] Crear test `tests/e2e/scanner-focus.spec.ts` para: Escanear 100 lecturas, editar cantidad, abrir descuento y cerrar con Esc; Enter de captura no pulsa Finalizar venta. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00411 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: products.findByBarcode y search; checkout.saveDraft/getDraft; handoff a sales.complete en 006. Cola usa orden de captura y puede detenerse ante entrada de peso.

- [ ] T00412 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00420 Verificar todos los FR-004, casos límite y metas SC-004 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [x] T00421 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.
