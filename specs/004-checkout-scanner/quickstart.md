# Quickstart Validation: Caja rápida y scanner USB

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### Simular resoluciones invertidas: el orden de captura queda preservado y el código repetido suma legítimamente.
```powershell
npx vitest run tests/unit/scan-queue.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/scan-queue.test.ts`.
### Guardar revisión, rechazar stale write y recuperar sin crear una venta ni movimiento.
```powershell
npx vitest run tests/integration/checkout-draft.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/checkout-draft.test.ts`.
### Escanear 100 lecturas, editar cantidad, abrir descuento y cerrar con Esc; Enter de captura no pulsa Finalizar venta.
```powershell
npx playwright test tests/e2e/scanner-focus.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/scanner-focus.spec.ts`.

## Manual acceptance

1. Agregar productos con scanner: Se muestra cantidad cinco y total correcto; foco vuelve al escáner.
2. Corregir una venta sin perderse: Subtotal, descuento y total cambian; al salir de edición el foco vuelve a escaneo.
3. Recuperar una operación pendiente: Se ofrece recuperarlo o descartarlo, sin cobro ni cambio de stock.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
