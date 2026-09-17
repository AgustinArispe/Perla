# Quickstart Validation: Stock, ingresos y ajustes

**Estado**: pruebas de inventario implementadas y ejecutadas. [Evidencia](../../docs/entrega-02-stock.md).

## Prerequisites

Base y catálogo disponibles, Node 24 LTS y `npm run setup` según lockfile.
Usar DB temporal de pruebas, nunca la DB real del comercio.
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

Ejecutar `npm run build` antes de Playwright, o `npm run test:e2e` para build y suite.
Las ventas y anulaciones aún no están implementadas; sus movimientos se validarán
con 006, sin marcar la aceptación completa de Stock antes de esa integración.

1. Comenzar con un conteo real: Se muestra balance 10 y queda un movimiento de apertura.
2. Registrar mercadería y correcciones: El balance pasa a 4.900 g con ambos motivos visibles.
3. Identificar faltantes para reponer: Aparece con existencia, mínimo y unidad; desconocidos se muestran por separado.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
