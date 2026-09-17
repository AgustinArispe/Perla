# Data Model: Catálogo y carga inicial de productos

products e import_batches. SKU, barcode y revision únicos/validados. Stock inicial usa servicio de inventario de 003 dentro de la misma transacción; sin 003 sólo cargar catálogo sin cantidades.

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
