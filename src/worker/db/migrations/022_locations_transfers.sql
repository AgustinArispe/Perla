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
CREATE UNIQUE INDEX one_default_location ON locations(is_default) WHERE is_default=1;
INSERT INTO locations VALUES(
  '00000000-0000-4000-8000-000000000022','Ubicación principal','PRINCIPAL',1,1,1,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')
);

CREATE TABLE terminal_locations (
  terminal_id TEXT PRIMARY KEY NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  updated_at_utc TEXT NOT NULL
) STRICT;
INSERT INTO terminal_locations(terminal_id,location_id,updated_at_utc)
SELECT id,'00000000-0000-4000-8000-000000000022',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM terminals;

CREATE TABLE location_inventory_balances (
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN -1000000000 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision>0),
  PRIMARY KEY(location_id,product_id)
) STRICT;
INSERT INTO location_inventory_balances(location_id,product_id,quantity_base,revision)
SELECT '00000000-0000-4000-8000-000000000022',product_id,quantity_base,revision FROM inventory_balances;
CREATE INDEX location_balances_product ON location_inventory_balances(product_id,location_id);

CREATE TABLE location_lot_balances (
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 0 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision>0),
  PRIMARY KEY(location_id,lot_id)
) STRICT;
INSERT INTO location_lot_balances(location_id,lot_id,quantity_base,revision)
SELECT '00000000-0000-4000-8000-000000000022',id,quantity_base,revision FROM inventory_lots;

ALTER TABLE stock_movements ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT;
UPDATE stock_movements SET location_id='00000000-0000-4000-8000-000000000022';
ALTER TABLE sales ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT;
UPDATE sales SET location_id=COALESCE(
  (SELECT tl.location_id FROM terminal_locations tl WHERE tl.terminal_id=sales.terminal_id),
  '00000000-0000-4000-8000-000000000022'
);
CREATE INDEX sales_location_date ON sales(location_id,business_date,status);

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
CREATE INDEX stock_transfers_status_time ON stock_transfers(status,dispatched_at_utc DESC,id);

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
CREATE INDEX stock_transfer_events_transfer ON stock_transfer_events(transfer_id,sequence);

CREATE TABLE stock_transfer_item_lots (
  transfer_item_id TEXT NOT NULL REFERENCES stock_transfer_items(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  dispatched_base INTEGER NOT NULL CHECK(dispatched_base>0),
  received_base INTEGER CHECK(received_base IS NULL OR received_base>=0),
  PRIMARY KEY(transfer_item_id,lot_id)
) STRICT;

ALTER TABLE stock_movements ADD COLUMN transfer_id TEXT REFERENCES stock_transfers(id) ON DELETE RESTRICT;
ALTER TABLE stock_movements ADD COLUMN transfer_item_id TEXT REFERENCES stock_transfer_items(id) ON DELETE RESTRICT;

INSERT INTO business_features(feature_key,enabled,updated_at_utc)
VALUES ('LOCATIONS_TRANSFERS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
