# Diccionario completo de la base de datos

Referencia generada desde el código del repositorio. Corte documental: 9 de octubre de 2026. Esquema 29. No contiene datos del comercio.

[Volver al índice](README.md)

Se reconstruyeron las 29 migraciones en SQLite en memoria. Se documentan 86 tablas con columnas, claves foráneas, índices y DDL final. La fila PK muestra la posición dentro de una clave primaria compuesta. Un NOT NULL=No no implica que una PK admita nulos en todos los modos de SQLite; leer también el DDL.

- [app_settings](#app-settings)
- [audit_events](#audit-events)
- [auth_attempts](#auth-attempts)
- [auth_sessions](#auth-sessions)
- [barcode_sequences](#barcode-sequences)
- [business_features](#business-features)
- [business_settings](#business-settings)
- [checkout_drafts](#checkout-drafts)
- [commercial_price_events](#commercial-price-events)
- [commercial_price_reviews](#commercial-price-reviews)
- [commercial_settings](#commercial-settings)
- [control_audit_details](#control-audit-details)
- [control_cash_review_history](#control-cash-review-history)
- [control_cash_reviews](#control-cash-reviews)
- [control_count_lines](#control-count-lines)
- [control_count_sessions](#control-count-sessions)
- [control_due_history](#control-due-history)
- [control_operation_results](#control-operation-results)
- [customer_collection_allocations](#customer-collection-allocations)
- [customer_collections](#customer-collections)
- [customer_credits](#customer-credits)
- [customer_receivables](#customer-receivables)
- [customers](#customers)
- [import_batches](#import-batches)
- [inventory_balances](#inventory-balances)
- [inventory_lots](#inventory-lots)
- [location_inventory_balances](#location-inventory-balances)
- [location_lot_balances](#location-lot-balances)
- [locations](#locations)
- [lot_movements](#lot-movements)
- [lot_operations](#lot-operations)
- [lot_product_settings](#lot-product-settings)
- [notification_reads](#notification-reads)
- [price_change_batches](#price-change-batches)
- [price_change_items](#price-change-items)
- [price_change_previews](#price-change-previews)
- [printer_profiles](#printer-profiles)
- [product_brands](#product-brands)
- [product_categories](#product-categories)
- [product_cost_events](#product-cost-events)
- [product_cost_states](#product-cost-states)
- [product_labels](#product-labels)
- [products](#products)
- [promotions](#promotions)
- [purchase_drafts](#purchase-drafts)
- [purchase_events](#purchase-events)
- [purchase_items](#purchase-items)
- [purchases](#purchases)
- [register_movements](#register-movements)
- [register_shifts](#register-shifts)
- [replenishment_calendars](#replenishment-calendars)
- [replenishment_events](#replenishment-events)
- [replenishment_order_lines](#replenishment-order-lines)
- [replenishment_orders](#replenishment-orders)
- [replenishment_product_rules](#replenishment-product-rules)
- [replenishment_receipts](#replenishment-receipts)
- [sale_events](#sale-events)
- [sale_item_lots](#sale-item-lots)
- [sale_items](#sale-items)
- [sale_payments](#sale-payments)
- [sale_promotion_allocations](#sale-promotion-allocations)
- [sale_promotions](#sale-promotions)
- [sale_receipts](#sale-receipts)
- [sale_return_events](#sale-return-events)
- [sale_return_item_lots](#sale-return-item-lots)
- [sale_return_items](#sale-return-items)
- [sale_return_refunds](#sale-return-refunds)
- [sale_returns](#sale-returns)
- [sales](#sales)
- [saved_views](#saved-views)
- [schema_migrations](#schema-migrations)
- [stock_movements](#stock-movements)
- [stock_transfer_events](#stock-transfer-events)
- [stock_transfer_item_lots](#stock-transfer-item-lots)
- [stock_transfer_items](#stock-transfer-items)
- [stock_transfers](#stock-transfers)
- [supplier_credits](#supplier-credits)
- [supplier_payables](#supplier-payables)
- [supplier_payment_allocations](#supplier-payment-allocations)
- [supplier_payments](#supplier-payments)
- [suppliers](#suppliers)
- [terminal_locations](#terminal-locations)
- [terminals](#terminals)
- [users](#users)
- [weekly_snapshots](#weekly-snapshots)
- [workspace_preferences](#workspace-preferences)

## app-settings

Nombre SQL: `app_settings`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| key | TEXT | Sí | — | 1 |
| value_json | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | '' | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_app_settings_1`: único; columnas: key; completo.

**Definición efectiva**

```sql
CREATE TABLE app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL
    , updated_at_utc TEXT NOT NULL DEFAULT '') STRICT;
```

## audit-events

Nombre SQL: `audit_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| operation | TEXT | Sí | — | — |
| entity_id | TEXT | No | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `audit_date_id`: no único; columnas: created_at_utc, id; completo. SQL: `CREATE INDEX audit_date_id ON audit_events(created_at_utc,id)`
- `audit_events_date`: no único; columnas: created_at_utc; completo. SQL: `CREATE INDEX audit_events_date ON audit_events(created_at_utc)`
- `sqlite_autoindex_audit_events_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE audit_events (id TEXT PRIMARY KEY NOT NULL,operation TEXT NOT NULL,entity_id TEXT,actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,actor_name TEXT NOT NULL,created_at_utc TEXT NOT NULL) STRICT;
```

## auth-attempts

Nombre SQL: `auth_attempts`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| username | TEXT | Sí | — | 1 |
| failures | INTEGER | Sí | — | — |
| blocked_until_ms | INTEGER | Sí | — | — |
| updated_at_ms | INTEGER | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_auth_attempts_1`: único; columnas: username; completo.

**Definición efectiva**

```sql
CREATE TABLE auth_attempts (username TEXT PRIMARY KEY NOT NULL,failures INTEGER NOT NULL,blocked_until_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL) STRICT;
```

## auth-sessions

Nombre SQL: `auth_sessions`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| token_hash | TEXT | Sí | — | 1 |
| user_id | TEXT | Sí | — | — |
| user_revision | INTEGER | Sí | — | — |
| expires_at_ms | INTEGER | Sí | — | — |
| last_seen_ms | INTEGER | Sí | 0 | — |
| terminal_id | TEXT | No | — | — |

**Relaciones**

- `terminal_id` → `terminals.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `auth_sessions_user`: no único; columnas: user_id; completo. SQL: `CREATE INDEX auth_sessions_user ON auth_sessions(user_id)`
- `sqlite_autoindex_auth_sessions_1`: único; columnas: token_hash; completo.

**Definición efectiva**

```sql
CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,user_revision INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL, last_seen_ms INTEGER NOT NULL DEFAULT 0, terminal_id TEXT REFERENCES terminals(id)) STRICT;
```

## barcode-sequences

Nombre SQL: `barcode_sequences`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| namespace | TEXT | Sí | — | 1 |
| next_value | INTEGER | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_barcode_sequences_1`: único; columnas: namespace; completo.

**Definición efectiva**

```sql
CREATE TABLE barcode_sequences (
  namespace TEXT PRIMARY KEY NOT NULL,
  next_value INTEGER NOT NULL CHECK(next_value BETWEEN 1 AND 999999999)
) STRICT;
```

## business-features

Nombre SQL: `business_features`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| feature_key | TEXT | Sí | — | 1 |
| enabled | INTEGER | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_business_features_1`: único; columnas: feature_key; completo.

**Definición efectiva**

```sql
CREATE TABLE business_features (
  feature_key TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## business-settings

Nombre SQL: `business_settings`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | INTEGER | No | — | 1 |
| business_name | TEXT | Sí | — | — |
| currency | TEXT | Sí | — | — |
| payment_methods_json | TEXT | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |
| features_revision | INTEGER | Sí | 1 | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

Sin índices adicionales.

**Definición efectiva**

```sql
CREATE TABLE business_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), business_name TEXT NOT NULL, currency TEXT NOT NULL CHECK(currency='ARS'),
 payment_methods_json TEXT NOT NULL CHECK(json_valid(payment_methods_json)), revision INTEGER NOT NULL CHECK(revision>0),
 updated_at_utc TEXT NOT NULL
, features_revision INTEGER NOT NULL DEFAULT 1 CHECK(features_revision>0)) STRICT;
```

## checkout-drafts

Nombre SQL: `checkout_drafts`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| owner_user_id | TEXT | No | — | — |
| revision | INTEGER | Sí | — | — |
| body_json | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `owner_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_checkout_drafts_2`: único; columnas: owner_user_id; completo.
- `sqlite_autoindex_checkout_drafts_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE checkout_drafts (id TEXT PRIMARY KEY NOT NULL,owner_user_id TEXT UNIQUE REFERENCES users(id) ON DELETE RESTRICT,revision INTEGER NOT NULL CHECK(revision>=1),body_json TEXT NOT NULL CHECK(json_valid(body_json)),updated_at_utc TEXT NOT NULL) STRICT;
```

## commercial-price-events

Nombre SQL: `commercial_price_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | INTEGER | No | — | 1 |
| product_id | TEXT | Sí | — | — |
| before_cents | INTEGER | Sí | — | — |
| after_cents | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

Sin índices adicionales.

**Definición efectiva**

```sql
CREATE TABLE commercial_price_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL REFERENCES products(id),
 before_cents INTEGER NOT NULL, after_cents INTEGER NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
```

## commercial-price-reviews

Nombre SQL: `commercial_price_reviews`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| operation_key | TEXT | Sí | — | — |
| product_id | TEXT | Sí | — | — |
| price_cents | INTEGER | Sí | — | — |
| price_version | INTEGER | Sí | — | — |
| cost_revision | INTEGER | No | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `commercial_reviews_product`: no único; columnas: product_id, created_at_utc, id; completo. SQL: `CREATE INDEX commercial_reviews_product ON commercial_price_reviews(product_id,created_at_utc DESC,id)`
- `sqlite_autoindex_commercial_price_reviews_2`: único; columnas: operation_key, product_id; completo.
- `sqlite_autoindex_commercial_price_reviews_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE commercial_price_reviews (
 id TEXT PRIMARY KEY, operation_key TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id),
 price_cents INTEGER NOT NULL, price_version INTEGER NOT NULL, cost_revision INTEGER, actor_user_id TEXT NOT NULL REFERENCES users(id),
 actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL, UNIQUE(operation_key,product_id)
) STRICT;
```

## commercial-settings

Nombre SQL: `commercial_settings`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| margin_basis_points | INTEGER | Sí | 2000 | — |
| stale_days | INTEGER | Sí | 60 | — |
| revision | INTEGER | Sí | 1 | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_commercial_settings_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE commercial_settings (
 id TEXT PRIMARY KEY CHECK(id='main'), margin_basis_points INTEGER NOT NULL DEFAULT 2000,
 stale_days INTEGER NOT NULL DEFAULT 60, revision INTEGER NOT NULL DEFAULT 1
) STRICT;
```

## control-audit-details

Nombre SQL: `control_audit_details`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| entity_type | TEXT | Sí | — | — |
| entity_id | TEXT | Sí | — | — |
| operation | TEXT | Sí | — | — |
| before_json | TEXT | Sí | — | — |
| after_json | TEXT | Sí | — | — |
| reason | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `control_audit_entity`: no único; columnas: entity_type, entity_id, created_at_utc; completo. SQL: `CREATE INDEX control_audit_entity ON control_audit_details(entity_type,entity_id,created_at_utc)`
- `sqlite_autoindex_control_audit_details_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE control_audit_details (
 id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL,
 before_json TEXT NOT NULL CHECK(json_valid(before_json)), after_json TEXT NOT NULL CHECK(json_valid(after_json)),
 reason TEXT NOT NULL, actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
```

## control-cash-review-history

Nombre SQL: `control_cash_review_history`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| shift_id | TEXT | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| note | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `shift_id` → `register_shifts.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `sqlite_autoindex_control_cash_review_history_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE control_cash_review_history (
 id TEXT PRIMARY KEY NOT NULL, shift_id TEXT NOT NULL REFERENCES register_shifts(id), revision INTEGER NOT NULL, note TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
```

## control-cash-reviews

Nombre SQL: `control_cash_reviews`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| shift_id | TEXT | Sí | — | 1 |
| revision | INTEGER | Sí | — | — |
| note | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| reviewed_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `shift_id` → `register_shifts.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `sqlite_autoindex_control_cash_reviews_1`: único; columnas: shift_id; completo.

**Definición efectiva**

```sql
CREATE TABLE control_cash_reviews (
 shift_id TEXT PRIMARY KEY NOT NULL REFERENCES register_shifts(id), revision INTEGER NOT NULL, note TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, reviewed_at_utc TEXT NOT NULL
) STRICT;
```

## control-count-lines

Nombre SQL: `control_count_lines`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| session_id | TEXT | Sí | — | 1 |
| product_id | TEXT | Sí | — | 2 |
| counted_base | INTEGER | No | — | — |
| observed_base | INTEGER | No | — | — |
| stock_revision | INTEGER | No | — | — |
| product_revision | INTEGER | No | — | — |
| counted_at_utc | TEXT | No | — | — |
| applied_at_utc | TEXT | No | — | — |
| lot_counts_json | TEXT | No | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `session_id` → `control_count_sessions.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `sqlite_autoindex_control_count_lines_1`: único; columnas: session_id, product_id; completo.

**Definición efectiva**

```sql
CREATE TABLE control_count_lines (
 session_id TEXT NOT NULL REFERENCES control_count_sessions(id), product_id TEXT NOT NULL REFERENCES products(id),
 counted_base INTEGER CHECK(counted_base IS NULL OR counted_base BETWEEN 0 AND 1000000000), observed_base INTEGER,
 stock_revision INTEGER, product_revision INTEGER, counted_at_utc TEXT, applied_at_utc TEXT,
 lot_counts_json TEXT CHECK(lot_counts_json IS NULL OR json_valid(lot_counts_json)),
 PRIMARY KEY(session_id,product_id)
) STRICT;
```

## control-count-sessions

Nombre SQL: `control_count_sessions`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| location_id | TEXT | Sí | — | — |
| category_id | TEXT | No | — | — |
| revision | INTEGER | Sí | 1 | — |
| status | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `control_counts_location_date`: no único; columnas: location_id, updated_at_utc; completo. SQL: `CREATE INDEX control_counts_location_date ON control_count_sessions(location_id,updated_at_utc DESC)`
- `sqlite_autoindex_control_count_sessions_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE control_count_sessions (
 id TEXT PRIMARY KEY NOT NULL, location_id TEXT NOT NULL REFERENCES locations(id), category_id TEXT,
 revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL CHECK(status IN ('DRAFT','APPLIED')),
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL
) STRICT;
```

## control-due-history

Nombre SQL: `control_due_history`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| kind | TEXT | Sí | — | — |
| obligation_id | TEXT | Sí | — | — |
| previous_due_on | TEXT | No | — | — |
| due_on | TEXT | No | — | — |
| revision | INTEGER | Sí | — | — |
| reason | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `control_due_obligation`: no único; columnas: kind, obligation_id, revision; completo. SQL: `CREATE INDEX control_due_obligation ON control_due_history(kind,obligation_id,revision)`
- `sqlite_autoindex_control_due_history_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE control_due_history (
 id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('CUSTOMER','SUPPLIER')), obligation_id TEXT NOT NULL,
 previous_due_on TEXT, due_on TEXT, revision INTEGER NOT NULL, reason TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
```

## control-operation-results

Nombre SQL: `control_operation_results`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| operation_key | TEXT | Sí | — | 1 |
| payload_hash | TEXT | Sí | — | — |
| result_json | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_control_operation_results_1`: único; columnas: operation_key; completo.

**Definición efectiva**

```sql
CREATE TABLE control_operation_results (
 operation_key TEXT PRIMARY KEY NOT NULL, payload_hash TEXT NOT NULL, result_json TEXT NOT NULL CHECK(json_valid(result_json)), created_at_utc TEXT NOT NULL
) STRICT;
```

## customer-collection-allocations

Nombre SQL: `customer_collection_allocations`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| collection_id | TEXT | Sí | — | 1 |
| sale_id | TEXT | Sí | — | 2 |
| amount_cents | INTEGER | Sí | — | — |

**Relaciones**

- `sale_id` → `customer_receivables.sale_id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `collection_id` → `customer_collections.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_customer_collection_allocations_1`: único; columnas: collection_id, sale_id; completo.

**Definición efectiva**

```sql
CREATE TABLE customer_collection_allocations (
  collection_id TEXT NOT NULL REFERENCES customer_collections(id) ON DELETE RESTRICT,
  sale_id TEXT NOT NULL REFERENCES customer_receivables(sale_id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  PRIMARY KEY(collection_id,sale_id)
) STRICT, WITHOUT ROWID;
```

## customer-collections

Nombre SQL: `customer_collections`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| customer_id | TEXT | Sí | — | — |
| business_date | TEXT | Sí | — | — |
| method | TEXT | Sí | — | — |
| amount_cents | INTEGER | Sí | — | — |
| note | TEXT | No | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| shift_id | TEXT | No | — | — |
| register_movement_id | TEXT | No | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `shift_id` → `register_shifts.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `customer_id` → `customers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `customer_collections_customer_date`: no único; columnas: customer_id, business_date, created_at_utc, id; completo. SQL: `CREATE INDEX customer_collections_customer_date ON customer_collections(customer_id,business_date DESC,created_at_utc DESC,id)`
- `sqlite_autoindex_customer_collections_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_customer_collections_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE customer_collections (
  id TEXT PRIMARY KEY NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  note TEXT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
  register_movement_id TEXT,
  created_at_utc TEXT NOT NULL,
  CHECK((method='CASH' AND shift_id IS NOT NULL) OR (method<>'CASH' AND shift_id IS NULL))
) STRICT;
```

## customer-credits

Nombre SQL: `customer_credits`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| customer_id | TEXT | Sí | — | — |
| sale_id | TEXT | Sí | — | — |
| amount_cents | INTEGER | Sí | — | — |
| reason | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `customer_id` → `customers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_customer_credits_2`: único; columnas: sale_id; completo.
- `sqlite_autoindex_customer_credits_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE customer_credits (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_id TEXT NOT NULL UNIQUE REFERENCES sales(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  reason TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
) STRICT;
```

## customer-receivables

Nombre SQL: `customer_receivables`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| sale_id | TEXT | Sí | — | 1 |
| customer_id | TEXT | Sí | — | — |
| original_cents | INTEGER | Sí | — | — |
| balance_cents | INTEGER | Sí | — | — |
| status | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |
| due_on | TEXT | No | — | — |
| due_revision | INTEGER | Sí | 1 | — |

**Relaciones**

- `customer_id` → `customers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `control_customer_due`: no único; columnas: status, due_on, sale_id; completo. SQL: `CREATE INDEX control_customer_due ON customer_receivables(status,due_on,sale_id)`
- `customer_receivables_customer_status_date`: no único; columnas: customer_id, status, created_at_utc, sale_id; completo. SQL: `CREATE INDEX customer_receivables_customer_status_date ON customer_receivables(customer_id,status,created_at_utc,sale_id)`
- `sqlite_autoindex_customer_receivables_1`: único; columnas: sale_id; completo.

**Definición efectiva**

```sql
CREATE TABLE customer_receivables (
  sale_id TEXT PRIMARY KEY NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  original_cents INTEGER NOT NULL CHECK(original_cents BETWEEN 1 AND 9999999999),
  balance_cents INTEGER NOT NULL CHECK(balance_cents BETWEEN 0 AND original_cents),
  status TEXT NOT NULL CHECK(status IN ('OPEN','PAID','VOIDED')),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
, due_on TEXT, due_revision INTEGER NOT NULL DEFAULT 1) STRICT;
```

## customers

Nombre SQL: `customers`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| name | TEXT | Sí | — | — |
| search_name | TEXT | Sí | — | — |
| phone | TEXT | No | — | — |
| email | TEXT | No | — | — |
| notes | TEXT | No | — | — |
| active | INTEGER | Sí | 1 | — |
| credit_enabled | INTEGER | Sí | 0 | — |
| credit_limit_cents | INTEGER | Sí | 0 | — |
| revision | INTEGER | Sí | 1 | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `customers_search`: no único; columnas: active, search_name, id; completo. SQL: `CREATE INDEX customers_search ON customers(active,search_name,id)`
- `sqlite_autoindex_customers_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 140),
  search_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  credit_enabled INTEGER NOT NULL DEFAULT 0 CHECK(credit_enabled IN (0,1)),
  credit_limit_cents INTEGER NOT NULL DEFAULT 0 CHECK(credit_limit_cents BETWEEN 0 AND 9999999999),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## import-batches

Nombre SQL: `import_batches`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| source_name | TEXT | Sí | — | — |
| source_hash | TEXT | Sí | — | — |
| preview_token | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| rows_applied | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_import_batches_4`: único; columnas: operation_key; completo.
- `sqlite_autoindex_import_batches_3`: único; columnas: preview_token; completo.
- `sqlite_autoindex_import_batches_2`: único; columnas: source_hash; completo.
- `sqlite_autoindex_import_batches_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE import_batches (
  id TEXT PRIMARY KEY NOT NULL,
  source_name TEXT NOT NULL,
  source_hash TEXT UNIQUE NOT NULL,
  preview_token TEXT UNIQUE NOT NULL,
  operation_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK(status='APPLIED'),
  rows_applied INTEGER NOT NULL CHECK(rows_applied>0),
  created_at_utc TEXT NOT NULL
) STRICT;
```

## inventory-balances

Nombre SQL: `inventory_balances`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| product_id | TEXT | Sí | — | 1 |
| quantity_base | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_inventory_balances_1`: único; columnas: product_id; completo.

**Definición efectiva**

```sql
CREATE TABLE inventory_balances (
  product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN -1000000000 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision >= 1)
) STRICT;
```

## inventory-lots

Nombre SQL: `inventory_lots`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| product_id | TEXT | Sí | — | — |
| code | TEXT | Sí | — | — |
| expires_on | TEXT | No | — | — |
| status | TEXT | Sí | — | — |
| quantity_base | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `inventory_lots_fefo`: no único; columnas: product_id, status, expires_on, created_at_utc, id; completo. SQL: `CREATE INDEX inventory_lots_fefo ON inventory_lots(product_id,status,expires_on,created_at_utc,id)`
- `sqlite_autoindex_inventory_lots_2`: único; columnas: product_id, code; completo.
- `sqlite_autoindex_inventory_lots_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE inventory_lots (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  expires_on TEXT,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE','BLOCKED')),
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 0 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision>0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  UNIQUE(product_id,code)
) STRICT;
```

## location-inventory-balances

Nombre SQL: `location_inventory_balances`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| location_id | TEXT | Sí | — | 1 |
| product_id | TEXT | Sí | — | 2 |
| quantity_base | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `location_balances_location_quantity`: no único; columnas: location_id, quantity_base, product_id; completo. SQL: `CREATE INDEX location_balances_location_quantity ON location_inventory_balances(location_id,quantity_base,product_id)`
- `location_balances_product`: no único; columnas: product_id, location_id; completo. SQL: `CREATE INDEX location_balances_product ON location_inventory_balances(product_id,location_id)`
- `sqlite_autoindex_location_inventory_balances_1`: único; columnas: location_id, product_id; completo.

**Definición efectiva**

```sql
CREATE TABLE location_inventory_balances (
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN -1000000000 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision>0),
  PRIMARY KEY(location_id,product_id)
) STRICT;
```

## location-lot-balances

Nombre SQL: `location_lot_balances`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| location_id | TEXT | Sí | — | 1 |
| lot_id | TEXT | Sí | — | 2 |
| quantity_base | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |

**Relaciones**

- `lot_id` → `inventory_lots.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_location_lot_balances_1`: único; columnas: location_id, lot_id; completo.

**Definición efectiva**

```sql
CREATE TABLE location_lot_balances (
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 0 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision>0),
  PRIMARY KEY(location_id,lot_id)
) STRICT;
```

## locations

Nombre SQL: `locations`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| name | TEXT | Sí | — | — |
| code | TEXT | Sí | — | — |
| active | INTEGER | Sí | — | — |
| is_default | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `one_default_location`: único; columnas: is_default; parcial. SQL: `CREATE UNIQUE INDEX one_default_location ON locations(is_default) WHERE is_default=1`
- `sqlite_autoindex_locations_3`: único; columnas: code; completo.
- `sqlite_autoindex_locations_2`: único; columnas: name; completo.
- `sqlite_autoindex_locations_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  is_default INTEGER NOT NULL CHECK(is_default IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## lot-movements

Nombre SQL: `lot_movements`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| sequence | INTEGER | No | — | 1 |
| id | TEXT | Sí | — | — |
| lot_id | TEXT | Sí | — | — |
| delta_base | INTEGER | Sí | — | — |
| balance_after_base | INTEGER | Sí | — | — |
| kind | TEXT | Sí | — | — |
| reason | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| sale_item_id | TEXT | No | — | — |
| purchase_item_id | TEXT | No | — | — |
| return_item_id | TEXT | No | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_item_id` → `sale_return_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_item_id` → `purchase_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_item_id` → `sale_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `operation_key` → `lot_operations.operation_key`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `lot_id` → `inventory_lots.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `lot_movements_sale_item`: no único; columnas: sale_item_id, sequence; completo. SQL: `CREATE INDEX lot_movements_sale_item ON lot_movements(sale_item_id,sequence)`
- `lot_movements_lot_sequence`: no único; columnas: lot_id, sequence; completo. SQL: `CREATE INDEX lot_movements_lot_sequence ON lot_movements(lot_id,sequence DESC)`
- `sqlite_autoindex_lot_movements_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE lot_movements (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  delta_base INTEGER NOT NULL CHECK(delta_base!=0),
  balance_after_base INTEGER NOT NULL CHECK(balance_after_base BETWEEN 0 AND 1000000000),
  kind TEXT NOT NULL CHECK(kind IN ('RECEIPT','SALE','RETURN','VOID','WASTE','ADJUSTMENT')),
  reason TEXT NOT NULL,
  operation_key TEXT NOT NULL REFERENCES lot_operations(operation_key) ON DELETE RESTRICT,
  sale_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT,
  purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT,
  return_item_id TEXT REFERENCES sale_return_items(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
) STRICT;
```

## lot-operations

Nombre SQL: `lot_operations`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| operation_key | TEXT | Sí | — | 1 |
| payload_hash | TEXT | Sí | — | — |
| kind | TEXT | Sí | — | — |
| result_json | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_lot_operations_1`: único; columnas: operation_key; completo.

**Definición efectiva**

```sql
CREATE TABLE lot_operations (
  operation_key TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('RECEIPT','ALLOCATION','RECONCILIATION','VOID')),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  created_at_utc TEXT NOT NULL
) STRICT;
```

## lot-product-settings

Nombre SQL: `lot_product_settings`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| product_id | TEXT | Sí | — | 1 |
| enabled | INTEGER | Sí | — | — |
| reconciled | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_lot_product_settings_1`: único; columnas: product_id; completo.

**Definición efectiva**

```sql
CREATE TABLE lot_product_settings (
  product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  reconciled INTEGER NOT NULL CHECK(reconciled IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>0),
  updated_at_utc TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL
) STRICT;
```

## notification-reads

Nombre SQL: `notification_reads`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| user_id | TEXT | Sí | — | 1 |
| notification_key | TEXT | Sí | — | 2 |
| signature | TEXT | Sí | — | — |
| read_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `user_id` → `users.id`; al actualizar: NO ACTION; al borrar: CASCADE.

**Índices**

- `sqlite_autoindex_notification_reads_1`: único; columnas: user_id, notification_key; completo.

**Definición efectiva**

```sql
CREATE TABLE notification_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  read_at_utc TEXT NOT NULL,
  PRIMARY KEY(user_id,notification_key)
) STRICT;
```

## price-change-batches

Nombre SQL: `price_change_batches`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| change_json | TEXT | Sí | — | — |
| item_count | INTEGER | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_price_change_batches_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_price_change_batches_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE price_change_batches (
  id TEXT PRIMARY KEY NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  change_json TEXT NOT NULL CHECK(json_valid(change_json)),
  item_count INTEGER NOT NULL CHECK(item_count>0),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
) STRICT;
```

## price-change-items

Nombre SQL: `price_change_items`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| batch_id | TEXT | Sí | — | 1 |
| product_id | TEXT | Sí | — | 2 |
| product_name | TEXT | Sí | — | — |
| before_cents | INTEGER | Sí | — | — |
| after_cents | INTEGER | Sí | — | — |
| before_revision | INTEGER | Sí | — | — |
| after_revision | INTEGER | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `batch_id` → `price_change_batches.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `price_change_items_product`: no único; columnas: product_id, batch_id; completo. SQL: `CREATE INDEX price_change_items_product ON price_change_items(product_id,batch_id)`
- `sqlite_autoindex_price_change_items_1`: único; columnas: batch_id, product_id; completo.

**Definición efectiva**

```sql
CREATE TABLE price_change_items (
  batch_id TEXT NOT NULL REFERENCES price_change_batches(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  before_cents INTEGER NOT NULL CHECK(before_cents>0),
  after_cents INTEGER NOT NULL CHECK(after_cents>0),
  before_revision INTEGER NOT NULL CHECK(before_revision>0),
  after_revision INTEGER NOT NULL CHECK(after_revision>0),
  PRIMARY KEY(batch_id,product_id)
) STRICT;
```

## price-change-previews

Nombre SQL: `price_change_previews`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| input_json | TEXT | Sí | — | — |
| result_json | TEXT | Sí | — | — |
| expires_at_ms | INTEGER | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_price_change_previews_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE price_change_previews (
  id TEXT PRIMARY KEY NOT NULL,
  input_json TEXT NOT NULL CHECK(json_valid(input_json)),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  expires_at_ms INTEGER NOT NULL
) STRICT;
```

## printer-profiles

Nombre SQL: `printer_profiles`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| terminal_id | TEXT | No | — | — |
| name | TEXT | Sí | — | — |
| format | TEXT | Sí | — | — |
| mode | TEXT | Sí | — | — |
| header | TEXT | Sí | '' | — |
| footer | TEXT | Sí | '' | — |
| active | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `terminal_id` → `terminals.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `printer_profiles_terminal`: no único; columnas: terminal_id, active; completo. SQL: `CREATE INDEX printer_profiles_terminal ON printer_profiles(terminal_id,active)`
- `sqlite_autoindex_printer_profiles_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE printer_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  terminal_id TEXT REFERENCES terminals(id),
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('THERMAL_58','THERMAL_80','A4')),
  mode TEXT NOT NULL CHECK(mode IN ('MANUAL','AUTO')),
  header TEXT NOT NULL DEFAULT '',
  footer TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## product-brands

Nombre SQL: `product_brands`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| name | TEXT | Sí | — | — |
| search_name | TEXT | Sí | — | — |
| active | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_product_brands_2`: único; columnas: name; completo.
- `sqlite_autoindex_product_brands_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE product_brands (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  search_name TEXT NOT NULL,
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>=1),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## product-categories

Nombre SQL: `product_categories`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| name | TEXT | Sí | — | — |
| search_name | TEXT | Sí | — | — |
| active | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_product_categories_2`: único; columnas: name; completo.
- `sqlite_autoindex_product_categories_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE product_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  search_name TEXT NOT NULL,
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>=1),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## product-cost-events

Nombre SQL: `product_cost_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| product_id | TEXT | Sí | — | — |
| kind | TEXT | Sí | — | — |
| before_method | TEXT | No | — | — |
| before_rate_micros_per_base | INTEGER | No | — | — |
| before_covered_quantity_base | INTEGER | No | — | — |
| before_revision | INTEGER | No | — | — |
| after_method | TEXT | No | — | — |
| after_rate_micros_per_base | INTEGER | No | — | — |
| after_covered_quantity_base | INTEGER | No | — | — |
| after_revision | INTEGER | No | — | — |
| purchase_id | TEXT | No | — | — |
| purchase_item_id | TEXT | No | — | — |
| reason | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_item_id` → `purchase_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_id` → `purchases.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `product_cost_event_purchase_kind`: único; columnas: purchase_item_id, kind; parcial. SQL: `CREATE UNIQUE INDEX product_cost_event_purchase_kind ON product_cost_events(purchase_item_id,kind)
  WHERE purchase_item_id IS NOT NULL`
- `product_cost_events_product_time`: no único; columnas: product_id, created_at_utc, id; completo. SQL: `CREATE INDEX product_cost_events_product_time ON product_cost_events(product_id,created_at_utc,id)`
- `sqlite_autoindex_product_cost_events_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE product_cost_events (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('REFERENCE','RECEIPT','VOID','INVALIDATED')),
  before_method TEXT CHECK(before_method IS NULL OR before_method IN ('WEIGHTED_AVERAGE','REFERENCE')),
  before_rate_micros_per_base INTEGER,
  before_covered_quantity_base INTEGER,
  before_revision INTEGER,
  after_method TEXT CHECK(after_method IS NULL OR after_method IN ('WEIGHTED_AVERAGE','REFERENCE')),
  after_rate_micros_per_base INTEGER,
  after_covered_quantity_base INTEGER,
  after_revision INTEGER,
  purchase_id TEXT REFERENCES purchases(id) ON DELETE RESTRICT,
  purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
) STRICT;
```

## product-cost-states

Nombre SQL: `product_cost_states`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| product_id | TEXT | Sí | — | 1 |
| method | TEXT | Sí | — | — |
| rate_micros_per_base | INTEGER | Sí | — | — |
| covered_quantity_base | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| effective_at_utc | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_product_cost_states_1`: único; columnas: product_id; completo.

**Definición efectiva**

```sql
CREATE TABLE product_cost_states (
  product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK(method IN ('WEIGHTED_AVERAGE','REFERENCE')),
  rate_micros_per_base INTEGER NOT NULL CHECK(rate_micros_per_base>0),
  covered_quantity_base INTEGER NOT NULL CHECK(covered_quantity_base>=0),
  revision INTEGER NOT NULL CHECK(revision>0),
  effective_at_utc TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL
) STRICT;
```

## product-labels

Nombre SQL: `product_labels`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| product_id | TEXT | Sí | — | — |
| barcode | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| printed_at_utc | TEXT | No | — | — |
| actor_user_id | TEXT | No | — | — |
| actor_name | TEXT | No | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `product_labels_product`: no único; columnas: product_id, created_at_utc; completo. SQL: `CREATE INDEX product_labels_product ON product_labels(product_id,created_at_utc)`
- `product_labels_status_created`: no único; columnas: status, created_at_utc, id; completo. SQL: `CREATE INDEX product_labels_status_created ON product_labels(status,created_at_utc,id)`
- `sqlite_autoindex_product_labels_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE product_labels (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  barcode TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','PRINTED')),
  created_at_utc TEXT NOT NULL,
  printed_at_utc TEXT,
  actor_user_id TEXT REFERENCES users(id),
  actor_name TEXT,
  CHECK((status='PENDING' AND printed_at_utc IS NULL) OR (status='PRINTED' AND printed_at_utc IS NOT NULL))
) STRICT;
```

## products

Nombre SQL: `products`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| sku | TEXT | Sí | — | — |
| barcode | TEXT | No | — | — |
| name | TEXT | Sí | — | — |
| search_name | TEXT | Sí | — | — |
| category | TEXT | No | — | — |
| sale_unit | TEXT | Sí | — | — |
| price_cents | INTEGER | Sí | — | — |
| active | INTEGER | Sí | — | — |
| track_stock | INTEGER | Sí | — | — |
| stock_initialized | INTEGER | Sí | 0 | — |
| min_stock_base | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |
| category_id | TEXT | No | — | — |
| brand_id | TEXT | No | — | — |
| internal_barcode | TEXT | No | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `products_internal_barcode_unique`: único; columnas: internal_barcode; parcial. SQL: `CREATE UNIQUE INDEX products_internal_barcode_unique ON products(internal_barcode) WHERE internal_barcode IS NOT NULL`
- `products_brand_search_idx`: no único; columnas: brand_id, search_name, id; completo. SQL: `CREATE INDEX products_brand_search_idx ON products(brand_id,search_name,id)`
- `products_category_search_idx`: no único; columnas: category_id, search_name, id; completo. SQL: `CREATE INDEX products_category_search_idx ON products(category_id,search_name,id)`
- `products_active_search`: no único; columnas: active, search_name, id; completo. SQL: `CREATE INDEX products_active_search ON products(active,search_name,id)`
- `products_search`: no único; columnas: search_name, id; completo. SQL: `CREATE INDEX products_search ON products(search_name,id)`
- `sqlite_autoindex_products_3`: único; columnas: barcode; completo.
- `sqlite_autoindex_products_2`: único; columnas: sku; completo.
- `sqlite_autoindex_products_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  search_name TEXT NOT NULL,
  category TEXT,
  sale_unit TEXT NOT NULL CHECK(sale_unit IN ('UNIT','KG')),
  price_cents INTEGER NOT NULL CHECK(price_cents BETWEEN 1 AND 9999999999),
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  track_stock INTEGER NOT NULL CHECK(track_stock IN (0,1)),
  stock_initialized INTEGER NOT NULL DEFAULT 0 CHECK(stock_initialized IN (0,1)),
  min_stock_base INTEGER NOT NULL CHECK(min_stock_base BETWEEN 0 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision >= 1),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
, category_id TEXT, brand_id TEXT, internal_barcode TEXT) STRICT;
```

## promotions

Nombre SQL: `promotions`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| name | TEXT | Sí | — | — |
| type | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| priority | INTEGER | Sí | — | — |
| starts_at_utc | TEXT | No | — | — |
| ends_at_utc | TEXT | No | — | — |
| rule_json | TEXT | Sí | — | — |
| targets_json | TEXT | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `promotions_active_window`: no único; columnas: status, starts_at_utc, ends_at_utc, priority; completo. SQL: `CREATE INDEX promotions_active_window ON promotions(status,starts_at_utc,ends_at_utc,priority)`
- `sqlite_autoindex_promotions_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE promotions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('PERCENT','X_FOR_Y','QUANTITY_PRICE','COMBO_PRICE')),
  status TEXT NOT NULL CHECK(status IN ('DRAFT','ACTIVE','PAUSED')),
  priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 100),
  starts_at_utc TEXT,
  ends_at_utc TEXT,
  rule_json TEXT NOT NULL CHECK(json_valid(rule_json)),
  targets_json TEXT NOT NULL CHECK(json_valid(targets_json)),
  revision INTEGER NOT NULL CHECK(revision>0),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  CHECK(ends_at_utc IS NULL OR starts_at_utc IS NULL OR ends_at_utc>starts_at_utc)
) STRICT;
```

## purchase-drafts

Nombre SQL: `purchase_drafts`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| user_id | TEXT | Sí | — | 1 |
| terminal_id | TEXT | No | — | — |
| revision | INTEGER | Sí | — | — |
| body_json | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `terminal_id` → `terminals.id`; al actualizar: NO ACTION; al borrar: SET NULL.
- `user_id` → `users.id`; al actualizar: NO ACTION; al borrar: CASCADE.

**Índices**

- `sqlite_autoindex_purchase_drafts_1`: único; columnas: user_id; completo.

**Definición efectiva**

```sql
CREATE TABLE purchase_drafts (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terminal_id TEXT REFERENCES terminals(id) ON DELETE SET NULL,
  revision INTEGER NOT NULL CHECK(revision>0),
  body_json TEXT NOT NULL CHECK(json_valid(body_json)),
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## purchase-events

Nombre SQL: `purchase_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| purchase_id | TEXT | Sí | — | — |
| kind | TEXT | Sí | — | — |
| reason | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| result_json | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_id` → `purchases.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `purchase_events_purchase`: no único; columnas: purchase_id, created_at_utc; completo. SQL: `CREATE INDEX purchase_events_purchase ON purchase_events(purchase_id,created_at_utc)`
- `sqlite_autoindex_purchase_events_3`: único; columnas: purchase_id, kind; completo.
- `sqlite_autoindex_purchase_events_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_purchase_events_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE purchase_events (
  id TEXT PRIMARY KEY NOT NULL,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('RECEIVED','VOIDED')),
  reason TEXT NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  UNIQUE(purchase_id,kind)
) STRICT;
```

## purchase-items

Nombre SQL: `purchase_items`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| purchase_id | TEXT | Sí | — | — |
| position | INTEGER | Sí | — | — |
| line_id | TEXT | Sí | — | — |
| product_id | TEXT | Sí | — | — |
| sku | TEXT | Sí | — | — |
| barcode | TEXT | No | — | — |
| name | TEXT | Sí | — | — |
| unit | TEXT | Sí | — | — |
| quantity_base | INTEGER | Sí | — | — |
| unit_cost_cents | INTEGER | Sí | — | — |
| subtotal_cents | INTEGER | Sí | — | — |
| product_revision | INTEGER | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_id` → `purchases.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `purchase_items_product_purchase`: no único; columnas: product_id, purchase_id; completo. SQL: `CREATE INDEX purchase_items_product_purchase ON purchase_items(product_id,purchase_id)`
- `sqlite_autoindex_purchase_items_4`: único; columnas: purchase_id, product_id; completo.
- `sqlite_autoindex_purchase_items_3`: único; columnas: purchase_id, line_id; completo.
- `sqlite_autoindex_purchase_items_2`: único; columnas: purchase_id, position; completo.
- `sqlite_autoindex_purchase_items_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE purchase_items (
  id TEXT PRIMARY KEY NOT NULL,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK(position>=0),
  line_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK(unit IN ('UNIT','KG')),
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 1 AND 1000000000),
  unit_cost_cents INTEGER NOT NULL CHECK(unit_cost_cents BETWEEN 1 AND 9999999999),
  subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents BETWEEN 0 AND 9999999999),
  product_revision INTEGER NOT NULL CHECK(product_revision>0),
  UNIQUE(purchase_id,position),
  UNIQUE(purchase_id,line_id),
  UNIQUE(purchase_id,product_id)
) STRICT;
```

## purchases

Nombre SQL: `purchases`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| number | INTEGER | Sí | — | — |
| receipt_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| supplier_id | TEXT | Sí | — | — |
| supplier_name | TEXT | Sí | — | — |
| supplier_phone | TEXT | No | — | — |
| status | TEXT | Sí | — | — |
| received_at_utc | TEXT | Sí | — | — |
| business_date | TEXT | Sí | — | — |
| total_cents | INTEGER | Sí | — | — |
| stock_applied | INTEGER | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `supplier_id` → `suppliers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `purchases_status_number`: no único; columnas: status, number; completo. SQL: `CREATE INDEX purchases_status_number ON purchases(status,number DESC)`
- `purchases_supplier_date`: no único; columnas: supplier_id, business_date, number; completo. SQL: `CREATE INDEX purchases_supplier_date ON purchases(supplier_id,business_date DESC,number DESC)`
- `purchases_date_number`: no único; columnas: business_date, number; completo. SQL: `CREATE INDEX purchases_date_number ON purchases(business_date,number DESC)`
- `sqlite_autoindex_purchases_3`: único; columnas: receipt_key; completo.
- `sqlite_autoindex_purchases_2`: único; columnas: number; completo.
- `sqlite_autoindex_purchases_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE purchases (
  id TEXT PRIMARY KEY NOT NULL,
  number INTEGER NOT NULL UNIQUE CHECK(number>0),
  receipt_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  status TEXT NOT NULL CHECK(status IN ('RECEIVED','VOIDED')),
  received_at_utc TEXT NOT NULL,
  business_date TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK(total_cents BETWEEN 0 AND 9999999999),
  stock_applied INTEGER NOT NULL CHECK(stock_applied IN (0,1)),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL
) STRICT;
```

## register-movements

Nombre SQL: `register_movements`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| shift_id | TEXT | Sí | — | — |
| kind | TEXT | Sí | — | — |
| amount_cents | INTEGER | Sí | — | — |
| reason | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| sale_id | TEXT | No | — | — |
| return_id | TEXT | No | — | — |
| supplier_payment_id | TEXT | No | — | — |
| customer_collection_id | TEXT | No | — | — |

**Relaciones**

- `customer_collection_id` → `customer_collections.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `supplier_payment_id` → `supplier_payments.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_id` → `sale_returns.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `shift_id` → `register_shifts.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `register_customer_collection`: único; columnas: customer_collection_id; parcial. SQL: `CREATE UNIQUE INDEX register_customer_collection ON register_movements(customer_collection_id) WHERE customer_collection_id IS NOT NULL`
- `register_supplier_payment`: único; columnas: supplier_payment_id; parcial. SQL: `CREATE UNIQUE INDEX register_supplier_payment ON register_movements(supplier_payment_id)
  WHERE supplier_payment_id IS NOT NULL`
- `register_return_refund`: único; columnas: return_id; parcial. SQL: `CREATE UNIQUE INDEX register_return_refund ON register_movements(return_id)
  WHERE return_id IS NOT NULL`
- `register_movements_shift`: no único; columnas: shift_id; completo. SQL: `CREATE INDEX register_movements_shift ON register_movements(shift_id)`
- `one_cash_refund_per_sale`: único; columnas: sale_id; parcial. SQL: `CREATE UNIQUE INDEX one_cash_refund_per_sale ON register_movements(sale_id) WHERE kind='REFUND'`
- `sqlite_autoindex_register_movements_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_register_movements_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE register_movements (
 id TEXT PRIMARY KEY NOT NULL, shift_id TEXT NOT NULL REFERENCES register_shifts(id),
 kind TEXT NOT NULL CHECK(kind IN ('IN','OUT','REFUND')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999), reason TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), created_at_utc TEXT NOT NULL,
 operation_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 sale_id TEXT REFERENCES sales(id)
, return_id TEXT REFERENCES sale_returns(id) ON DELETE RESTRICT, supplier_payment_id TEXT REFERENCES supplier_payments(id) ON DELETE RESTRICT, customer_collection_id TEXT REFERENCES customer_collections(id) ON DELETE RESTRICT) STRICT;
```

## register-shifts

Nombre SQL: `register_shifts`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| terminal_id | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| opening_cash_cents | INTEGER | Sí | — | — |
| opened_by | TEXT | Sí | — | — |
| opened_at_utc | TEXT | Sí | — | — |
| closed_by | TEXT | No | — | — |
| closed_at_utc | TEXT | No | — | — |
| counted_cash_cents | INTEGER | No | — | — |
| expected_cash_cents | INTEGER | No | — | — |
| difference_cents | INTEGER | No | — | — |
| revision | INTEGER | Sí | 1 | — |
| open_key | TEXT | Sí | — | — |
| open_hash | TEXT | Sí | — | — |
| close_key | TEXT | No | — | — |
| close_hash | TEXT | No | — | — |

**Relaciones**

- `closed_by` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `opened_by` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `terminal_id` → `terminals.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `shifts_date`: no único; columnas: opened_at_utc, id; completo. SQL: `CREATE INDEX shifts_date ON register_shifts(opened_at_utc,id)`
- `one_open_shift_per_terminal`: único; columnas: terminal_id; parcial. SQL: `CREATE UNIQUE INDEX one_open_shift_per_terminal ON register_shifts(terminal_id) WHERE status='OPEN'`
- `sqlite_autoindex_register_shifts_3`: único; columnas: close_key; completo.
- `sqlite_autoindex_register_shifts_2`: único; columnas: open_key; completo.
- `sqlite_autoindex_register_shifts_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE register_shifts (
 id TEXT PRIMARY KEY NOT NULL, terminal_id TEXT NOT NULL REFERENCES terminals(id),
 status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED')),
 opening_cash_cents INTEGER NOT NULL CHECK(opening_cash_cents BETWEEN 0 AND 9999999999),
 opened_by TEXT NOT NULL REFERENCES users(id), opened_at_utc TEXT NOT NULL,
 closed_by TEXT REFERENCES users(id), closed_at_utc TEXT,
 counted_cash_cents INTEGER, expected_cash_cents INTEGER, difference_cents INTEGER,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 open_key TEXT NOT NULL UNIQUE, open_hash TEXT NOT NULL,
 close_key TEXT UNIQUE, close_hash TEXT,
 CHECK((status='OPEN' AND closed_at_utc IS NULL) OR (status='CLOSED' AND closed_at_utc IS NOT NULL))
) STRICT;
```

## replenishment-calendars

Nombre SQL: `replenishment_calendars`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| location_id | TEXT | Sí | — | 1 |
| revision | INTEGER | Sí | — | — |
| weekdays_json | TEXT | Sí | — | — |
| closed_dates_json | TEXT | Sí | — | — |

**Relaciones**

- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `sqlite_autoindex_replenishment_calendars_1`: único; columnas: location_id; completo.

**Definición efectiva**

```sql
CREATE TABLE replenishment_calendars (
  location_id TEXT PRIMARY KEY REFERENCES locations(id), revision INTEGER NOT NULL CHECK(revision>0),
  weekdays_json TEXT NOT NULL CHECK(json_valid(weekdays_json)), closed_dates_json TEXT NOT NULL CHECK(json_valid(closed_dates_json))
) STRICT;
```

## replenishment-events

Nombre SQL: `replenishment_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| operation_key | TEXT | Sí | — | 1 |
| order_id | TEXT | Sí | — | — |
| action | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| result_json | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `order_id` → `replenishment_orders.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `sqlite_autoindex_replenishment_events_1`: único; columnas: operation_key; completo.

**Definición efectiva**

```sql
CREATE TABLE replenishment_events (
  operation_key TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES replenishment_orders(id), action TEXT NOT NULL,
  payload_hash TEXT NOT NULL, result_json TEXT NOT NULL CHECK(json_valid(result_json)), actor_user_id TEXT NOT NULL REFERENCES users(id),
  created_at_utc TEXT NOT NULL
) STRICT;
```

## replenishment-order-lines

Nombre SQL: `replenishment_order_lines`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| order_id | TEXT | Sí | — | — |
| product_id | TEXT | Sí | — | — |
| name | TEXT | Sí | — | — |
| unit | TEXT | Sí | — | — |
| product_revision | INTEGER | Sí | — | — |
| stock_revision | INTEGER | Sí | — | — |
| ordered_base | INTEGER | Sí | — | — |
| received_base | INTEGER | Sí | 0 | — |
| cancelled_base | INTEGER | Sí | 0 | — |
| estimated_cost_cents | INTEGER | No | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `order_id` → `replenishment_orders.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `replenishment_lines_product`: no único; columnas: product_id, order_id; completo. SQL: `CREATE INDEX replenishment_lines_product ON replenishment_order_lines(product_id,order_id)`
- `sqlite_autoindex_replenishment_order_lines_2`: único; columnas: order_id, product_id; completo.
- `sqlite_autoindex_replenishment_order_lines_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE replenishment_order_lines (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES replenishment_orders(id), product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('UNIT','KG')), product_revision INTEGER NOT NULL CHECK(product_revision>0), stock_revision INTEGER NOT NULL CHECK(stock_revision>=0),
  ordered_base INTEGER NOT NULL CHECK(ordered_base BETWEEN 1 AND 1000000000), received_base INTEGER NOT NULL DEFAULT 0 CHECK(received_base>=0),
  cancelled_base INTEGER NOT NULL DEFAULT 0 CHECK(cancelled_base>=0), estimated_cost_cents INTEGER CHECK(estimated_cost_cents BETWEEN 0 AND 9999999999),
  CHECK(received_base+cancelled_base<=ordered_base), UNIQUE(order_id,product_id)
) STRICT;
```

## replenishment-orders

Nombre SQL: `replenishment_orders`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| number | INTEGER | Sí | — | — |
| supplier_id | TEXT | Sí | — | — |
| location_id | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| expected_date | TEXT | No | — | — |
| revision | INTEGER | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `supplier_id` → `suppliers.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `replenishment_orders_pending`: no único; columnas: location_id, status, expected_date; completo. SQL: `CREATE INDEX replenishment_orders_pending ON replenishment_orders(location_id,status,expected_date)`
- `sqlite_autoindex_replenishment_orders_2`: único; columnas: number; completo.
- `sqlite_autoindex_replenishment_orders_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE replenishment_orders (
  id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE CHECK(number>0), supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  location_id TEXT NOT NULL REFERENCES locations(id), status TEXT NOT NULL CHECK(status IN ('DRAFT','ORDERED','PARTIAL','RECEIVED','CANCELLED')),
  expected_date TEXT, revision INTEGER NOT NULL CHECK(revision>0), actor_user_id TEXT NOT NULL REFERENCES users(id), created_at_utc TEXT NOT NULL
) STRICT;
```

## replenishment-product-rules

Nombre SQL: `replenishment_product_rules`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| product_id | TEXT | Sí | — | 1 |
| revision | INTEGER | Sí | — | — |
| purchase_multiple_base | INTEGER | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `sqlite_autoindex_replenishment_product_rules_1`: único; columnas: product_id; completo.

**Definición efectiva**

```sql
CREATE TABLE replenishment_product_rules (
  product_id TEXT PRIMARY KEY REFERENCES products(id),revision INTEGER NOT NULL CHECK(revision>0),purchase_multiple_base INTEGER NOT NULL CHECK(purchase_multiple_base BETWEEN 1 AND 1000000000)
) STRICT;
```

## replenishment-receipts

Nombre SQL: `replenishment_receipts`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| line_id | TEXT | Sí | — | 1 |
| purchase_item_id | TEXT | Sí | — | 2 |
| quantity_base | INTEGER | Sí | — | — |

**Relaciones**

- `purchase_item_id` → `purchase_items.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `line_id` → `replenishment_order_lines.id`; al actualizar: NO ACTION; al borrar: NO ACTION.

**Índices**

- `sqlite_autoindex_replenishment_receipts_2`: único; columnas: line_id, purchase_item_id; completo.
- `sqlite_autoindex_replenishment_receipts_1`: único; columnas: purchase_item_id; completo.

**Definición efectiva**

```sql
CREATE TABLE replenishment_receipts (
  line_id TEXT NOT NULL REFERENCES replenishment_order_lines(id), purchase_item_id TEXT NOT NULL UNIQUE REFERENCES purchase_items(id),
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0), PRIMARY KEY(line_id,purchase_item_id)
) STRICT;
```

## sale-events

Nombre SQL: `sale_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| sale_id | TEXT | Sí | — | — |
| kind | TEXT | Sí | — | — |
| reason | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| clock_warning | TEXT | No | — | — |
| actor_user_id | TEXT | No | — | — |
| actor_name | TEXT | No | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sale_events_clock`: no único; columnas: created_at_utc; completo. SQL: `CREATE INDEX sale_events_clock ON sale_events(created_at_utc)`
- `sqlite_autoindex_sale_events_3`: único; columnas: sale_id, kind; completo.
- `sqlite_autoindex_sale_events_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_sale_events_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_events (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('COMPLETED','VOIDED')), reason TEXT NOT NULL,
 operation_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL, created_at_utc TEXT NOT NULL, clock_warning TEXT, actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, actor_name TEXT,
 UNIQUE(sale_id,kind)
) STRICT;
```

## sale-item-lots

Nombre SQL: `sale_item_lots`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| sale_item_id | TEXT | Sí | — | 1 |
| lot_id | TEXT | Sí | — | 2 |
| quantity_base | INTEGER | Sí | — | — |

**Relaciones**

- `lot_id` → `inventory_lots.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_item_id` → `sale_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_sale_item_lots_1`: único; columnas: sale_item_id, lot_id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_item_lots (
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0),
  PRIMARY KEY(sale_item_id,lot_id)
) STRICT;
```

## sale-items

Nombre SQL: `sale_items`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| sale_id | TEXT | Sí | — | — |
| line_id | TEXT | Sí | — | — |
| position | INTEGER | Sí | — | — |
| product_id | TEXT | Sí | — | — |
| sku | TEXT | Sí | — | — |
| barcode | TEXT | No | — | — |
| name | TEXT | Sí | — | — |
| unit | TEXT | Sí | — | — |
| unit_price_cents | INTEGER | Sí | — | — |
| quantity_base | INTEGER | Sí | — | — |
| gross_cents | INTEGER | Sí | — | — |
| discount_cents | INTEGER | Sí | — | — |
| net_cents | INTEGER | Sí | — | — |
| cost_method | TEXT | No | — | — |
| cost_rate_micros_per_base | INTEGER | No | — | — |
| cost_cents | INTEGER | No | — | — |
| cost_effective_at_utc | TEXT | No | — | — |
| category_name | TEXT | No | — | — |
| promotion_discount_cents | INTEGER | Sí | 0 | — |
| manual_discount_cents | INTEGER | Sí | 0 | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sale_items_product`: no único; columnas: product_id, sale_id; completo. SQL: `CREATE INDEX sale_items_product ON sale_items(product_id,sale_id)`
- `sqlite_autoindex_sale_items_3`: único; columnas: sale_id, position; completo.
- `sqlite_autoindex_sale_items_2`: único; columnas: sale_id, line_id; completo.
- `sqlite_autoindex_sale_items_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_items (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 line_id TEXT NOT NULL, position INTEGER NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 sku TEXT NOT NULL, barcode TEXT, name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('UNIT','KG')),
 unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents BETWEEN 1 AND 9999999999),
 quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 1 AND 1000000000),
 gross_cents INTEGER NOT NULL CHECK(gross_cents BETWEEN 0 AND 9999999999),
 discount_cents INTEGER NOT NULL CHECK(discount_cents BETWEEN 0 AND gross_cents),
 net_cents INTEGER NOT NULL CHECK(net_cents = gross_cents - discount_cents), cost_method TEXT CHECK(cost_method IS NULL OR cost_method IN ('WEIGHTED_AVERAGE','REFERENCE')), cost_rate_micros_per_base INTEGER CHECK(cost_rate_micros_per_base IS NULL OR cost_rate_micros_per_base>0), cost_cents INTEGER CHECK(cost_cents IS NULL OR cost_cents>=0), cost_effective_at_utc TEXT, category_name TEXT, promotion_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(promotion_discount_cents>=0), manual_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(manual_discount_cents>=0),
 UNIQUE(sale_id,line_id), UNIQUE(sale_id,position)
) STRICT;
```

## sale-payments

Nombre SQL: `sale_payments`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| sale_id | TEXT | Sí | — | — |
| position | INTEGER | Sí | — | — |
| method | TEXT | Sí | — | — |
| amount_cents | INTEGER | Sí | — | — |
| tendered_cents | INTEGER | No | — | — |
| change_cents | INTEGER | Sí | — | — |

**Relaciones**

- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_sale_payments_2`: único; columnas: sale_id, position; completo.
- `sqlite_autoindex_sale_payments_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_payments (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 position INTEGER NOT NULL, method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
 tendered_cents INTEGER CHECK(tendered_cents BETWEEN amount_cents AND 9999999999),
 change_cents INTEGER NOT NULL CHECK(change_cents >= 0),
 CHECK(method = 'CASH' OR (tendered_cents IS NULL AND change_cents = 0)),
 CHECK(change_cents = COALESCE(tendered_cents,amount_cents) - amount_cents), UNIQUE(sale_id,position)
) STRICT;
```

## sale-promotion-allocations

Nombre SQL: `sale_promotion_allocations`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| sale_promotion_id | TEXT | Sí | — | 1 |
| sale_item_id | TEXT | Sí | — | 2 |
| quantity_base | INTEGER | Sí | — | — |
| discount_cents | INTEGER | Sí | — | — |

**Relaciones**

- `sale_item_id` → `sale_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_promotion_id` → `sale_promotions.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_sale_promotion_allocations_1`: único; columnas: sale_promotion_id, sale_item_id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_promotion_allocations (
  sale_promotion_id TEXT NOT NULL REFERENCES sale_promotions(id) ON DELETE RESTRICT,
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0),
  discount_cents INTEGER NOT NULL CHECK(discount_cents>0),
  PRIMARY KEY(sale_promotion_id,sale_item_id)
) STRICT;
```

## sale-promotions

Nombre SQL: `sale_promotions`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| sale_id | TEXT | Sí | — | — |
| promotion_id | TEXT | Sí | — | — |
| promotion_name | TEXT | Sí | — | — |
| promotion_revision | INTEGER | Sí | — | — |
| discount_cents | INTEGER | Sí | — | — |
| snapshot_json | TEXT | Sí | — | — |

**Relaciones**

- `promotion_id` → `promotions.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_sale_promotions_2`: único; columnas: sale_id, promotion_id, promotion_revision; completo.
- `sqlite_autoindex_sale_promotions_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_promotions (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
  promotion_name TEXT NOT NULL,
  promotion_revision INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL CHECK(discount_cents>0),
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  UNIQUE(sale_id,promotion_id,promotion_revision)
) STRICT;
```

## sale-receipts

Nombre SQL: `sale_receipts`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| sale_id | TEXT | Sí | — | — |
| sale_number | INTEGER | Sí | — | — |
| format | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| snapshot_json | TEXT | Sí | — | — |
| reprint_reason | TEXT | No | — | — |
| requested_by | TEXT | No | — | — |
| requested_by_name | TEXT | No | — | — |
| created_at_utc | TEXT | Sí | — | — |
| printed_at_utc | TEXT | No | — | — |

**Relaciones**

- `requested_by` → `users.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sale_receipts_status`: no único; columnas: status, created_at_utc; completo. SQL: `CREATE INDEX sale_receipts_status ON sale_receipts(status,created_at_utc)`
- `sale_receipts_sale`: no único; columnas: sale_id, created_at_utc; completo. SQL: `CREATE INDEX sale_receipts_sale ON sale_receipts(sale_id,created_at_utc)`
- `sqlite_autoindex_sale_receipts_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  sale_number INTEGER NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('THERMAL_58','THERMAL_80','A4')),
  status TEXT NOT NULL CHECK(status IN ('PENDING','PRINTED')),
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  reprint_reason TEXT,
  requested_by TEXT REFERENCES users(id),
  requested_by_name TEXT,
  created_at_utc TEXT NOT NULL,
  printed_at_utc TEXT,
  CHECK((status='PENDING' AND printed_at_utc IS NULL) OR (status='PRINTED' AND printed_at_utc IS NOT NULL))
) STRICT;
```

## sale-return-events

Nombre SQL: `sale_return_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| return_id | TEXT | Sí | — | — |
| kind | TEXT | Sí | — | — |
| reason | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_id` → `sale_returns.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_sale_return_events_2`: único; columnas: return_id, kind; completo.
- `sqlite_autoindex_sale_return_events_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_return_events (
  id TEXT PRIMARY KEY NOT NULL,
  return_id TEXT NOT NULL REFERENCES sale_returns(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind='CONFIRMED'),
  reason TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  UNIQUE(return_id,kind)
) STRICT;
```

## sale-return-item-lots

Nombre SQL: `sale_return_item_lots`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| return_item_id | TEXT | Sí | — | 1 |
| lot_id | TEXT | Sí | — | 2 |
| quantity_base | INTEGER | Sí | — | — |

**Relaciones**

- `lot_id` → `inventory_lots.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_item_id` → `sale_return_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_sale_return_item_lots_1`: único; columnas: return_item_id, lot_id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_return_item_lots (
  return_item_id TEXT NOT NULL REFERENCES sale_return_items(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0),
  PRIMARY KEY(return_item_id,lot_id)
) STRICT;
```

## sale-return-items

Nombre SQL: `sale_return_items`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| return_id | TEXT | Sí | — | — |
| sale_item_id | TEXT | Sí | — | — |
| product_id | TEXT | Sí | — | — |
| quantity_base | INTEGER | Sí | — | — |
| gross_cents | INTEGER | Sí | — | — |
| discount_cents | INTEGER | Sí | — | — |
| net_cents | INTEGER | Sí | — | — |
| cost_cents | INTEGER | No | — | — |
| disposition | TEXT | Sí | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_item_id` → `sale_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_id` → `sale_returns.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sale_return_items_sale_item`: no único; columnas: sale_item_id, return_id; completo. SQL: `CREATE INDEX sale_return_items_sale_item ON sale_return_items(sale_item_id,return_id)`
- `sqlite_autoindex_sale_return_items_2`: único; columnas: return_id, sale_item_id; completo.
- `sqlite_autoindex_sale_return_items_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_return_items (
  id TEXT PRIMARY KEY NOT NULL,
  return_id TEXT NOT NULL REFERENCES sale_returns(id) ON DELETE RESTRICT,
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 1 AND 1000000000),
  gross_cents INTEGER NOT NULL CHECK(gross_cents>=0),
  discount_cents INTEGER NOT NULL CHECK(discount_cents>=0),
  net_cents INTEGER NOT NULL CHECK(net_cents=gross_cents-discount_cents),
  cost_cents INTEGER CHECK(cost_cents IS NULL OR cost_cents>=0),
  disposition TEXT NOT NULL CHECK(disposition IN ('RESTOCK','WASTE','NONE')),
  UNIQUE(return_id,sale_item_id)
) STRICT;
```

## sale-return-refunds

Nombre SQL: `sale_return_refunds`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| return_id | TEXT | Sí | — | — |
| method | TEXT | Sí | — | — |
| amount_cents | INTEGER | Sí | — | — |
| register_shift_id | TEXT | No | — | — |
| register_movement_id | TEXT | No | — | — |

**Relaciones**

- `register_movement_id` → `register_movements.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `register_shift_id` → `register_shifts.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_id` → `sale_returns.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_sale_return_refunds_2`: único; columnas: return_id; completo.
- `sqlite_autoindex_sale_return_refunds_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_return_refunds (
  id TEXT PRIMARY KEY NOT NULL,
  return_id TEXT NOT NULL UNIQUE REFERENCES sale_returns(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 0 AND 9999999999),
  register_shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
  register_movement_id TEXT REFERENCES register_movements(id) ON DELETE RESTRICT
) STRICT;
```

## sale-returns

Nombre SQL: `sale_returns`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| number | INTEGER | Sí | — | — |
| sale_id | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| input_json | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| reason | TEXT | Sí | — | — |
| total_cents | INTEGER | Sí | — | — |
| cost_cents | INTEGER | No | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| business_date | TEXT | Sí | — | — |
| local_month | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sale_returns_month`: no único; columnas: local_month, status; completo. SQL: `CREATE INDEX sale_returns_month ON sale_returns(local_month,status)`
- `sale_returns_sale_number`: no único; columnas: sale_id, number; completo. SQL: `CREATE INDEX sale_returns_sale_number ON sale_returns(sale_id,number)`
- `sqlite_autoindex_sale_returns_3`: único; columnas: operation_key; completo.
- `sqlite_autoindex_sale_returns_2`: único; columnas: number; completo.
- `sqlite_autoindex_sale_returns_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sale_returns (
  id TEXT PRIMARY KEY NOT NULL,
  number INTEGER NOT NULL UNIQUE CHECK(number>0),
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  input_json TEXT NOT NULL CHECK(json_valid(input_json)),
  status TEXT NOT NULL CHECK(status='CONFIRMED'),
  reason TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK(total_cents BETWEEN 0 AND 9999999999),
  cost_cents INTEGER CHECK(cost_cents IS NULL OR cost_cents BETWEEN 0 AND 9999999999),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  business_date TEXT NOT NULL,
  local_month TEXT NOT NULL
) STRICT;
```

## sales

Nombre SQL: `sales`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| number | INTEGER | Sí | — | — |
| checkout_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| business_date | TEXT | Sí | — | — |
| local_month | TEXT | Sí | — | — |
| subtotal_cents | INTEGER | Sí | — | — |
| discount_cents | INTEGER | Sí | — | — |
| total_cents | INTEGER | Sí | — | — |
| discount_json | TEXT | Sí | — | — |
| actor_user_id | TEXT | No | — | — |
| actor_name | TEXT | No | — | — |
| terminal_id | TEXT | No | — | — |
| register_shift_id | TEXT | No | — | — |
| promotions_json | TEXT | Sí | '[]' | — |
| customer_id | TEXT | No | — | — |
| customer_name | TEXT | No | — | — |
| on_account_cents | INTEGER | Sí | 0 | — |
| location_id | TEXT | No | — | — |

**Relaciones**

- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `customer_id` → `customers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `register_shift_id` → `register_shifts.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `terminal_id` → `terminals.id`; al actualizar: NO ACTION; al borrar: NO ACTION.
- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sales_location_date`: no único; columnas: location_id, business_date, status; completo. SQL: `CREATE INDEX sales_location_date ON sales(location_id,business_date,status)`
- `sales_customer_date`: no único; columnas: customer_id, created_at_utc; parcial. SQL: `CREATE INDEX sales_customer_date ON sales(customer_id,created_at_utc DESC) WHERE customer_id IS NOT NULL`
- `sales_shift`: no único; columnas: register_shift_id, status; completo. SQL: `CREATE INDEX sales_shift ON sales(register_shift_id,status)`
- `sales_month`: no único; columnas: local_month, status; completo. SQL: `CREATE INDEX sales_month ON sales(local_month,status)`
- `sales_status_number`: no único; columnas: status, number; completo. SQL: `CREATE INDEX sales_status_number ON sales(status,number DESC)`
- `sales_date_number`: no único; columnas: business_date, number; completo. SQL: `CREATE INDEX sales_date_number ON sales(business_date,number DESC)`
- `sqlite_autoindex_sales_3`: único; columnas: checkout_key; completo.
- `sqlite_autoindex_sales_2`: único; columnas: number; completo.
- `sqlite_autoindex_sales_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE sales (
 id TEXT PRIMARY KEY NOT NULL, number INTEGER NOT NULL UNIQUE CHECK(number > 0),
 checkout_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('COMPLETED','VOIDED')),
 created_at_utc TEXT NOT NULL, business_date TEXT NOT NULL, local_month TEXT NOT NULL,
 subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents BETWEEN 0 AND 9999999999),
 discount_cents INTEGER NOT NULL CHECK(discount_cents BETWEEN 0 AND subtotal_cents),
 total_cents INTEGER NOT NULL CHECK(total_cents = subtotal_cents - discount_cents),
 discount_json TEXT NOT NULL CHECK(json_valid(discount_json))
, actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, actor_name TEXT, terminal_id TEXT REFERENCES terminals(id), register_shift_id TEXT REFERENCES register_shifts(id), promotions_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(promotions_json)), customer_id TEXT REFERENCES customers(id) ON DELETE RESTRICT, customer_name TEXT, on_account_cents INTEGER NOT NULL DEFAULT 0 CHECK(on_account_cents BETWEEN 0 AND total_cents), location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT) STRICT;
```

## saved-views

Nombre SQL: `saved_views`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| user_id | TEXT | Sí | — | — |
| module | TEXT | Sí | — | — |
| name | TEXT | Sí | — | — |
| filters_json | TEXT | Sí | — | — |
| dates | TEXT | Sí | — | — |
| filter_schema_version | INTEGER | Sí | 1 | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `user_id` → `users.id`; al actualizar: NO ACTION; al borrar: CASCADE.

**Índices**

- `saved_views_user`: no único; columnas: user_id, module, name, id; completo. SQL: `CREATE INDEX saved_views_user ON saved_views(user_id,module,name,id)`
- `sqlite_autoindex_saved_views_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE saved_views (
 id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 module TEXT NOT NULL,name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
 filters_json TEXT NOT NULL CHECK(json_valid(filters_json)),dates TEXT NOT NULL CHECK(dates IN ('FIXED','WEEK','MONTH')),
 filter_schema_version INTEGER NOT NULL DEFAULT 1,revision INTEGER NOT NULL CHECK(revision>0),
 created_at_utc TEXT NOT NULL,updated_at_utc TEXT NOT NULL
) STRICT;
```

## schema-migrations

Nombre SQL: `schema_migrations`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| version | INTEGER | No | — | 1 |
| applied_at | TEXT | Sí | — | — |
| checksum | TEXT | No | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

Sin índices adicionales.

**Definición efectiva**

```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL,
    checksum TEXT
  ) STRICT;
```

## stock-movements

Nombre SQL: `stock_movements`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| sequence | INTEGER | No | — | 1 |
| id | TEXT | Sí | — | — |
| product_id | TEXT | Sí | — | — |
| delta_base | INTEGER | Sí | — | — |
| balance_after_base | INTEGER | Sí | — | — |
| kind | TEXT | Sí | — | — |
| reason | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| result_json | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| business_date | TEXT | Sí | — | — |
| sale_id | TEXT | No | — | — |
| sale_item_id | TEXT | No | — | — |
| actor_user_id | TEXT | No | — | — |
| actor_name | TEXT | No | — | — |
| purchase_id | TEXT | No | — | — |
| purchase_item_id | TEXT | No | — | — |
| return_id | TEXT | No | — | — |
| return_item_id | TEXT | No | — | — |
| location_id | TEXT | No | — | — |
| transfer_id | TEXT | No | — | — |
| transfer_item_id | TEXT | No | — | — |

**Relaciones**

- `transfer_item_id` → `stock_transfer_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `transfer_id` → `stock_transfers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_item_id` → `sale_return_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `return_id` → `sale_returns.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_item_id` → `purchase_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_id` → `purchases.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_item_id` → `sale_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `sale_id` → `sales.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `stock_return_item_kind`: único; columnas: return_item_id, kind; parcial. SQL: `CREATE UNIQUE INDEX stock_return_item_kind ON stock_movements(return_item_id,kind)
  WHERE return_item_id IS NOT NULL`
- `stock_return_sequence`: no único; columnas: return_id, sequence; completo. SQL: `CREATE INDEX stock_return_sequence ON stock_movements(return_id,sequence)`
- `stock_purchase_item_kind`: único; columnas: purchase_item_id, kind; parcial. SQL: `CREATE UNIQUE INDEX stock_purchase_item_kind ON stock_movements(purchase_item_id,kind)
  WHERE purchase_item_id IS NOT NULL`
- `stock_purchase_sequence`: no único; columnas: purchase_id, sequence; completo. SQL: `CREATE INDEX stock_purchase_sequence ON stock_movements(purchase_id,sequence)`
- `stock_movements_clock`: no único; columnas: created_at_utc; completo. SQL: `CREATE INDEX stock_movements_clock ON stock_movements(created_at_utc)`
- `stock_sale_sequence`: no único; columnas: sale_id, sequence; completo. SQL: `CREATE INDEX stock_sale_sequence ON stock_movements(sale_id,sequence)`
- `stock_sale_item_kind`: único; columnas: sale_item_id, kind; parcial. SQL: `CREATE UNIQUE INDEX stock_sale_item_kind ON stock_movements(sale_item_id,kind) WHERE sale_item_id IS NOT NULL`
- `stock_movements_product_date`: no único; columnas: product_id, business_date, sequence; completo. SQL: `CREATE INDEX stock_movements_product_date ON stock_movements(product_id, business_date, sequence DESC)`
- `stock_movements_product_sequence`: no único; columnas: product_id, sequence; completo. SQL: `CREATE INDEX stock_movements_product_sequence ON stock_movements(product_id, sequence DESC)`
- `sqlite_autoindex_stock_movements_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_stock_movements_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE stock_movements (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  delta_base INTEGER NOT NULL CHECK(delta_base BETWEEN -2000000000 AND 2000000000),
  balance_after_base INTEGER NOT NULL CHECK(balance_after_base BETWEEN -1000000000 AND 1000000000),
  kind TEXT NOT NULL CHECK(kind IN ('OPENING','RECEIPT','WASTE','ADJUSTMENT','SALE','VOID')),
  reason TEXT NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  created_at_utc TEXT NOT NULL,
  business_date TEXT NOT NULL, sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT, sale_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT, actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, actor_name TEXT, purchase_id TEXT REFERENCES purchases(id) ON DELETE RESTRICT, purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT, return_id TEXT REFERENCES sale_returns(id) ON DELETE RESTRICT, return_item_id TEXT REFERENCES sale_return_items(id) ON DELETE RESTRICT, location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT, transfer_id TEXT REFERENCES stock_transfers(id) ON DELETE RESTRICT, transfer_item_id TEXT REFERENCES stock_transfer_items(id) ON DELETE RESTRICT,
  CHECK(delta_base != 0 OR kind IN ('OPENING','ADJUSTMENT')),
  CHECK(kind != 'RECEIPT' OR delta_base > 0),
  CHECK(kind != 'WASTE' OR delta_base < 0)
) STRICT;
```

## stock-transfer-events

Nombre SQL: `stock_transfer_events`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| sequence | INTEGER | No | — | 1 |
| id | TEXT | Sí | — | — |
| transfer_id | TEXT | Sí | — | — |
| kind | TEXT | Sí | — | — |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| result_json | TEXT | Sí | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `transfer_id` → `stock_transfers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `stock_transfer_events_transfer`: no único; columnas: transfer_id, sequence; completo. SQL: `CREATE INDEX stock_transfer_events_transfer ON stock_transfer_events(transfer_id,sequence)`
- `sqlite_autoindex_stock_transfer_events_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_stock_transfer_events_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE stock_transfer_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  transfer_id TEXT NOT NULL REFERENCES stock_transfers(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('DISPATCHED','RECEIVED','CANCELLED')),
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
) STRICT;
```

## stock-transfer-item-lots

Nombre SQL: `stock_transfer_item_lots`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| transfer_item_id | TEXT | Sí | — | 1 |
| lot_id | TEXT | Sí | — | 2 |
| dispatched_base | INTEGER | Sí | — | — |
| received_base | INTEGER | No | — | — |

**Relaciones**

- `lot_id` → `inventory_lots.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `transfer_item_id` → `stock_transfer_items.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_stock_transfer_item_lots_1`: único; columnas: transfer_item_id, lot_id; completo.

**Definición efectiva**

```sql
CREATE TABLE stock_transfer_item_lots (
  transfer_item_id TEXT NOT NULL REFERENCES stock_transfer_items(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  dispatched_base INTEGER NOT NULL CHECK(dispatched_base>0),
  received_base INTEGER CHECK(received_base IS NULL OR received_base>=0),
  PRIMARY KEY(transfer_item_id,lot_id)
) STRICT;
```

## stock-transfer-items

Nombre SQL: `stock_transfer_items`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| transfer_id | TEXT | Sí | — | — |
| product_id | TEXT | Sí | — | — |
| sku | TEXT | Sí | — | — |
| product_name | TEXT | Sí | — | — |
| unit | TEXT | Sí | — | — |
| dispatched_base | INTEGER | Sí | — | — |
| received_base | INTEGER | No | — | — |
| difference_base | INTEGER | No | — | — |
| cost_method | TEXT | No | — | — |
| cost_rate_micros_per_base | INTEGER | No | — | — |

**Relaciones**

- `product_id` → `products.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `transfer_id` → `stock_transfers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `sqlite_autoindex_stock_transfer_items_2`: único; columnas: transfer_id, product_id; completo.
- `sqlite_autoindex_stock_transfer_items_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE stock_transfer_items (
  id TEXT PRIMARY KEY NOT NULL,
  transfer_id TEXT NOT NULL REFERENCES stock_transfers(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK(unit IN ('UNIT','KG')),
  dispatched_base INTEGER NOT NULL CHECK(dispatched_base>0),
  received_base INTEGER CHECK(received_base IS NULL OR received_base>=0),
  difference_base INTEGER CHECK(difference_base IS NULL OR difference_base>=0),
  cost_method TEXT,
  cost_rate_micros_per_base INTEGER,
  UNIQUE(transfer_id,product_id)
) STRICT;
```

## stock-transfers

Nombre SQL: `stock_transfers`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| number | INTEGER | Sí | — | — |
| from_location_id | TEXT | Sí | — | — |
| to_location_id | TEXT | Sí | — | — |
| status | TEXT | Sí | — | — |
| note | TEXT | Sí | — | — |
| dispatched_by | TEXT | Sí | — | — |
| dispatched_by_name | TEXT | Sí | — | — |
| dispatched_at_utc | TEXT | Sí | — | — |
| received_by | TEXT | No | — | — |
| received_by_name | TEXT | No | — | — |
| received_at_utc | TEXT | No | — | — |
| cancelled_by | TEXT | No | — | — |
| cancelled_by_name | TEXT | No | — | — |
| cancelled_at_utc | TEXT | No | — | — |
| cancel_reason | TEXT | No | — | — |
| revision | INTEGER | Sí | — | — |

**Relaciones**

- `cancelled_by` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `received_by` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `dispatched_by` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `to_location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `from_location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `stock_transfers_to_status`: no único; columnas: to_location_id, status; completo. SQL: `CREATE INDEX stock_transfers_to_status ON stock_transfers(to_location_id,status)`
- `stock_transfers_from_status`: no único; columnas: from_location_id, status; completo. SQL: `CREATE INDEX stock_transfers_from_status ON stock_transfers(from_location_id,status)`
- `stock_transfers_status_time`: no único; columnas: status, dispatched_at_utc, id; completo. SQL: `CREATE INDEX stock_transfers_status_time ON stock_transfers(status,dispatched_at_utc DESC,id)`
- `sqlite_autoindex_stock_transfers_2`: único; columnas: number; completo.
- `sqlite_autoindex_stock_transfers_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE stock_transfers (
  id TEXT PRIMARY KEY NOT NULL,
  number INTEGER NOT NULL UNIQUE CHECK(number>0),
  from_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  to_location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('IN_TRANSIT','RECEIVED','CANCELLED')),
  note TEXT NOT NULL,
  dispatched_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  dispatched_by_name TEXT NOT NULL,
  dispatched_at_utc TEXT NOT NULL,
  received_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  received_by_name TEXT,
  received_at_utc TEXT,
  cancelled_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  cancelled_by_name TEXT,
  cancelled_at_utc TEXT,
  cancel_reason TEXT,
  revision INTEGER NOT NULL CHECK(revision>0),
  CHECK(from_location_id<>to_location_id)
) STRICT;
```

## supplier-credits

Nombre SQL: `supplier_credits`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| supplier_id | TEXT | Sí | — | — |
| purchase_id | TEXT | Sí | — | — |
| amount_cents | INTEGER | Sí | — | — |
| reason | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `purchase_id` → `purchases.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `supplier_id` → `suppliers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `supplier_credits_supplier_date`: no único; columnas: supplier_id, created_at_utc, id; completo. SQL: `CREATE INDEX supplier_credits_supplier_date ON supplier_credits(supplier_id,created_at_utc DESC,id)`
- `sqlite_autoindex_supplier_credits_2`: único; columnas: purchase_id; completo.
- `sqlite_autoindex_supplier_credits_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE supplier_credits (
  id TEXT PRIMARY KEY NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_id TEXT NOT NULL UNIQUE REFERENCES purchases(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 240),
  created_at_utc TEXT NOT NULL
) STRICT;
```

## supplier-payables

Nombre SQL: `supplier_payables`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| purchase_id | TEXT | Sí | — | 1 |
| supplier_id | TEXT | Sí | — | — |
| original_cents | INTEGER | Sí | — | — |
| balance_cents | INTEGER | Sí | — | — |
| status | TEXT | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |
| due_on | TEXT | No | — | — |
| due_revision | INTEGER | Sí | 1 | — |

**Relaciones**

- `supplier_id` → `suppliers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `purchase_id` → `purchases.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `control_supplier_due`: no único; columnas: status, due_on, purchase_id; completo. SQL: `CREATE INDEX control_supplier_due ON supplier_payables(status,due_on,purchase_id)`
- `supplier_payables_supplier_status_date`: no único; columnas: supplier_id, status, created_at_utc, purchase_id; completo. SQL: `CREATE INDEX supplier_payables_supplier_status_date
  ON supplier_payables(supplier_id,status,created_at_utc,purchase_id)`
- `sqlite_autoindex_supplier_payables_1`: único; columnas: purchase_id; completo.

**Definición efectiva**

```sql
CREATE TABLE supplier_payables (
  purchase_id TEXT PRIMARY KEY NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  original_cents INTEGER NOT NULL CHECK(original_cents BETWEEN 1 AND 9999999999),
  balance_cents INTEGER NOT NULL CHECK(balance_cents BETWEEN 0 AND original_cents),
  status TEXT NOT NULL CHECK(status IN ('OPEN','PAID','VOIDED')),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
, due_on TEXT, due_revision INTEGER NOT NULL DEFAULT 1) STRICT;
```

## supplier-payment-allocations

Nombre SQL: `supplier_payment_allocations`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| payment_id | TEXT | Sí | — | 1 |
| purchase_id | TEXT | Sí | — | 2 |
| amount_cents | INTEGER | Sí | — | — |

**Relaciones**

- `purchase_id` → `supplier_payables.purchase_id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `payment_id` → `supplier_payments.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `supplier_allocations_purchase`: no único; columnas: purchase_id, payment_id; completo. SQL: `CREATE INDEX supplier_allocations_purchase ON supplier_payment_allocations(purchase_id,payment_id)`
- `sqlite_autoindex_supplier_payment_allocations_1`: único; columnas: payment_id, purchase_id; completo.

**Definición efectiva**

```sql
CREATE TABLE supplier_payment_allocations (
  payment_id TEXT NOT NULL REFERENCES supplier_payments(id) ON DELETE RESTRICT,
  purchase_id TEXT NOT NULL REFERENCES supplier_payables(purchase_id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  PRIMARY KEY(payment_id,purchase_id)
) STRICT, WITHOUT ROWID;
```

## supplier-payments

Nombre SQL: `supplier_payments`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| operation_key | TEXT | Sí | — | — |
| payload_hash | TEXT | Sí | — | — |
| supplier_id | TEXT | Sí | — | — |
| business_date | TEXT | Sí | — | — |
| method | TEXT | Sí | — | — |
| amount_cents | INTEGER | Sí | — | — |
| note | TEXT | No | — | — |
| actor_user_id | TEXT | Sí | — | — |
| actor_name | TEXT | Sí | — | — |
| shift_id | TEXT | No | — | — |
| register_movement_id | TEXT | No | — | — |
| created_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `shift_id` → `register_shifts.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `actor_user_id` → `users.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `supplier_id` → `suppliers.id`; al actualizar: NO ACTION; al borrar: RESTRICT.

**Índices**

- `supplier_payments_supplier_date`: no único; columnas: supplier_id, business_date, created_at_utc, id; completo. SQL: `CREATE INDEX supplier_payments_supplier_date
  ON supplier_payments(supplier_id,business_date DESC,created_at_utc DESC,id)`
- `sqlite_autoindex_supplier_payments_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_supplier_payments_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE supplier_payments (
  id TEXT PRIMARY KEY NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  note TEXT CHECK(note IS NULL OR length(note) BETWEEN 1 AND 240),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
  register_movement_id TEXT,
  created_at_utc TEXT NOT NULL,
  CHECK((method='CASH' AND shift_id IS NOT NULL) OR (method<>'CASH' AND shift_id IS NULL))
) STRICT;
```

## suppliers

Nombre SQL: `suppliers`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| name | TEXT | Sí | — | — |
| search_name | TEXT | Sí | — | — |
| phone | TEXT | No | — | — |
| contact_name | TEXT | No | — | — |
| address | TEXT | No | — | — |
| notes | TEXT | No | — | — |
| active | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `suppliers_active_search`: no único; columnas: active, search_name, id; completo. SQL: `CREATE INDEX suppliers_active_search ON suppliers(active,search_name,id)`
- `suppliers_search`: no único; columnas: search_name, id; completo. SQL: `CREATE INDEX suppliers_search ON suppliers(search_name,id)`
- `sqlite_autoindex_suppliers_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 140),
  search_name TEXT NOT NULL,
  phone TEXT CHECK(phone IS NULL OR length(phone) BETWEEN 1 AND 40),
  contact_name TEXT CHECK(contact_name IS NULL OR length(contact_name) BETWEEN 1 AND 120),
  address TEXT CHECK(address IS NULL OR length(address) BETWEEN 1 AND 240),
  notes TEXT CHECK(notes IS NULL OR length(notes) BETWEEN 1 AND 1000),
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## terminal-locations

Nombre SQL: `terminal_locations`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| terminal_id | TEXT | Sí | — | 1 |
| location_id | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

- `location_id` → `locations.id`; al actualizar: NO ACTION; al borrar: RESTRICT.
- `terminal_id` → `terminals.id`; al actualizar: NO ACTION; al borrar: CASCADE.

**Índices**

- `sqlite_autoindex_terminal_locations_1`: único; columnas: terminal_id; completo.

**Definición efectiva**

```sql
CREATE TABLE terminal_locations (
  terminal_id TEXT PRIMARY KEY NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  updated_at_utc TEXT NOT NULL
) STRICT;
```

## terminals

Nombre SQL: `terminals`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| name | TEXT | Sí | — | — |
| active | INTEGER | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_terminals_2`: único; columnas: name; completo.
- `sqlite_autoindex_terminals_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE terminals (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL CHECK(active IN (0,1)),
 revision INTEGER NOT NULL CHECK(revision>0), created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL
) STRICT;
```

## users

Nombre SQL: `users`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| username | TEXT | Sí | — | — |
| name | TEXT | Sí | — | — |
| role | TEXT | Sí | — | — |
| active | INTEGER | Sí | — | — |
| password_hash | TEXT | Sí | — | — |
| revision | INTEGER | Sí | — | — |
| created_at_utc | TEXT | Sí | — | — |
| updated_at_utc | TEXT | Sí | — | — |
| system_admin | INTEGER | Sí | 0 | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_users_2`: único; columnas: username; completo.
- `sqlite_autoindex_users_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE users (
 id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('SELLER','SUPERVISOR','OWNER')), active INTEGER NOT NULL CHECK(active IN (0,1)),
 password_hash TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 created_at_utc TEXT NOT NULL,updated_at_utc TEXT NOT NULL
, system_admin INTEGER NOT NULL DEFAULT 0 CHECK(system_admin IN (0,1))) STRICT;
```

## weekly-snapshots

Nombre SQL: `weekly_snapshots`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| id | TEXT | Sí | — | 1 |
| week_start | TEXT | Sí | — | — |
| version | INTEGER | Sí | — | — |
| operation_key | TEXT | No | — | — |
| generated_at_utc | TEXT | Sí | — | — |
| body_json | TEXT | Sí | — | — |

**Relaciones**

Sin claves foráneas declaradas.

**Índices**

- `sqlite_autoindex_weekly_snapshots_3`: único; columnas: week_start, version; completo.
- `sqlite_autoindex_weekly_snapshots_2`: único; columnas: operation_key; completo.
- `sqlite_autoindex_weekly_snapshots_1`: único; columnas: id; completo.

**Definición efectiva**

```sql
CREATE TABLE weekly_snapshots (
 id TEXT PRIMARY KEY, week_start TEXT NOT NULL, version INTEGER NOT NULL,
 operation_key TEXT UNIQUE, generated_at_utc TEXT NOT NULL, body_json TEXT NOT NULL CHECK(json_valid(body_json)),
 UNIQUE(week_start,version)
) STRICT;
```

## workspace-preferences

Nombre SQL: `workspace_preferences`.

| Columna | Tipo | NOT NULL | Predeterminado | PK |
|---|---|---|---|---|
| user_id | TEXT | Sí | — | 1 |
| start_module | TEXT | Sí | — | — |

**Relaciones**

- `user_id` → `users.id`; al actualizar: NO ACTION; al borrar: CASCADE.

**Índices**

- `sqlite_autoindex_workspace_preferences_1`: único; columnas: user_id; completo.

**Definición efectiva**

```sql
CREATE TABLE workspace_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,start_module TEXT NOT NULL) STRICT;
```

## Secuencia de migraciones

| Versión | Primera sentencia (orientación) |
|---|---|
| 1 | CREATE TABLE app_settings (       key TEXT PRIMARY KEY NOT NULL,       value TEXT NOT NULL     ) STRICT |
| 2 | ALTER TABLE app_settings RENAME COLUMN value TO value_json |
| 3 | CREATE TABLE inventory_balances (   product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,   quantity_base INTEGER NOT NULL  |
| 4 | CREATE TABLE sales (  id TEXT PRIMARY KEY NOT NULL, number INTEGER NOT NULL UNIQUE CHECK(number > 0),  checkout_key TEXT NOT NULL UNIQUE, payload_hash |
| 5 | CREATE TABLE users (  id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,  role TEXT NOT NULL CHECK(role IN ('SELLER','SU |
| 6 | CREATE TABLE terminals (  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL CHECK(active IN (0,1)),  revision INTEGER N |
| 7 | ALTER TABLE users ADD COLUMN system_admin INTEGER NOT NULL DEFAULT 0 CHECK(system_admin IN (0,1)) |
| 8 | CREATE TABLE product_categories (   id TEXT PRIMARY KEY NOT NULL,   name TEXT NOT NULL COLLATE NOCASE UNIQUE,   search_name TEXT NOT NULL,   active IN |
| 9 | ALTER TABLE products ADD COLUMN internal_barcode TEXT |
| 10 | CREATE TABLE printer_profiles (   id TEXT PRIMARY KEY NOT NULL,   terminal_id TEXT REFERENCES terminals(id),   name TEXT NOT NULL,   format TEXT NOT N |
| 11 | UPDATE business_settings SET business_name='El Perla', revision=revision+1,     updated_at_utc=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE business_nam |
| 12 | UPDATE business_settings SET business_name='Perla Negra', revision=revision+1,     updated_at_utc=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE business_ |
| 13 | ALTER TABLE business_settings ADD COLUMN features_revision INTEGER NOT NULL DEFAULT 1 CHECK(features_revision>0) |
| 14 | CREATE TABLE suppliers (   id TEXT PRIMARY KEY NOT NULL,   name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 140),   search_name TEXT NOT NULL,   ph |
| 15 | CREATE TABLE product_cost_states (   product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,   method TEXT NOT NULL CHECK(met |
| 16 | CREATE TABLE sale_returns (   id TEXT PRIMARY KEY NOT NULL,   number INTEGER NOT NULL UNIQUE CHECK(number>0),   sale_id TEXT NOT NULL REFERENCES sales |
| 17 | CREATE TABLE lot_product_settings (   product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,   enabled INTEGER NOT NULL CHEC |
| 18 | CREATE TABLE price_change_previews (   id TEXT PRIMARY KEY NOT NULL,   input_json TEXT NOT NULL CHECK(json_valid(input_json)),   result_json TEXT NOT  |
| 19 | CREATE TABLE notification_reads (   user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   notification_key TEXT NOT NULL,   signature TEXT N |
| 20 | CREATE TABLE supplier_payables (   purchase_id TEXT PRIMARY KEY NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,   supplier_id TEXT NOT NULL REFE |
| 21 | CREATE TABLE customers (   id TEXT PRIMARY KEY NOT NULL,   name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 140),   search_name TEXT NOT NULL,   ph |
| 22 | CREATE TABLE locations (   id TEXT PRIMARY KEY NOT NULL,   name TEXT NOT NULL COLLATE NOCASE UNIQUE,   code TEXT NOT NULL COLLATE NOCASE UNIQUE,   act |
| 23 | CREATE INDEX stock_transfers_from_status ON stock_transfers(from_location_id,status) |
| 24 | CREATE TABLE saved_views (  id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  module TEXT NOT NULL,name TE |
| 25 | CREATE TABLE replenishment_calendars (   location_id TEXT PRIMARY KEY REFERENCES locations(id), revision INTEGER NOT NULL CHECK(revision>0),   weekday |
| 26 | CREATE TABLE commercial_price_reviews (  id TEXT PRIMARY KEY, operation_key TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id),  price_ce |
| 27 | CREATE TABLE control_count_sessions (  id TEXT PRIMARY KEY NOT NULL, location_id TEXT NOT NULL REFERENCES locations(id), category_id TEXT,  revision I |
| 28 | ALTER TABLE customer_receivables ADD COLUMN due_on TEXT |
| 29 | CREATE TABLE weekly_snapshots (  id TEXT PRIMARY KEY, week_start TEXT NOT NULL, version INTEGER NOT NULL,  operation_key TEXT UNIQUE, generated_at_utc |
