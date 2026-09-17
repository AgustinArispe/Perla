# Tasks: Base de escritorio y persistencia

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Estado**: scaffold y entorno preparados el 2026-09-17. Las tareas de aceptación
de esta feature siguen pendientes; ninguna se considera completa por el setup.

[Entorno y comandos implementados](../../docs/entorno-desarrollo.md): Docker,
React/Electron/TypeScript, health IPC, SQLite en worker y migración inicial de
configuración. Se verificará la feature completa con los escenarios de esta spec.

## Global Constraints

Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: ninguna.

## Foundation

- [ ] T00101 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.

## User Story 1: Abrir la caja sin internet

- [ ] T00104 [US1] Crear test `tests/unit/ipc-validation.test.ts` para: Rechazar un canal desconocido y un payload no válido sin ejecutar SQL. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00105 [US1] Implementar el comportamiento en los archivos de plan.md; contrato: system.health(): versión de app, versión de esquema y estado del worker. Todas las operaciones usan el Result común y validan el emisor IPC.

- [ ] T00106 [US1] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US1, y crear commit local por comportamiento probado.

## User Story 2: Mantener los datos entre sesiones

- [ ] T00107 [US2] Crear test `tests/integration/migrations.test.ts` para: Migrar una DB fixture; fallar a mitad y verificar rollback y versión anterior. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00108 [US2] Implementar el comportamiento en los archivos de plan.md; contrato: system.health(): versión de app, versión de esquema y estado del worker. Todas las operaciones usan el Result común y validan el emisor IPC.

- [ ] T00109 [US2] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US2, y crear commit local por comportamiento probado.

## User Story 3: Resolver un fallo sin registrar éxito falso

- [ ] T00110 [US3] Crear test `tests/e2e/desktop-startup.spec.ts` para: Abrir offline dos veces y verificar una ventana; render sigue respondiendo con worker ocupado. Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.

- [ ] T00111 [US3] Implementar el comportamiento en los archivos de plan.md; contrato: system.health(): versión de app, versión de esquema y estado del worker. Todas las operaciones usan el Result común y validan el emisor IPC.

- [ ] T00112 [US3] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US3, y crear commit local por comportamiento probado.

## Integration and acceptance

- [ ] T00120 Verificar todos los FR-001, casos límite y metas SC-001 de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.

- [ ] T00121 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.

## Dependencies and sequencing

Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.

## Acceptance evidence

Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.
