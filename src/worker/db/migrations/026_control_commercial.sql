CREATE TABLE commercial_price_reviews (
 id TEXT PRIMARY KEY, operation_key TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id),
 price_cents INTEGER NOT NULL, price_version INTEGER NOT NULL, cost_revision INTEGER, actor_user_id TEXT NOT NULL REFERENCES users(id),
 actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL, UNIQUE(operation_key,product_id)
) STRICT;
CREATE INDEX commercial_reviews_product ON commercial_price_reviews(product_id,created_at_utc DESC,id);
CREATE TABLE commercial_price_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL REFERENCES products(id),
 before_cents INTEGER NOT NULL, after_cents INTEGER NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
INSERT INTO commercial_price_events(product_id,before_cents,after_cents,created_at_utc)
SELECT i.product_id,i.before_cents,i.after_cents,b.created_at_utc FROM price_change_items i JOIN price_change_batches b ON b.id=i.batch_id WHERE i.before_cents<>i.after_cents ORDER BY b.created_at_utc;
CREATE TRIGGER commercial_effective_price AFTER UPDATE OF price_cents ON products
WHEN OLD.price_cents<>NEW.price_cents BEGIN
 INSERT INTO commercial_price_events(product_id,before_cents,after_cents,created_at_utc)
 VALUES(NEW.id,OLD.price_cents,NEW.price_cents,NEW.updated_at_utc);
END;
CREATE TABLE commercial_settings (
 id TEXT PRIMARY KEY CHECK(id='main'), margin_basis_points INTEGER NOT NULL DEFAULT 2000,
 stale_days INTEGER NOT NULL DEFAULT 60, revision INTEGER NOT NULL DEFAULT 1
) STRICT;
INSERT INTO commercial_settings(id) VALUES('main');
