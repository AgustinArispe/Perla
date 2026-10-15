# Revisión del esquema y consultas — 15/10/2026

La versión 30 tenía 86 tablas propias. Se revisaron las referencias del código,
claves foráneas, escrituras, consultas y migraciones. La versión 31 deja **84
tablas propias**, además de `sqlite_sequence`, interna de SQLite.

## Cambios aplicados

| Tabla anterior          | Decisión y destino de los datos                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace_preferences` | Integrada en `users.start_module`: un atributo opcional por usuario. Se conserva la diferencia entre no haber elegido y haber elegido una página.                                             |
| `printer_profiles`      | Retirada: ningún flujo de la aplicación la consulta o modifica. Los perfiles históricos, si existen, se conservan completos como JSON en `app_settings`, bajo `legacy.printer_profiles.<id>`. |

La migración corre dentro de una transacción. Una colisión de claves al archivar
aborta y revierte toda la migración. El arranque sobre una base persistente crea
primero el respaldo verificado habitual en `migration-backups/before-v31-*.sqlite`.
Ese respaldo conserva las tablas originales. No se borran perfiles históricos.
Para volver al software anterior se necesita restaurar su base respaldada: no se
debe abrir una base v31 con un ejecutable que sólo entiende v30.

La preferencia sigue siendo privada por usuario y mantiene los permisos de página
inicial. Cambiarla no incrementa la revisión de autenticación ni cierra sesiones.
Las inserciones de usuarios ahora nombran sus columnas explícitamente para que
añadir atributos opcionales no rompa la creación de cuentas o la CLI.

## Tablas que tienen una función vigente

El resto tiene lectores, escritores o responsabilidades de persistencia. Las
tablas de estado y las de historial no son intercambiables. Tampoco lo son las
cabeceras, sus líneas, pagos e imputaciones.

| Grupo                  | Tablas revisadas que se conservan                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sistema y usuarios     | `schema_migrations`, `app_settings`, `users`, `auth_sessions`, `auth_attempts`, `audit_events`, `business_settings`, `business_features`, `terminals`, `terminal_locations`, `saved_views`, `notification_reads` |
| Catálogo               | `products`, `product_categories`, `product_brands`, `barcode_sequences`, `product_labels`, `import_batches`                                                                                                      |
| Ventas y caja          | `sales`, `sale_items`, `sale_payments`, `sale_events`, `checkout_drafts`, `register_shifts`, `register_movements`, `sale_receipts`, `sale_promotions`, `sale_promotion_allocations`                              |
| Devoluciones           | `sale_returns`, `sale_return_items`, `sale_return_refunds`, `sale_return_events`                                                                                                                                 |
| Stock y ubicaciones    | `inventory_balances`, `stock_movements`, `locations`, `location_inventory_balances`                                                                                                                              |
| Lotes                  | `lot_product_settings`, `inventory_lots`, `lot_operations`, `lot_movements`, `sale_item_lots`, `sale_return_item_lots`, `location_lot_balances`                                                                  |
| Traslados              | `stock_transfers`, `stock_transfer_items`, `stock_transfer_events`, `stock_transfer_item_lots`                                                                                                                   |
| Compras                | `suppliers`, `purchase_drafts`, `purchases`, `purchase_items`, `purchase_events`                                                                                                                                 |
| Costos y precios       | `product_cost_states`, `product_cost_events`, `price_change_previews`, `price_change_batches`, `price_change_items`, `promotions`, `commercial_settings`, `commercial_price_events`, `commercial_price_reviews`  |
| Clientes y cobros      | `customers`, `customer_receivables`, `customer_collections`, `customer_collection_allocations`, `customer_credits`                                                                                               |
| Cuentas de proveedores | `supplier_payables`, `supplier_payments`, `supplier_payment_allocations`, `supplier_credits`                                                                                                                     |
| Reposición             | `replenishment_calendars`, `replenishment_product_rules`, `replenishment_orders`, `replenishment_order_lines`, `replenishment_events`, `replenishment_receipts`                                                  |
| Control e historial    | `control_count_sessions`, `control_count_lines`, `control_operation_results`, `control_cash_reviews`, `control_cash_review_history`, `control_due_history`, `weekly_snapshots`, `control_audit_details`          |

`app_settings` no tenía uso operativo fuera del esquema; se conserva por datos
legacy y como destino explícito de los perfiles retirados. No almacena ventas ni
saldos. `inventory_balances` es el saldo consolidado materializado y
`location_inventory_balances` el saldo por ubicación: se actualizan dentro de la
misma transacción. Sustituir el consolidado por sumas en cada lectura requiere
medir el costo y preservar su revisión para conflictos de concurrencia.

`audit_events` y `control_audit_details` tienen solapamiento, pero ambos se usan:
la segunda conserva antes/después y eventos inmutables. Una futura unificación
necesita resolver identidad de eventos, compatibilidad de exportaciones y
validación de respaldos. Esta entrega conserva su trazabilidad actual.

## Menos trabajo al cargar Inicio

Inicio ahora pide un resumen de alertas de precios con las mismas reglas,
prioridades y permisos que la revisión completa. No calcula la última venta de
cada artículo porque Inicio sólo muestra el total y tres nombres. La revisión
completa y Rotación siguen calculando la última venta y descontando devoluciones.

Los indicadores de hoy y esta semana consultan sólo sus períodos actuales.
Antes calculaban también los dos períodos anteriores para luego descartarlos.
`currentTotals` comparte el mismo cálculo de ventas, anulaciones y devoluciones
que los comparativos, dentro de una transacción de lectura.

`npm run benchmark:queries` compara ambas rutas de Inicio sobre la misma base
sintética y verifica que las respuestas coincidan salvo la hora de generación.
`homeBeforeSummaryOptimization` reproduce las llamadas de v30; `home` usa v31.
El indicador `--baseline` sigue desactivando sólo los índices agregados en v30.

En la medición local con 4.004 artículos, 24.000 ventas y 96.000 líneas, la mediana
de Inicio bajó de **96,63 ms a 15,99 ms** (cinco muestras por ruta, mismos datos e
índices). Las respuestas coincidieron. Son tiempos de servicio y SQLite; no
incluyen red ni renderizado y no representan una medición directa de Railway.

Validación: 293 pruebas pasaron, además de tipos, lint y compilaciones de web,
API y escritorio. Las pruebas de migración cubren respaldo, conservación de
datos, preferencias privadas, integridad y reversión ante conflictos de archivo.

## Criterio para próximos cambios

Una nueva tabla debe representar un hecho, relación, historial o estado con una
responsabilidad concreta. Los atributos opcionales con la misma vida que su
entidad pueden vivir en ella. Las relaciones múltiples y los historiales deben
conservar claves, restricciones y consultas claras. Para datos operativos se
prefieren columnas tipadas a bolsas de JSON genéricas.

Las optimizaciones se justifican con consultas y planes medidos. El número de
tablas no mide la velocidad: los recorridos, índices, filas procesadas y consultas
innecesarias determinan el trabajo que hace SQLite.
