CREATE TABLE inventory_balances (
  product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN -1000000000 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision >= 1)
) STRICT;
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
  business_date TEXT NOT NULL,
  CHECK(delta_base != 0 OR kind IN ('OPENING','ADJUSTMENT')),
  CHECK(kind != 'RECEIPT' OR delta_base > 0),
  CHECK(kind != 'WASTE' OR delta_base < 0)
) STRICT;
CREATE INDEX stock_movements_product_sequence ON stock_movements(product_id, sequence DESC);
CREATE INDEX stock_movements_product_date ON stock_movements(product_id, business_date, sequence DESC);
