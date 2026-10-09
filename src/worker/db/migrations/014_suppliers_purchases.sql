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
CREATE INDEX suppliers_search ON suppliers(search_name,id);
CREATE INDEX suppliers_active_search ON suppliers(active,search_name,id);

CREATE TABLE purchase_drafts (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terminal_id TEXT REFERENCES terminals(id) ON DELETE SET NULL,
  revision INTEGER NOT NULL CHECK(revision>0),
  body_json TEXT NOT NULL CHECK(json_valid(body_json)),
  updated_at_utc TEXT NOT NULL
) STRICT;

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
CREATE INDEX purchases_date_number ON purchases(business_date,number DESC);
CREATE INDEX purchases_supplier_date ON purchases(supplier_id,business_date DESC,number DESC);
CREATE INDEX purchases_status_number ON purchases(status,number DESC);

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
CREATE INDEX purchase_items_product_purchase ON purchase_items(product_id,purchase_id);

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
CREATE INDEX purchase_events_purchase ON purchase_events(purchase_id,created_at_utc);

ALTER TABLE stock_movements ADD COLUMN purchase_id TEXT REFERENCES purchases(id) ON DELETE RESTRICT;
ALTER TABLE stock_movements ADD COLUMN purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT;
CREATE INDEX stock_purchase_sequence ON stock_movements(purchase_id,sequence);
CREATE UNIQUE INDEX stock_purchase_item_kind ON stock_movements(purchase_item_id,kind)
  WHERE purchase_item_id IS NOT NULL;

INSERT INTO business_features (feature_key,enabled,updated_at_utc)
VALUES ('SUPPLIERS_PURCHASES',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
