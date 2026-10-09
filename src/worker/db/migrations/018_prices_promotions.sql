CREATE TABLE price_change_previews (
  id TEXT PRIMARY KEY NOT NULL,
  input_json TEXT NOT NULL CHECK(json_valid(input_json)),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  expires_at_ms INTEGER NOT NULL
) STRICT;

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
CREATE INDEX price_change_items_product ON price_change_items(product_id,batch_id);

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
CREATE INDEX promotions_active_window ON promotions(status,starts_at_utc,ends_at_utc,priority);

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
CREATE TABLE sale_promotion_allocations (
  sale_promotion_id TEXT NOT NULL REFERENCES sale_promotions(id) ON DELETE RESTRICT,
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0),
  discount_cents INTEGER NOT NULL CHECK(discount_cents>0),
  PRIMARY KEY(sale_promotion_id,sale_item_id)
) STRICT;
ALTER TABLE sale_items ADD COLUMN promotion_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(promotion_discount_cents>=0);
ALTER TABLE sale_items ADD COLUMN manual_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(manual_discount_cents>=0);
ALTER TABLE sales ADD COLUMN promotions_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(promotions_json));
INSERT INTO business_features(feature_key,enabled,updated_at_utc) VALUES ('PROMOTIONS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
