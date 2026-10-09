# Research: Proveedores y compras

## Recepción frente a orden de compra

**Decision**: modelar únicamente mercadería recibida y pagada.

**Rationale**: coincide con la operación de un comercio pequeño y permite que confirmar tenga un efecto físico inequívoco.

**Alternatives considered**: orden + recepción + factura se descartó en esta etapa porque introduce estados, parciales y conciliación que no aportan al primer uso.

## Idempotencia

**Decision**: clave UUID por recepción o anulación, acompañada por hash canónico del payload y resultado persistido.

**Rationale**: replica el patrón probado de ventas y stock; una pérdida de respuesta puede consultarse o reintentarse sin duplicar.

**Alternatives considered**: deduplicar por proveedor/fecha/total daría falsos positivos; confiar en el botón del navegador no protege la API.

## Costo de productos por peso

**Decision**: almacenar costo unitario por unidad de venta. Para `KG`, la cantidad sigue expresada en gramos y el subtotal usa redondeo entero de `costCentsPerKg * grams / 1000`.

**Rationale**: coincide con ventas por peso y evita floats.

**Alternatives considered**: costo por gramo produce números poco legibles; decimales en base de datos violan la constitución.

## Costos históricos

**Decision**: la fuente histórica es `purchase_items`; el último costo es una consulta indexada.

**Rationale**: evita duplicar estado y permite explicar cada costo con su compra de origen.

**Alternatives considered**: sobrescribir `products.last_cost` pierde contexto y exige sincronización adicional.

## Integración de stock

**Decision**: extender el ledger actual con referencias opcionales a compra y renglón, manteniendo `RECEIPT` y `VOID`.

**Rationale**: preserva saldo conciliable y evita un segundo sistema de existencias.

**Alternatives considered**: actualizar balances sin movimientos rompe auditoría; un ledger separado complica reportes y restore.

## Anulación

**Decision**: permitir reversión automática sólo si el saldo alcanza y no existe un conteo/ajuste posterior que invalide la relación causal.

**Rationale**: una recepción antigua pudo ser vendida o conciliada; restarla ciegamente crea saldos falsos.

**Alternatives considered**: permitir negativos con confirmación se descartó para la primera versión; borrar la compra viola trazabilidad.

## Persistencia de borrador

**Decision**: servidor como fuente recuperable, con revisión optimista y respaldo local temporal en el navegador para fallas de red.

**Rationale**: permite retomar entre recargas y evita que dos pestañas se sobrescriban silenciosamente.

**Alternatives considered**: sólo almacenamiento del navegador no acompaña cambio de dispositivo; guardar cada tecla sin espera aumenta carga.

## API y seguridad

**Decision**: rutas del mismo origen bajo `/api/v1`, contratos Zod estrictos, cookies existentes, CSRF y autorización por operación.

**Rationale**: mantiene el perímetro de seguridad ya probado.

**Alternatives considered**: rutas públicas o tokens en almacenamiento del navegador contradicen la constitución.
