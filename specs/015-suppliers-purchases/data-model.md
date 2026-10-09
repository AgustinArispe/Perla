# Data Model: Proveedores y compras

## Supplier

| Field          | Type            | Rules                               |
| -------------- | --------------- | ----------------------------------- |
| id             | UUID text       | primary key                         |
| name           | text            | trimmed, 2–140 characters           |
| search_name    | text            | normalized, indexed                 |
| phone          | text/null       | max 40                              |
| contact_name   | text/null       | max 120                             |
| address        | text/null       | max 240                             |
| notes          | text/null       | max 1000                            |
| active         | integer boolean | logical deactivation                |
| revision       | integer         | starts at 1; optimistic concurrency |
| created_at_utc | ISO timestamp   | immutable                           |
| updated_at_utc | ISO timestamp   | updated on change                   |

Name is not forced unique because businesses may have repeated commercial names. Search cursor is `(search_name,id)`.

## Purchase Draft

| Field          | Type           | Rules                           |
| -------------- | -------------- | ------------------------------- |
| user_id        | UUID text      | primary key, references user    |
| terminal_id    | UUID text/null | terminal used when saved        |
| revision       | integer        | starts at 1                     |
| body_json      | JSON           | validated against shared schema |
| updated_at_utc | ISO timestamp  | last persisted edit             |

The body contains `receiptKey`, optional supplier, receipt date and at most 200 unique product lines. It has no stock or cost effect.

## Purchase

| Field              | Type            | Rules                                       |
| ------------------ | --------------- | ------------------------------------------- |
| id                 | UUID text       | primary key                                 |
| number             | integer         | unique, positive, sequential display number |
| receipt_key        | UUID text       | unique idempotency key                      |
| payload_hash       | text            | canonical request hash                      |
| supplier_id        | UUID text       | restrict delete                             |
| supplier_name      | text            | immutable snapshot                          |
| supplier_phone     | text/null       | immutable snapshot                          |
| status             | enum            | `RECEIVED`, `VOIDED`                        |
| received_at_utc    | ISO timestamp   | server time                                 |
| business_date      | date            | Argentina local date                        |
| total_cents        | integer         | 0..MAX_MONEY                                |
| stock_applied      | integer boolean | feature state used at confirmation          |
| actor_user_id/name | UUID/text       | responsible snapshot                        |

Indexes: `(business_date,number DESC)`, `(supplier_id,business_date DESC)`, `(status,number DESC)`.

## Purchase Item

| Field            | Type      | Rules                              |
| ---------------- | --------- | ---------------------------------- |
| id               | UUID text | primary key                        |
| purchase_id      | UUID text | restrict delete                    |
| position         | integer   | unique within purchase             |
| product_id       | UUID text | restrict delete                    |
| sku/barcode/name | text      | immutable snapshots                |
| unit             | enum      | `UNIT`, `KG`                       |
| quantity_base    | integer   | positive; units or grams           |
| unit_cost_cents  | integer   | positive                           |
| subtotal_cents   | integer   | exact domain calculation           |
| product_revision | integer   | revision validated at confirmation |

One product appears once per purchase. `(product_id,purchase_id)` supports last-cost lookup.

## Purchase Event

| Field              | Type          | Rules                          |
| ------------------ | ------------- | ------------------------------ |
| id                 | UUID text     | primary key                    |
| purchase_id        | UUID text     | restrict delete                |
| kind               | enum          | `RECEIVED`, `VOIDED`           |
| reason             | text          | required for void              |
| operation_key      | UUID text     | unique                         |
| payload_hash       | text          | idempotency conflict detection |
| result_json        | JSON          | replay result                  |
| actor_user_id/name | UUID/text     | responsible snapshot           |
| created_at_utc     | ISO timestamp | server time                    |

Only one event of each kind is allowed for a purchase.

## Stock Movement Extension

Add nullable `purchase_id` and `purchase_item_id`. Receipt movements use `kind=RECEIPT`, positive delta and operation key derived from the purchase receipt key plus line id. Reversal movements use `kind=VOID`, negative delta and a key derived from the void operation key plus line id. Unique `(purchase_item_id,kind)` prevents duplicate physical effects.

## Relationships

```text
Supplier 1 ─── * Purchase 1 ─── * PurchaseItem * ─── 1 Product
User     1 ─── 0..1 PurchaseDraft
Purchase 1 ─── * PurchaseEvent
PurchaseItem 1 ─── 0..2 StockMovement
```

## State Transitions

```text
Draft ──confirm──> RECEIVED ──safe void──> VOIDED
  └──discard──> removed
```

- Draft changes have optimistic revision checks.
- `RECEIVED` is immutable except for transition to `VOIDED`.
- `VOIDED` is terminal.
- Editing Supplier/Product never changes purchase snapshots.
