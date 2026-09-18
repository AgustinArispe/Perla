# Tasks

Plan histórico de escritorio. Estas tareas no gobiernan la entrega web: backup y recuperación se cierran en [011](../011-web-backup-recovery/tasks.md), despliegue en [010](../010-web-api-security/tasks.md). Los checkboxes históricos no se completan sin evidencia de su implementación de escritorio.
: Backups, instalación y mantenimiento

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: pendientes; tareas de aplicación no ejecutadas.

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: 001-desktop-core, 002-product-catalog, 003-stock-ledger, 006-sales-payments-history, 007-monthly-dashboard.

## Foundation

- [ ] T00801 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Guardar un respaldo externo

- [ ] T00804 [US1] Crear test `tests/unit/backup-manifest.test.ts` para: Rechazar hash alterado y schema superior; nombre de entrada ZIP no puede escapar del staging. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00805 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: backups.create, inspectRestore y restore. previewToken ligado al hash del archivo; restore no recibe una ruta arbitraria del renderer.

- [ ] T00806 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Recuperar la información

- [ ] T00807 [US2] Crear test `tests/integration/backup-restore.test.ts` para: Generar snapshot con WAL activo, restaurar y conciliar todas las tablas; simular fallo al reabrir y recuperar previo. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00808 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: backups.create, inspectRestore y restore. previewToken ligado al hash del archivo; restore no recibe una ruta arbitraria del renderer.

- [ ] T00809 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Instalar y actualizar sin perder datos

- [ ] T00810 [US3] Crear test `tests/e2e/installed-app.spec.ts` para: Instalar, vender offline, actualizar y abrir histórico en máquina limpia; validar scanner físico y backup externo. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00811 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: backups.create, inspectRestore y restore. previewToken ligado al hash del archivo; restore no recibe una ruta arbitraria del renderer.

- [ ] T00812 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00820 Verificar todos los FR-008, casos límite y metas SC-008 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [ ] T00821 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.
