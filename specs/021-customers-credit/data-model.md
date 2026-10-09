# Modelo de datos

- `customers`: contacto, estado, autorización y límite.
- `customer_receivables`: deuda original y saldo de cada venta.
- `customer_collections`: cobros idempotentes.
- `customer_collection_allocations`: aplicación FIFO del cobro a ventas.
- `sales.customer_id/customer_name/on_account_cents`: fotografía histórica.
- `register_movements.customer_collection_id`: vínculo con efectivo de caja.
