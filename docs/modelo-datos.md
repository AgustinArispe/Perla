# Modelo de datos y reglas comunes

SQL / SQLite. Diseño, no migración ejecutada. Importes en centavos y cantidades
base enteras; validar `Number.isSafeInteger` en contratos. Intermedios de cálculo
con BigInt para evitar desbordamiento; DTOs JSON entregan number seguros.

## Tablas

| Tabla | Campos esenciales y restricciones |
|---|---|
| schema_migrations | version PK, checksum, applied_at_utc |
| products | id PK, sku TEXT UNIQUE NOT NULL, barcode TEXT UNIQUE nullable, name, category nullable, sale_unit UNIT/KG, price_cents > 0, active, track_stock, stock_initialized, min_stock_base >= 0, revision, created_at_utc, updated_at_utc |
| inventory_balances | product_id PK/FK, quantity_base signed INTEGER, revision |
| stock_movements | id PK, product_id FK, delta_base signed != 0, kind OPENING/RECEIPT/SALE/WASTE/ADJUSTMENT/VOID, reason, sale_id nullable FK, sale_item_id nullable FK, operation_key UNIQUE, created_at_utc |
| sales | id UUID PK, number INTEGER UNIQUE NOT NULL, checkout_key UNIQUE, payload_hash, completed_at_utc, business_date TEXT YYYY-MM-DD, local_month TEXT YYYY-MM, status COMPLETED/VOIDED, subtotal_cents, discount_type NONE/PERCENT/FIXED, discount_value INTEGER, discount_cents, total_cents, voided_at_utc nullable, void_reason nullable |
| sale_items | id PK, sale_id FK, line_no, product_id FK, barcode_snapshot nullable, sku_snapshot, name_snapshot, unit_snapshot UNIT/KG, unit_price_cents, quantity_base > 0, gross_cents, allocated_discount_cents, net_cents; UNIQUE(sale_id,line_no) |
| sale_payments | id PK, sale_id FK, method CASH/DEBIT/CREDIT/TRANSFER/OTHER, amount_cents > 0, tendered_cents nullable, change_cents nullable |
| sale_events | id PK, sale_id FK, kind COMPLETE/VOID, operation_key UNIQUE, reason nullable, created_at_utc |
| checkout_drafts | id PK (caja principal), revision, body_json, updated_at_utc |
| app_settings | key TEXT PK, value_json, updated_at_utc |
| import_batches | id PK, source_name, source_hash, status APPLIED, rows_applied, created_at_utc |
| backup_runs | id PK, destination, status SUCCESS/FAILED, schema_version, file_hash nullable, started_at_utc, completed_at_utc nullable, error_code nullable |

FKs RESTRICT para products/sales/sale_items: no borrar catálogo vendido; inactivar.
El número visible de venta se asigna dentro de la misma transacción de cierre;
UUID y checkout_key identifican el reintento sin consumir dos números de venta.
Stock no tiene cantidades decimales. UNIT: 1 base = 1 artículo; KG: 1 base = 1 g.
Precio KG expresa el valor de 1 kg, no el de 1 g. sku permite fiambres sin barcode.
Productos físicos nuevos: track_stock=true y stock_initialized=false. Importar
catálogo sin cantidades nunca marca existencias como cero confirmado. Sin conteo
inicial, stock se muestra como desconocido y ventas no descuentan ese producto;
al iniciar control, OPENING fija el conteo de ese momento, sin reconstruir ventas
pasadas. Desactivar tracking conserva movimientos; reactivarlo requiere nuevo
conteo que concilie el balance. Cambiar UNIT/KG luego de usarlo no se permite:
crear nuevo producto para no mezclar unidades.

## Reglas monetarias

- UNIT: gross = precio_centavos × cantidad_unidades.
- KG: gross = round_half_up(precio_centavos_por_kg × gramos / 1000).
- Porcentaje expresado en basis points: 10% = 1000; rango 0..10000.
- FIXED guarda centavos; PERCENT guarda basis points en discount_value.
- subtotal = suma gross de líneas; descuento = round_half_up(subtotal × bp / 10000)
  o monto fijo. Rechazar descuento mayor al subtotal, no aplicar silently un cap.
- Distribuir descuento por línea proporcional a gross: truncar y asignar centavos
  restantes por mayor resto, empate por line_no. suma net_cents = total.
- Total cero: venta registrada con cero pagos; no aceptar efectivo ficticio.
- Ejemplo: jamón a $12.000/kg, 250 g = $3.000 = 300000 centavos y stock -250 g.
- Ejemplo redondeo: 12345 centavos/kg × 333 g = 4110,885 centavos -> 4111.

## Pagos

Suma de amount_cents = total_cents. El efectivo recibido y vuelto no forman parte
de esa suma. Venta $10.000: tarjeta $6.000 + efectivo aplicado $4.000, recibido
$5.000, vuelto $1.000. Dashboard efectivo = $4.000. Registrar un pago no procesa
tarjetas: el cajero confirma éxito en el dispositivo externo antes de cerrar.
Default CASH visible; debe poder cambiarse con teclado. Sin comisiones ni margen.

## Stock, venta y anulación

Una transacción BEGIN IMMEDIATE revalida activos, precio/revisión y stock, crea
venta, snapshots, pagos, eventos y movimientos de inventario, actualiza balance
y elimina draft. Sólo después de commit se limpia el carrito. Error revierte todo.
Precio cambiado desde el carrito: mostrar diferencias y exigir aceptar/recalcular
antes de confirmar; no modificar el cobro silenciosamente.

Carrito no reserva stock. Con tracking inicializado se descuenta sólo al confirmar.
Si insuficiente: advertencia y decisión explícita CONTINUE_WITH_NEGATIVE_STOCK con
motivo; preservar el faltante en movimiento y balance. No aprobación implícita.
No inicializado: mensaje discreto, no alerta de falta. Recepción/merma/ajuste
tienen operation_key para que doble clic no duplique existencias.

checkout_key estable por intento y payload_hash del contenido: mismo key + mismo
contenido devuelve venta existente; diferente contenido devuelve conflicto. Un
resultado desconocido tras caída se consulta por key antes de un nuevo cobro.
Anulación completa requiere motivo y reversión de los movimientos originales
SALE; no inferir stock desde configuración actual. Si el producto fue contado
después de esa venta, advertir que hay que corregir el conteo actual. Nueva
anulación de la misma venta no repone otra vez. Reembolso se resuelve fuera del
sistema. No borrado físico ni devoluciones parciales en esta versión.

## Índices y consultas

products(barcode) UNIQUE, products(sku) UNIQUE, products(active,name);
sales(business_date,status), sales(local_month,status);
sale_items(sale_id,line_no), sale_items(product_id,sale_id);
sale_payments(sale_id,method); stock_movements(product_id,created_at_utc).
Además UNIQUE(sale_item_id,kind) para movimientos SALE/VOID, cuando hay line item,
mediante índice parcial. Restricciones CHECK en enteros, enum y flags.

## Fechas e informes

Guardar UTC ISO 8601 y fecha comercial calculada con America/Argentina/Buenos_Aires
al confirmar, no con timezone de Windows. Intervalos de fecha local inclusivos en
UI y semántica [desde, día_siguiente_hasta) al consultar timestamps. Monthly usa
local_month, no substring de UTC. Comparación con mes anterior: meses completos
si cerrado; mes abierto contra mismos días calendario, truncados al último día
del anterior. Mostrar rango comparado. Base cero: sin base de comparación.

Netos comerciales excluyen VOIDED según fecha original de venta; al anular, los
reportes de ese mes se recalculan. Mostrar aviso de anulaciones y monto anulado.
No equivale a conciliación bancaria. Stock bajo es estado ACTUAL aunque se mire
un mes anterior; el rótulo lo explicita. Productos inactivos conservan sus ventas.
