# Quickstart Validation: Dashboard mensual y ayuda para reposición

**Estado**: implementación y pruebas disponibles; ver entrega-06 para evidencia y límites.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### Mes actual compara mismos días del mes anterior; febrero trunca último día y base cero responde sin porcentaje.
```powershell
npm test -- tests/unit/month-boundaries.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/month-boundaries.test.ts`.
### Fixture mixto y anulado: métodos y netos de productos concilian; KG y UNIT van separados.
```powershell
npm test -- tests/integration/monthly-reconciliation.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/monthly-reconciliation.test.ts`.
### Cambiar mes, abrir vacío y revisar rótulo Stock actual; completar/anular una venta invalida el resumen.
```powershell
npx playwright test tests/e2e/monthly-dashboard.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/monthly-dashboard.spec.ts`.

## Manual acceptance

1. Ver cómo fue el mes: Total neto excluye anuladas y muestra monto/cantidad anulado por separado.
2. Comparar formas de pago y productos: Tarjeta agrupa débito/crédito por importe; unidades y kilos tienen rankings distintos.
3. Decidir qué reponer: Se explica existencia actual, mínimo y ventas, sin prometer una compra óptima.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
