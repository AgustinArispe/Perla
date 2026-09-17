# Quickstart Validation: Base de escritorio y persistencia

**Estado**: comandos disponibles y pruebas ejecutadas en desarrollo. La aceptación
de Caja y recuperación de una venta pendiente sigue abierta. [Evidencia](../../docs/entrega-01-catalogo.md).

## Prerequisites

Node 24 LTS y `npm run setup` según lockfile. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### Rechazar un canal desconocido y un payload no válido sin ejecutar SQL.
```powershell
npx vitest run tests/unit/ipc-validation.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/ipc-validation.test.ts`.
### Migrar una DB fixture; fallar a mitad y verificar rollback y versión anterior.
```powershell
npx vitest run tests/integration/migrations.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/migrations.test.ts`.
### Abrir offline dos veces con persistencia y renderer aislado.
```powershell
npm run build
npx playwright test tests/e2e/desktop-startup.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/desktop-startup.spec.ts`.

## Manual acceptance

El escritorio abre Productos en esta entrega. El escenario original de abrir
Caja y las pruebas de respuesta con worker ocupado se completarán en las siguientes entregas.

1. Abrir la caja sin internet: Caja aparece sin navegador, terminal ni configuración manual.
2. Mantener los datos entre sesiones: Los datos siguen disponibles y el esquema tiene una migración trazable.
3. Resolver un fallo sin registrar éxito falso: La app informa el fallo, conserva la operación pendiente y permite recuperación.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
