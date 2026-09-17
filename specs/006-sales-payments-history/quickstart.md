# Quickstart Validation: Ventas, medios de pago e histórico

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### Mixto 600000 tarjeta + 400000 efectivo recibido 500000 da change=100000; repartir descuento deja suma exacta.
```powershell
npx vitest run tests/unit/payment-discount.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/payment-discount.test.ts`.
### Inyectar fallo tras cabecera antes de stock: cero venta/pagos/movimientos; repetir key tras commit devuelve mismo id.
```powershell
npx vitest run tests/integration/sale-atomicity.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/sale-atomicity.test.ts`.
### Cerrar con F8, confirmar mixto, cambiar precio, filtrar histórico y anular con motivo; stock vuelve una vez.
```powershell
npx playwright test tests/e2e/sales-history.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/sales-history.spec.ts`.

## Manual acceptance

1. Cerrar una venta con forma de pago: Se registra total $10.000, vuelto $1.000 y efectivo del reporte $4.000.
2. Revisar una venta antigua: Detalle conserva el nombre, precio, cantidades y forma de pago originales.
3. Anular sin duplicar reposición: Queda anulada, conserva detalle y repone sólo una vez los movimientos originales.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
