# Tasks: Stock, ingresos y ajustes

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: pendientes; tareas de aplicación no ejecutadas.

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: 001-desktop-core, 002-product-catalog.

## Foundation

- [ ] T00301 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Comenzar con un conteo real

- [ ] T00304 [US1] Crear test `tests/unit/stock-units.test.ts` para: Convertir 2,500 kg a 2500 g; rechazar fracción de unidades y cero en merma. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00305 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: stock.opening, record, count, listLow y movements. Servicio interno aplica movimientos dentro de una transacción provista por sales.complete; no inicia una segunda transacción independiente.

- [ ] T00306 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Registrar mercadería y correcciones

- [ ] T00307 [US2] Crear test `tests/integration/stock-ledger.test.ts` para: Apertura 3000, recepción 2000 y merma -100 resultan 4900; fallo SQL revierte balance y movimiento. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00308 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: stock.opening, record, count, listLow y movements. Servicio interno aplica movimientos dentro de una transacción provista por sales.complete; no inicia una segunda transacción independiente.

- [ ] T00309 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Identificar faltantes para reponer

- [ ] T00310 [US3] Crear test `tests/e2e/stock-count.spec.ts` para: Registrar conteo, reposición y mínimo; verificar alertas distintas para desconocido, agotado y bajo mínimo. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00311 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: stock.opening, record, count, listLow y movements. Servicio interno aplica movimientos dentro de una transacción provista por sales.complete; no inicia una segunda transacción independiente.

- [ ] T00312 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00320 Verificar todos los FR-003, casos límite y metas SC-003 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [ ] T00321 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.
