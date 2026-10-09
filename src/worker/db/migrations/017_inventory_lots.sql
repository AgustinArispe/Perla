CREATE TABLE lot_product_settings (
  product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  reconciled INTEGER NOT NULL CHECK(reconciled IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>0),
  updated_at_utc TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL
) STRICT;

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
CREATE INDEX inventory_lots_fefo ON inventory_lots(product_id,status,expires_on,created_at_utc,id);

CREATE TABLE lot_operations (
  operation_key TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('RECEIPT','ALLOCATION','RECONCILIATION','VOID')),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  created_at_utc TEXT NOT NULL
) STRICT;

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
CREATE INDEX lot_movements_lot_sequence ON lot_movements(lot_id,sequence DESC);
CREATE INDEX lot_movements_sale_item ON lot_movements(sale_item_id,sequence);

CREATE TABLE sale_item_lots (
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0),
  PRIMARY KEY(sale_item_id,lot_id)
) STRICT;

CREATE TABLE sale_return_item_lots (
  return_item_id TEXT NOT NULL REFERENCES sale_return_items(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0),
  PRIMARY KEY(return_item_id,lot_id)
) STRICT;

INSERT INTO business_features(feature_key,enabled,updated_at_utc)
VALUES ('LOTS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
