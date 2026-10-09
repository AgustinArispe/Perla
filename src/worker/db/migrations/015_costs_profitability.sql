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
CREATE INDEX product_cost_events_product_time ON product_cost_events(product_id,created_at_utc,id);
CREATE UNIQUE INDEX product_cost_event_purchase_kind ON product_cost_events(purchase_item_id,kind)
  WHERE purchase_item_id IS NOT NULL;

ALTER TABLE sale_items ADD COLUMN cost_method TEXT CHECK(cost_method IS NULL OR cost_method IN ('WEIGHTED_AVERAGE','REFERENCE'));
ALTER TABLE sale_items ADD COLUMN cost_rate_micros_per_base INTEGER CHECK(cost_rate_micros_per_base IS NULL OR cost_rate_micros_per_base>0);
ALTER TABLE sale_items ADD COLUMN cost_cents INTEGER CHECK(cost_cents IS NULL OR cost_cents>=0);
ALTER TABLE sale_items ADD COLUMN cost_effective_at_utc TEXT;
ALTER TABLE sale_items ADD COLUMN category_name TEXT;

INSERT INTO business_features (feature_key,enabled,updated_at_utc)
VALUES ('COSTS_MARGIN',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
