ALTER TABLE products ADD COLUMN internal_barcode TEXT;
CREATE UNIQUE INDEX products_internal_barcode_unique ON products(internal_barcode) WHERE internal_barcode IS NOT NULL;

CREATE TRIGGER products_barcode_cross_insert
BEFORE INSERT ON products
WHEN (NEW.barcode IS NOT NULL AND EXISTS(SELECT 1 FROM products WHERE internal_barcode=NEW.barcode))
  OR (NEW.internal_barcode IS NOT NULL AND EXISTS(SELECT 1 FROM products WHERE barcode=NEW.internal_barcode))
BEGIN
  SELECT RAISE(ABORT, 'Un código no puede ser de fábrica e interno a la vez');
END;

CREATE TRIGGER products_barcode_cross_update
BEFORE UPDATE OF barcode,internal_barcode ON products
WHEN (NEW.barcode IS NOT NULL AND EXISTS(SELECT 1 FROM products WHERE id<>NEW.id AND internal_barcode=NEW.barcode))
  OR (NEW.internal_barcode IS NOT NULL AND EXISTS(SELECT 1 FROM products WHERE id<>NEW.id AND barcode=NEW.internal_barcode))
BEGIN
  SELECT RAISE(ABORT, 'Un código no puede ser de fábrica e interno a la vez');
END;

CREATE TABLE barcode_sequences (
  namespace TEXT PRIMARY KEY NOT NULL,
  next_value INTEGER NOT NULL CHECK(next_value BETWEEN 1 AND 999999999)
) STRICT;
INSERT INTO barcode_sequences(namespace,next_value) VALUES ('internal_ean13',1);

CREATE TABLE product_labels (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  barcode TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','PRINTED')),
  created_at_utc TEXT NOT NULL,
  printed_at_utc TEXT,
  actor_user_id TEXT REFERENCES users(id),
  actor_name TEXT,
  CHECK((status='PENDING' AND printed_at_utc IS NULL) OR (status='PRINTED' AND printed_at_utc IS NOT NULL))
) STRICT;
CREATE INDEX product_labels_status_created ON product_labels(status,created_at_utc,id);
CREATE INDEX product_labels_product ON product_labels(product_id,created_at_utc);
