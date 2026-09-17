# Data Model: Base de escritorio y persistencia

schema_migrations, app_settings y checkout_drafts. UUID internos, números de venta visibles correlativos. Guardar ruta estable userData; DB no se mueve por instalar.

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
