# Tasks: Catálogo y carga inicial de productos

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: pendientes; tareas de aplicación no ejecutadas.

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: 001-desktop-core.

## Foundation

- [ ] T00201 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Administrar un producto

- [ ] T00204 [US1] Crear test `tests/unit/product-validation.test.ts` para: Parsear 12.000,50 ARS con formato de importación explícito a 1200050 centavos y mantener 0123456789012 como texto. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00205 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: products.findByBarcode, search, save, setActive, previewImport y applyImport del contrato común. Cantidad existente no es un campo editable del formulario de productos.

- [ ] T00206 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Encontrar productos rápidamente

- [ ] T00207 [US2] Crear test `tests/integration/catalog-import.test.ts` para: Un duplicado en fila 1500 revierte el lote; repetir hash aplicado no duplica productos. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00208 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: products.findByBarcode, search, save, setActive, previewImport y applyImport del contrato común. Cantidad existente no es un campo editable del formulario de productos.

- [ ] T00209 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Cargar el catálogo de forma segura

- [ ] T00210 [US3] Crear test `tests/e2e/product-search.spec.ts` para: Editar precio, desactivar y buscar código/nombre con teclado; comprobar que el inactivo desaparece de Caja. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00211 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: products.findByBarcode, search, save, setActive, previewImport y applyImport del contrato común. Cantidad existente no es un campo editable del formulario de productos.

- [ ] T00212 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00220 Verificar todos los FR-002, casos límite y metas SC-002 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [ ] T00221 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.
