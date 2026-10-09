# Data model: Stock, lotes y devoluciones

## Sale return

- cabecera: venta, número, estado, motivo, actor, fecha, clave y hash idempotentes.
- ítems: renglón original, cantidad, neto reintegrado, costo revertido y destino físico.
- reintegros: medio, importe, turno y movimiento de caja opcional.
- eventos: confirmación o anulación correctiva, nunca edición destructiva.

## Lot

- producto, código interno, referencia externa, recepción, vencimiento, estado y saldo.
- movimientos append-only: recepción, venta, devolución, merma, conteo y corrección.
- asignación histórica por renglón de venta para reponer o descartar el lote correcto.

## Invariants

- cantidad devuelta acumulada <= cantidad vendida.
- importe reintegrado acumulado <= neto vendido.
- costo devuelto acumulado <= costo histórico conocido.
- lote disponible requiere saldo positivo, estado activo y vencimiento no anterior a la fecha operativa.
- producto reconciliado: balance global = suma de saldos de lote.
