CREATE TABLE replenishment_calendars (
  location_id TEXT PRIMARY KEY REFERENCES locations(id), revision INTEGER NOT NULL CHECK(revision>0),
  weekdays_json TEXT NOT NULL CHECK(json_valid(weekdays_json)), closed_dates_json TEXT NOT NULL CHECK(json_valid(closed_dates_json))
) STRICT;
CREATE TABLE replenishment_product_rules (
  product_id TEXT PRIMARY KEY REFERENCES products(id),revision INTEGER NOT NULL CHECK(revision>0),purchase_multiple_base INTEGER NOT NULL CHECK(purchase_multiple_base BETWEEN 1 AND 1000000000)
) STRICT;
CREATE TABLE replenishment_orders (
  id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE CHECK(number>0), supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  location_id TEXT NOT NULL REFERENCES locations(id), status TEXT NOT NULL CHECK(status IN ('DRAFT','ORDERED','PARTIAL','RECEIVED','CANCELLED')),
  expected_date TEXT, revision INTEGER NOT NULL CHECK(revision>0), actor_user_id TEXT NOT NULL REFERENCES users(id), created_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX replenishment_orders_pending ON replenishment_orders(location_id,status,expected_date);
CREATE TABLE replenishment_order_lines (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES replenishment_orders(id), product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('UNIT','KG')), product_revision INTEGER NOT NULL CHECK(product_revision>0), stock_revision INTEGER NOT NULL CHECK(stock_revision>=0),
  ordered_base INTEGER NOT NULL CHECK(ordered_base BETWEEN 1 AND 1000000000), received_base INTEGER NOT NULL DEFAULT 0 CHECK(received_base>=0),
  cancelled_base INTEGER NOT NULL DEFAULT 0 CHECK(cancelled_base>=0), estimated_cost_cents INTEGER CHECK(estimated_cost_cents BETWEEN 0 AND 9999999999),
  CHECK(received_base+cancelled_base<=ordered_base), UNIQUE(order_id,product_id)
) STRICT;
CREATE INDEX replenishment_lines_product ON replenishment_order_lines(product_id,order_id);
CREATE TABLE replenishment_events (
  operation_key TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES replenishment_orders(id), action TEXT NOT NULL,
  payload_hash TEXT NOT NULL, result_json TEXT NOT NULL CHECK(json_valid(result_json)), actor_user_id TEXT NOT NULL REFERENCES users(id),
  created_at_utc TEXT NOT NULL
) STRICT;
CREATE TABLE replenishment_receipts (
  line_id TEXT NOT NULL REFERENCES replenishment_order_lines(id), purchase_item_id TEXT NOT NULL UNIQUE REFERENCES purchase_items(id),
  quantity_base INTEGER NOT NULL CHECK(quantity_base>0), PRIMARY KEY(line_id,purchase_item_id)
) STRICT;
INSERT INTO business_features(feature_key,enabled,updated_at_utc) VALUES('REPLENISHMENT',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
