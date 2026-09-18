# Tasks: Fiambres y calculadora de peso

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: cálculo y diálogo de peso conectados; aceptación de todas las historias pendiente. [Evidencia](../../docs/entrega-05-caja-historico.md).

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: 002-product-catalog, 003-stock-ledger, 004-checkout-scanner.

## Foundation

- [x] T00501 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Cobrar una porción por su peso

- [ ] T00504 [US1] Crear test `tests/unit/weighted-price.test.ts` para: 12345 centavos/kg por 333 g redondea a 4111 centavos; 1200000 por 250 g resulta 300000. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00505 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: calculateWeightedPrice(priceCentsPerKg:number, grams:number): number; parseWeight(input:string, unit:"g"|"kg"): number o error; resultado es cantidad base para SaleLineInput.

- [ ] T00506 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Corregir porciones por separado

- [ ] T00507 [US2] Crear test `tests/integration/weighted-stock.test.ts` para: Venta con dos porciones 250+180 reduce 430 g; anulación devuelve exactamente 430 una vez. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00508 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: calculateWeightedPrice(priceCentsPerKg:number, grams:number): number; parseWeight(input:string, unit:"g"|"kg"): number o error; resultado es cantidad base para SaleLineInput.

- [ ] T00509 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Ingresar kilos sin ambigüedad

- [ ] T00510 [US3] Crear test `tests/e2e/weight-dialog.spec.ts` para: Ingresar 0,250 kg, agregar una segunda porción, corregirla y cancelar una tercera sin tocar carrito. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [x] T00511 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: calculateWeightedPrice(priceCentsPerKg:number, grams:number): number; parseWeight(input:string, unit:"g"|"kg"): number o error; resultado es cantidad base para SaleLineInput.

- [ ] T00512 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00520 Verificar todos los FR-005, casos límite y metas SC-005 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [x] T00521 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.
