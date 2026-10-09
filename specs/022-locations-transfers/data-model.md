# Modelo de datos

- `locations`: nombre, código, estado y marca de ubicación principal.
- `terminal_locations`: asignación vigente de cada terminal.
- `location_inventory_balances`: saldo y revisión por producto/ubicación.
- `stock_transfers`: cabecera, origen, destino, estado, claves idempotentes, responsables y fechas.
- `stock_transfer_items`: producto, unidad, cantidad despachada/recibida, diferencia y costo fotografiado.
- `stock_transfer_events`: historial inmutable de despacho, recepción y cancelación.

`inventory_balances` continúa como total disponible consolidado. Durante tránsito la mercadería no forma parte de ese total; vuelve al total al recibirse o cancelarse.
