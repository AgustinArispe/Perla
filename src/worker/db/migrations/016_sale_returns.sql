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
CREATE INDEX sale_returns_sale_number ON sale_returns(sale_id,number);
CREATE INDEX sale_returns_month ON sale_returns(local_month,status);

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
CREATE INDEX sale_return_items_sale_item ON sale_return_items(sale_item_id,return_id);

CREATE TABLE sale_return_refunds (
  id TEXT PRIMARY KEY NOT NULL,
  return_id TEXT NOT NULL UNIQUE REFERENCES sale_returns(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 0 AND 9999999999),
  register_shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
  register_movement_id TEXT REFERENCES register_movements(id) ON DELETE RESTRICT
) STRICT;

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

ALTER TABLE stock_movements ADD COLUMN return_id TEXT REFERENCES sale_returns(id) ON DELETE RESTRICT;
ALTER TABLE stock_movements ADD COLUMN return_item_id TEXT REFERENCES sale_return_items(id) ON DELETE RESTRICT;
CREATE INDEX stock_return_sequence ON stock_movements(return_id,sequence);
CREATE UNIQUE INDEX stock_return_item_kind ON stock_movements(return_item_id,kind)
  WHERE return_item_id IS NOT NULL;

ALTER TABLE register_movements ADD COLUMN return_id TEXT REFERENCES sale_returns(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX register_return_refund ON register_movements(return_id)
  WHERE return_id IS NOT NULL;

INSERT INTO business_features(feature_key,enabled,updated_at_utc)
VALUES ('RETURNS',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
