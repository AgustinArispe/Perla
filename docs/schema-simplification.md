# Esquema consolidado v35

Las migraciones posteriores v36 y v37 incorporan [remitos](remitos.md) y
[órdenes para caja](ordenes-para-caja.md), cada uno con una tabla compartida
adicional: el esquema actual tiene **62 tablas propias**.
Los conteos y mediciones de consolidación de este documento corresponden a v35.

Las migraciones 32–35 implementan el paso de **84 a 60 tablas propias**:
24 menos (28,6%). `sqlite_sequence` es interna de SQLite y queda fuera del conteo.
El resultado corresponde al código y a las bases de verificación, no a una
confirmación de despliegue en Railway.

| Migración | Integración                                                                                   | Tablas después |
| --------- | --------------------------------------------------------------------------------------------- | -------------: |
| 32        | Estados/configuración como atributos de producto, ubicación, compra, venta, caja y negocio    |             75 |
| 33        | Ventas y devoluciones comparten documentos, artículos, pagos, eventos y asignaciones de lotes |             70 |
| 34        | Clientes/proveedores y sus pagos, imputaciones y créditos comparten almacenamiento            |             66 |
| 35        | Auditorías, borradores, resultados de operaciones y vistas previas de precios                 |             60 |

## Cómo leer y escribir

Las escrituras usan las tablas físicas y columnas tipadas. Se conservan 36
vistas SQL de lectura que expresan proyecciones del dominio, como
`sale_orders`, `sale_returns`, `customers`, `supplier_payments` y
`product_cost_states`. No almacenan copias de datos ni tienen disparadores de
escritura. Una consulta antigua no puede modificar accidentalmente una vista:
debe usar explícitamente el nuevo almacenamiento.

Una devolución es otra fila de `sales`, con `document_type='RETURN'` y
`original_sale_id`. Sus artículos usan `sale_items`, con referencia a la línea
original y destino RESTOCK/WASTE/NONE. Los reintegros son filas de
`sale_payments` con `direction='REFUND'`. Las vistas de ventas normales filtran
SALE/PAYMENT para que un reintegro no incremente los indicadores de ventas.
Las devoluciones parciales conservan fecha, importe, costo histórico, autor y
lotes propios. La venta original mantiene sus valores históricos.

`parties` identifica clientes y proveedores mediante `is_customer` e
`is_supplier`. `account_payments` distingue ingresos y egresos. Las
imputaciones y créditos usan FK reales a venta o compra, con exclusión de
destinos y validación de titular y sentido. Los pagos múltiples siguen teniendo
filas propias. No se fusionan personas por nombre.

Los costos, lotes y reglas de reposición tienen revisiones independientes del
producto. Los estados completos se distinguen de la ausencia de configuración.
La deuda original, saldo, estado y vencimiento viven en la venta o compra;
cancelar una deuda no borra su existencia histórica.

`audit_events` conserva ACTION, DETAIL, CASH_REVIEW y DUE_DATE, con identidad
compuesta por tipo e ID e historial inmutable. Los vencimientos referencian
documentos y las revisiones de caja referencian turnos. `operation_results`
conserva el ámbito LOTS/CONTROL: la misma clave en dos ámbitos no se confunde.
Los borradores de compra y venta de un mismo usuario siguen siendo distintos.

Las vistas previas y aplicaciones de precios comparten `price_change_batches`.
Caducar una vista previa elimina su referencia opcional y conserva las
aplicaciones y sus artículos. El tipo del registro no se puede convertir.

## Inventario final: 60 tablas

| Función                         | Tablas físicas                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sistema y usuarios (12)         | `schema_migrations`, `app_settings`, `users`, `auth_sessions`, `auth_attempts`, `audit_events`, `business_settings`, `business_features`, `terminals`, `terminal_locations`, `saved_views`, `notification_reads` |
| Catálogo (6)                    | `products`, `product_categories`, `product_brands`, `barcode_sequences`, `product_labels`, `import_batches`                                                                                                      |
| Ventas, devoluciones y caja (9) | `sales`, `sale_items`, `sale_payments`, `sale_events`, `register_shifts`, `register_movements`, `sale_receipts`, `sale_promotions`, `sale_promotion_allocations`                                                 |
| Stock y ubicaciones (4)         | `inventory_balances`, `stock_movements`, `locations`, `location_inventory_balances`                                                                                                                              |
| Lotes (4)                       | `inventory_lots`, `lot_movements`, `sale_item_lots`, `location_lot_balances`                                                                                                                                     |
| Traslados (4)                   | `stock_transfers`, `stock_transfer_items`, `stock_transfer_events`, `stock_transfer_item_lots`                                                                                                                   |
| Compras (3)                     | `purchases`, `purchase_items`, `purchase_events`                                                                                                                                                                 |
| Costos y precios (6)            | `product_cost_events`, `price_change_batches`, `price_change_items`, `promotions`, `commercial_price_events`, `commercial_price_reviews`                                                                         |
| Contrapartes y cuentas (4)      | `parties`, `account_payments`, `account_payment_allocations`, `account_credits`                                                                                                                                  |
| Reposición (3)                  | `replenishment_orders`, `replenishment_order_lines`, `replenishment_events`                                                                                                                                      |
| Conteos y resúmenes (3)         | `control_count_sessions`, `control_count_lines`, `weekly_snapshots`                                                                                                                                              |
| Auxiliares compartidos (2)      | `drafts`, `operation_results`                                                                                                                                                                                    |

## Migración y recuperación

El arranque sobre una base persistente anterior conserva el respaldo verificado
habitual en `migration-backups/`. Las reconstrucciones se ejecutan en una única
transacción con escritores excluidos. La comprobación de FK se realiza antes
de confirmar cada migración y se restaura el ajuste de FK incluso si falla.
Un fallo revierte el lote completo, incluidos datos y versiones del esquema.

La identidad de historial y claves de reintento se conserva por ámbito. Si dos
entidades que pasan a compartir una clave global tienen el mismo ID, la
migración se detiene y revierte: no sobrescribe ni renumera silenciosamente.
Ese caso requiere un mapeo explícito antes de reintentar.

Los respaldos v31–34 se validan según su versión y se migran en el archivo
candidato antes de sustituir la base activa. La huella de restauración incluye
los historiales consolidados; solamente excluye las sesiones, intentos y eventos
ACTION que acompañan solicitudes rutinarias.

Antes de activar en un servidor, verificar espacio para el respaldo, la
reconstrucción y el WAL, detener las escrituras y validar el arranque. Para
volver atrás hay que restaurar juntos ejecutable y base anteriores. Este cambio
no ejecuta una limpieza de archivos del volumen ni un VACUUM automático.

## Respaldos automáticos semanales

El servidor comprueba la programación al iniciar y cada minuto. Por defecto
crea una copia los sábados según Buenos Aires y conserva dos copias de esta
programación. La interfaz las muestra como «Semanal · sábados». La clasificación
interna DAILY se conserva para compatibilidad del formato, acompañada de
`schedule='WEEKLY_SATURDAY'`.

| Variable                      | Valor predeterminado             | Uso                                                  |
| ----------------------------- | -------------------------------- | ---------------------------------------------------- |
| `BOCHA_AUTO_BACKUP_ENABLED`   | `true`                           | Usar `false` para desactivar; no crea ni poda copias |
| `BOCHA_AUTO_BACKUP_RETENTION` | `2`                              | Cantidad a conservar, entre 1 y 104                  |
| `BOCHA_AUTO_BACKUP_TIMEZONE`  | `America/Argentina/Buenos_Aires` | Zona horaria de la programación                      |

La retención elimina únicamente copias autenticadas marcadas por esta
programación y después de asegurar la copia del sábado. Conserva las manuales,
previas a restaurar y automáticas antiguas sin marca. Si el servidor permanece
apagado todo el sábado, la próxima copia se realiza el sábado siguiente.
La periodicidad semanal admite perder los cambios desde la última copia;
para datos reales se debe elegir una política acorde al negocio.

## Validación

Las pruebas de simplificación cubren conservación de filas y estados v31→35,
conteos por etapa, ausencia frente a cero/pagado, IDs y claves coincidentes,
rollback y reintento, restricciones de tipo, integridad y referencias, historia
inmutable, autor de los eventos y acceso indexado a las vistas. Los flujos de
venta, devolución, caja, cuentas, compras, stock y reportes se verifican con la
suite existente adaptada al almacenamiento compartido.

Las comprobaciones incluyen 96 pruebas específicas de consolidación y pruebas
de respaldo/restauración de versiones anteriores, programación semanal y
configuración. El comando completo es `npm run check`: pruebas, tipos, lint y
compilaciones de escritorio, web y API.

Resultado final de pruebas: **415 aprobadas en 81 archivos**.

También se verificó una copia sintética v31 con 4.004 productos, 24.000 ventas y
96.000 líneas: se conservaron los hashes de las columnas originales de las 84
tablas y las respuestas de Inicio, revisión comercial y reporte mensual. El
original quedó intacto; integridad y FK de la copia migrada resultaron correctas.

Medianas de cinco muestras por variante sobre los mismos datos, Node 24.19.0 y
SQLite 3.53.4, sin red ni renderizado:

| Consulta            |       v31 | v35 final |
| ------------------- | --------: | --------: |
| Inicio              |  16,79 ms |  19,70 ms |
| Revisión de precios |  93,00 ms |  91,04 ms |
| Reporte mensual     | 118,45 ms | 127,51 ms |

La lectura comercial usa directamente `products.cost_*`: conservar el antiguo
join de costos sobre la nueva vista provocaba un autojoin. Quitarlo redujo
Inicio de 23,18 a 19,70 ms en esta comparación. Frente a v31, Inicio conserva
un incremento de unos 3 ms y el mensual de unos 9 ms; este cambio no acredita
una mejora general de velocidad. La base sintética no contiene devoluciones;
esos casos y los demás estados históricos se cubren con fixtures poblados en
las pruebas de migración y de negocio. No es una medición directa de Railway.

Reducir tablas no promete un porcentaje de reducción en MB ni una mejora de
tiempos por sí mismo. Los datos históricos siguen existiendo. El espacio total
del volumen incluye, además, WAL, exportaciones y respaldos independientes.
