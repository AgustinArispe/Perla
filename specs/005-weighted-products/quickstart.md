# Quickstart Validation: Fiambres y calculadora de peso

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### 12345 centavos/kg por 333 g redondea a 4111 centavos; 1200000 por 250 g resulta 300000.
```powershell
npx vitest run tests/unit/weighted-price.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/weighted-price.test.ts`.
### Venta con dos porciones 250+180 reduce 430 g; anulación devuelve exactamente 430 una vez.
```powershell
npx vitest run tests/integration/weighted-stock.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/weighted-stock.test.ts`.
### Ingresar 0,250 kg, agregar una segunda porción, corregirla y cancelar una tercera sin tocar carrito.
```powershell
npx playwright test tests/e2e/weight-dialog.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/weight-dialog.spec.ts`.

## Manual acceptance

1. Cobrar una porción por su peso: La porción cuesta $3.000 y al confirmar la venta descuenta 250 g.
2. Corregir porciones por separado: Quedan líneas de 250 g y 200 g con sus importes recalculados.
3. Ingresar kilos sin ambigüedad: Se interpreta como 250 g; la pantalla muestra unidad e importe antes de agregar.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
