# Quickstart Validation: Stock, ingresos y ajustes

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### Convertir 2,500 kg a 2500 g; rechazar fracción de unidades y cero en merma.
```powershell
npx vitest run tests/unit/stock-units.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/stock-units.test.ts`.
### Apertura 3000, recepción 2000 y merma -100 resultan 4900; fallo SQL revierte balance y movimiento.
```powershell
npx vitest run tests/integration/stock-ledger.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/stock-ledger.test.ts`.
### Registrar conteo, reposición y mínimo; verificar alertas distintas para desconocido, agotado y bajo mínimo.
```powershell
npx playwright test tests/e2e/stock-count.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/stock-count.spec.ts`.

## Manual acceptance

1. Comenzar con un conteo real: Se muestra balance 10 y queda un movimiento de apertura.
2. Registrar mercadería y correcciones: El balance pasa a 4.900 g con ambos motivos visibles.
3. Identificar faltantes para reponer: Aparece con existencia, mínimo y unidad; desconocidos se muestran por separado.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
