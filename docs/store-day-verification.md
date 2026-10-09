# Verificación de jornada — 6 de octubre de 2026

La prueba `tests/web-e2e/store-day.spec.ts` opera desde tres sesiones de navegador: jefe, cajero de mañana y cajero de tarde. Utiliza la API, el worker y SQLite reales en una base temporal.

## Recorrido

1. El jefe crea la caja, los vendedores, dos productos con código de barras, el stock inicial y una promoción 3×2.
2. El primer cajero abre con $10.000, escanea tres artículos de $2.000 e ingresa 250 gramos de jamón de $10.000/kg. El total con promoción es $6.500.
3. Divide el pago en $3.250 de efectivo y $3.250 de débito. El servidor confirma la operación; se interrumpe su respuesta hacia el navegador.
4. «Consultar venta» recupera la misma operación y el comprobante. La base contiene una sola venta de ese carrito.
5. El cajero comienza otro carrito y lo cancela. El stock permanece igual.
6. Cierra con $13.240: el esperado es $13.250 y se registra un faltante de $10. Antes de guardar se prueban las vistas de faltante y sobrante.
7. El segundo cajero abre la misma terminal con $10.000 y cobra dos artículos por $4.000 en efectivo.
8. El jefe devuelve una unidad, reintegra $2.000 y repone el artículo. El segundo cajero cierra con $12.000 y sin diferencia.

## Resultado comprobado

- Dos ventas confirmadas; la pérdida de respuesta no duplica el cobro.
- Neto vendido después de la devolución: $8.500.
- Stock final: 16 unidades de arroz y 750 gramos de jamón.
- Los vendedores carecen de acceso al resumen mensual.
- Dos turnos cerrados; el primero conserva sus importes después de la devolución efectuada en el segundo.
- Diálogo de cierre revisado en PC y celular.

El dashboard se verifica también con la base de 6.277 ventas: cifras finales, barras, navegación de meses, teclado, ancho de 390 px y movimiento reducido. Las pruebas usan servidores separados de la base que se presenta al usuario.
