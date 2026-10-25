INSERT INTO business_features(feature_key,enabled,updated_at_utc) VALUES ('PREPARED_ORDERS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE prepared_orders (
 id TEXT PRIMARY KEY NOT NULL,
 number INTEGER NOT NULL UNIQUE CHECK(number>0),
 status TEXT NOT NULL CHECK(status IN ('READY','PAID','CANCELLED')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 operation_key TEXT NOT NULL UNIQUE,
 payload_hash TEXT NOT NULL,
 checkout_key TEXT NOT NULL UNIQUE,
 location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
 customer_name TEXT NOT NULL,
 note TEXT NOT NULL,
 body_json TEXT NOT NULL CHECK(json_valid(body_json)),
 quote_json TEXT NOT NULL CHECK(json_valid(quote_json)),
 items_json TEXT NOT NULL CHECK(json_valid(items_json)),
 created_at_utc TEXT NOT NULL,
 prepared_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 prepared_by_name TEXT NOT NULL,
 sale_id TEXT UNIQUE REFERENCES sales(id) ON DELETE RESTRICT,
 paid_at_utc TEXT,
 paid_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
 paid_by_name TEXT,
 cancelled_at_utc TEXT,
 cancelled_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
 cancelled_by_name TEXT,
 cancel_reason TEXT,
 cancel_key TEXT UNIQUE,
 cancel_hash TEXT,
 CHECK((status='READY' AND sale_id IS NULL AND paid_at_utc IS NULL AND cancelled_at_utc IS NULL)
 OR (status='PAID' AND sale_id IS NOT NULL AND paid_at_utc IS NOT NULL AND paid_by IS NOT NULL AND cancelled_at_utc IS NULL)
 OR (status='CANCELLED' AND sale_id IS NULL AND paid_at_utc IS NULL AND cancelled_at_utc IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL))
) STRICT;
CREATE INDEX prepared_orders_status_number ON prepared_orders(status,number DESC);
CREATE TRIGGER prepared_orders_immutable BEFORE UPDATE ON prepared_orders
WHEN NEW.id IS NOT OLD.id OR NEW.number IS NOT OLD.number OR NEW.operation_key IS NOT OLD.operation_key OR NEW.payload_hash IS NOT OLD.payload_hash
 OR NEW.checkout_key IS NOT OLD.checkout_key OR NEW.location_id IS NOT OLD.location_id OR NEW.customer_name IS NOT OLD.customer_name
 OR NEW.note IS NOT OLD.note OR NEW.body_json IS NOT OLD.body_json OR NEW.quote_json IS NOT OLD.quote_json OR NEW.items_json IS NOT OLD.items_json
 OR NEW.created_at_utc IS NOT OLD.created_at_utc OR NEW.prepared_by IS NOT OLD.prepared_by OR NEW.prepared_by_name IS NOT OLD.prepared_by_name
BEGIN SELECT RAISE(ABORT,'La orden preparada es inmutable'); END;
CREATE TRIGGER prepared_orders_transition BEFORE UPDATE ON prepared_orders BEGIN
 SELECT CASE WHEN OLD.status<>'READY' OR NEW.status NOT IN ('PAID','CANCELLED') OR NEW.revision<>OLD.revision+1 THEN RAISE(ABORT,'La orden ya fue resuelta') END;
 SELECT CASE WHEN NEW.status='PAID' AND NOT EXISTS(SELECT 1 FROM sales s WHERE s.id=NEW.sale_id AND s.document_type='SALE' AND s.status='COMPLETED' AND s.checkout_key=NEW.checkout_key) THEN RAISE(ABORT,'El cobro no corresponde a la orden') END;
END;
CREATE TRIGGER prepared_orders_no_delete BEFORE DELETE ON prepared_orders
BEGIN SELECT RAISE(ABORT,'Las órdenes se cancelan; no se eliminan'); END;
