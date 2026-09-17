# Data Model: Stock, ingresos y ajustes

inventory_balances y stock_movements. quantity_base firmado. OPENING parte de un estado desconocido; recount produce ADJUSTMENT con diferencia. Tracking no elimina ledger.

La migración 003 agrega saldo, revisión, secuencia de movimientos, resultado por
operationKey/hash y fecha comercial argentina. OPENING/ADJUSTMENT admiten delta
cero para conservar evidencia del conteo. Las referencias FK a ventas se agregan
cuando existan sales/sale_items en 006. Hasta entonces no se generan SALE/VOID.

## Common invariants

[Modelo de datos completo](../../docs/modelo-datos.md). Precio y pagos en centavos
enteros, peso en gramos, código como texto. Foreign keys activas. Ninguna operación
del renderer puede eludir las reglas de servicio/validación. No cambiar la unidad
de un producto ya utilizado. ID UUID interno y número correlativo visible para ventas.

## State transitions

Producto: active/inactive. Inventario: desconocido -> conteo real -> balance con
movimientos. Carrito: borrador -> confirmación pendiente -> venta COMPLETED o error
recuperable. Venta: COMPLETED -> VOIDED con motivo; no borrado ni segunda reposición.
Backup: staging -> validado -> archivo final; restore bloquea escrituras y permite rollback.
Aplicar sólo las transiciones que corresponden a esta feature.
