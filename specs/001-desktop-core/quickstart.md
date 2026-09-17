# Quickstart Validation: Base de escritorio y persistencia

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
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
### Abrir offline dos veces y verificar una ventana; render sigue respondiendo con worker ocupado.
```powershell
npx playwright test tests/e2e/desktop-startup.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/desktop-startup.spec.ts`.

## Manual acceptance

1. Abrir la caja sin internet: Caja aparece sin navegador, terminal ni configuración manual.
2. Mantener los datos entre sesiones: Los datos siguen disponibles y el esquema tiene una migración trazable.
3. Resolver un fallo sin registrar éxito falso: La app informa el fallo, conserva la operación pendiente y permite recuperación.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
