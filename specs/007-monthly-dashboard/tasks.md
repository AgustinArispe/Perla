# Tasks: Dashboard mensual y ayuda para reposición

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: backend y pantalla conectados; aceptación en PC del cliente pendiente. [Evidencia](../../docs/entrega-06-resumen-mensual.md).

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: 002-product-catalog, 003-stock-ledger, 006-sales-payments-history.

## Foundation

- [x] T00701 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Ver cómo fue el mes

- [x] T00704 [US1] Crear test `tests/unit/month-boundaries.test.ts` para: Mes actual compara mismos días del mes anterior; febrero trunca último día y base cero responde sin porcentaje. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00705 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: dashboard.monthly(month:string): MonthlyReport según docs/contratos.md. Búsqueda sobre business_date/local_month, no fechas UTC truncadas.

- [x] T00706 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Comparar formas de pago y productos

- [x] T00707 [US2] Crear test `tests/integration/monthly-reconciliation.test.ts` para: Fixture mixto y anulado: métodos y netos de productos concilian; KG y UNIT van separados. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00708 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: dashboard.monthly(month:string): MonthlyReport según docs/contratos.md. Búsqueda sobre business_date/local_month, no fechas UTC truncadas.

- [x] T00709 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Decidir qué reponer

- [x] T00710 [US3] Crear test `tests/e2e/monthly-dashboard.spec.ts` para: Cambiar mes, abrir vacío y revisar rótulo Stock actual; completar/anular una venta invalida el resumen. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00711 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: dashboard.monthly(month:string): MonthlyReport según docs/contratos.md. Búsqueda sobre business_date/local_month, no fechas UTC truncadas.

- [x] T00712 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00720 Verificar todos los FR-007, casos límite y metas SC-007 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [x] T00721 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.

Evidencia: entrega-06. Backend + UI comprobados con 76 tests, Docker y 9 recorridos de la versión empaquetada. T00720 permanece abierta por aceptación completa y hardware del cliente; el benchmark de 100.000 ventas corresponde a la PC de desarrollo.
