# Plan propuesto: de 84 a 60 tablas

Estado: implementado en el código mediante las migraciones 32–35. Ver
[esquema consolidado](schema-simplification.md) para el resultado y la validación.
Este documento conserva la propuesta original. No acredita un despliegue en Railway.
Base del conteo: esquema v31 del repositorio, documentado en
`docs/schema-audit.md`; excluye tablas internas de SQLite. No es un nuevo
relevamiento directo de Railway. Objetivo: retirar 24 tablas netas (28,6%).

## Mapa de consolidación

Los nombres de columnas nuevas son propuestas. Cada grupo debe conservar las
restricciones y los datos actuales, no solamente sus campos más visibles.

| Grupo | Origen → destino | Reducción neta |
| --- | --- | ---: |
| Ventas y devoluciones | `sale_returns` → `sales`; `sale_return_items` → `sale_items`; `sale_return_refunds` → `sale_payments`; `sale_return_events` → `sale_events`; `sale_return_item_lots` → `sale_item_lots` | 5 |
| Clientes y proveedores | `customers` + `suppliers` → `parties`; `customer_collections` + `supplier_payments` → `account_payments`; sus dos tablas de imputaciones → `account_payment_allocations`; `customer_credits` + `supplier_credits` → `account_credits` | 4 |
| Estado de deuda | `customer_receivables` → columnas de `sales`; `supplier_payables` → columnas de `purchases` | 2 |
| Estado del producto | `product_cost_states`, `lot_product_settings`, `replenishment_product_rules` → columnas de `products` | 3 |
| Reposición | `replenishment_calendars` → columnas de `locations`; `replenishment_receipts` → columnas de `purchase_items` | 2 |
| Configuración y revisión actual | `commercial_settings` → `business_settings`; `control_cash_reviews` → `register_shifts` | 2 |
| Auditoría | `audit_events`, `control_audit_details`, `control_cash_review_history`, `control_due_history` → `audit_events` ampliada | 3 |
| Borradores | `checkout_drafts` + `purchase_drafts` → `drafts` | 1 |
| Resultados de operaciones repetibles | `lot_operations` + `control_operation_results` → `operation_results` | 1 |
| Cambios de precios | `price_change_previews` + `price_change_batches` → `price_change_batches` ampliada | 1 |
| **Total** | **84 → 60** | **24** |

## Atributos y reglas principales

### Ventas y devoluciones

- `sales`: `document_type` (SALE/RETURN), `original_sale_id`, motivo y campos
  propios del reintegro/compensación. Mantener numeración por tipo y unicidad
  `(document_type, number)`; resolver colisiones de identificadores al migrar.
- `sale_items`: referencia a la línea original y destino del artículo devuelto
  (reingreso al stock, descarte o sin movimiento). Conservar costos históricos.
- `sale_payments`: sentido PAYMENT/REFUND; conservar caja, medios e importes.
- Las devoluciones pasan a ser filas de las mismas tablas, no un indicador que
  sobrescribe la venta original. Una venta admite múltiples devoluciones
  parciales, fechas y reintegros. Validar cantidades acumuladas por línea.
- Revisar todos los reportes: un RETURN no debe contarse como una venta nueva.
  Mantener claves de operación, eventos, comprobantes y referencias a lotes.

### Clientes, proveedores y cuentas

- `parties`: atributos `is_customer`, `is_supplier`, datos de contacto y límite
  de crédito; una persona puede cumplir ambos roles. No fusionar personas
  automáticamente por coincidencia de nombre.
- Pagos y créditos: `party_id`, sentido de la operación y referencias tipadas.
  Las imputaciones conservan filas independientes: un pago puede cubrir varias
  facturas y una factura recibir varios pagos. Usar FK reales a venta/compra y
  CHECK que exija exactamente el destino correspondiente, no un ID genérico.
- `sales`/`purchases`: importe de deuda original, saldo, estado, vencimiento,
  revisión de vencimiento y fechas. Las tablas actuales tienen una deuda por
  documento. Conservar la diferencia entre no tener deuda y haberla cancelado.
- Retargetear referencias de caja, órdenes, pagos e imputaciones; comprobar
  identidad, saldos y permisos de cliente/proveedor después de la migración.

### Estados uno a uno como atributos

- `products`: método y valor del costo, cantidad cubierta, fecha/autor del costo;
  control de lotes y conciliación; múltiplo de compra para reposición.
- `locations`: calendario semanal y excepciones, conservando su formato actual.
- `purchase_items`: línea de orden de reposición y cantidad recibida contra ella.
  Hoy `replenishment_receipts.purchase_item_id` es UNIQUE: cada línea de compra
  puede representar una recepción, sin impedir varias recepciones por orden.
- `business_settings`: margen objetivo y días para considerar un precio viejo.
- `register_shifts`: última nota de revisión, autor y fecha.
- Mantener revisiones independientes por función para no introducir conflictos
  entre editar un producto y actualizar su costo. Preservar NULL como ausencia
  de configuración/estado: no convertirlo indiscriminadamente en cero.

### Auditoría y estructuras equivalentes

- `audit_events`: tipo de evento, referencias a entidades, autor, fecha, motivo,
  revisión y antes/después. Conservar todas las filas históricas y su procedencia;
  no deduplicar por proximidad de fechas. Mantener inmutabilidad e integridad.
  JSON sirve para fotografías de auditoría, no para sustituir saldos consultables.
- `drafts`: tipo SALE/PURCHASE, propietario, terminal, revisión y contenido;
  unicidad por tipo/propietario, preservando el borrador legacy sin propietario.
- `operation_results`: ámbito, clave, hash y resultado. Unicidad por ámbito/clave
  y adaptación de FK de lotes; reintentar no puede ejecutar una operación dos veces.
- `price_change_batches`: tipo PREVIEW/APPLIED, vencimiento y referencia al
  preview de origen. Conservar filas separadas si un preview originó más de una
  aplicación; no imponer una cardinalidad nueva. La caducidad del preview nunca
  debe borrar una aplicación. `price_change_items` sigue guardando sus detalles.

## Etapas y conteos

1. **84 → 75:** integrar los nueve estados/configuraciones uno a uno: deuda (2),
   producto (3), reposición (2), configuración/revisión (2).
2. **75 → 70:** unificar ventas, devoluciones y sus relaciones con lotes (5).
3. **70 → 66:** unificar clientes/proveedores y movimientos de cuenta (4).
4. **66 → 60:** auditoría (3), borradores (1), resultados de operaciones (1),
   previews de precios (1).

Cada etapa requiere una entrega validada. El conteo es objetivo de diseño;
si una regla real impide una fusión, documentar el motivo y ajustar el objetivo
antes de migrar. Las tablas temporales de migración no forman parte del final.

## Qué conservar separado

Cabeceras y artículos; pagos e imputaciones; stock y movimientos; lotes y
ubicaciones; órdenes y líneas; sesiones y autenticación; promociones y su
aplicación; históricos de costos y eventos transaccionales. No fusionar compras
y ventas en una tabla universal ni guardar colecciones operativas en JSON para
reducir artificialmente el conteo. Conservar inicialmente los saldos de stock
materializados: quitarlos podría volver más lentas las lecturas.

## Migración y criterios de aceptación

1. Inventariar la base efectiva: versión, tablas, filas, tamaños, índices y
   consultas lentas. Medir base activa, WAL y respaldos por separado.
2. Trabajar sobre una copia verificada; medir espacio temporal requerido antes
   de reconstruir tablas. No migrar un volumen casi lleno.
3. Crear mapeos de IDs sin colisiones, adaptar SQL, servicios, reportes,
   exportación/importación y validadores de respaldo. Preservar referencias
   públicas mediante compatibilidad explícita cuando cambien IDs internos.
4. Probar migración, claves foráneas e integridad; conciliar artículos, ventas,
   devoluciones, impuestos, descuentos, costos, caja, créditos y stock por lote
   y ubicación. Verificar permisos, concurrencia y reintentos.
5. Comparar respuestas y tiempos antes/después sobre los mismos datos y con
   carga representativa. No aceptar regresiones relevantes sin resolverlas.
6. Para activar: detener escrituras, respaldar y verificar, migrar y desplegar
   código compatible. Si falla, restaurar código y base anteriores juntos.
   No reabrir escrituras hasta superar las comprobaciones de arranque.

Menos tablas no garantiza menos MB ni más velocidad. Los objetivos verificables
son un modelo más claro, comportamiento idéntico y consultas sin regresiones.
No se estima ahorro en MB hasta medir una copia migrada.

## Respaldos: tarea independiente

Proponer programación semanal los sábados, desactivable, zona horaria explícita
y retención limitada configurable (por ejemplo, dos copias). No necesita otra
tabla: usar configuración existente. Una frecuencia semanal puede perder hasta
una semana de cambios; para uso real debe acordarse ese riesgo o complementar
con respaldo externo más frecuente. Conservar un respaldo verificado antes de
cada migración, con retención posterior controlada. No borrar copias actuales
como parte de este plan ni confundir su tamaño con el de la base activa.
