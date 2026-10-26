CREATE TABLE business_units (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
 secondary INTEGER NOT NULL UNIQUE CHECK(secondary IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0)
) STRICT;
INSERT INTO business_units(id,name,secondary) VALUES
 ('00000000-0000-4000-8000-000000000001','Unidad principal',0),
 ('00000000-0000-4000-8000-000000000002','Segunda unidad',1);
INSERT INTO business_features(feature_key,enabled,updated_at_utc) VALUES ('BUSINESS_UNITS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
ALTER TABLE users ADD COLUMN business_unit_id TEXT REFERENCES business_units(id) ON DELETE RESTRICT;
ALTER TABLE sales ADD COLUMN business_unit_id TEXT REFERENCES business_units(id) ON DELETE RESTRICT;
ALTER TABLE sales ADD COLUMN business_unit_name TEXT NOT NULL DEFAULT 'Unidad principal';
ALTER TABLE prepared_orders ADD COLUMN business_unit_id TEXT REFERENCES business_units(id) ON DELETE RESTRICT;
ALTER TABLE prepared_orders ADD COLUMN business_unit_name TEXT NOT NULL DEFAULT 'Unidad principal';
UPDATE sales SET business_unit_id='00000000-0000-4000-8000-000000000001';
UPDATE prepared_orders SET business_unit_id='00000000-0000-4000-8000-000000000001';
CREATE INDEX sales_unit_date ON sales(business_unit_id,business_date,number DESC);
CREATE TRIGGER sales_unit_immutable BEFORE UPDATE OF business_unit_id,business_unit_name ON sales
WHEN NEW.business_unit_id IS NOT OLD.business_unit_id OR NEW.business_unit_name IS NOT OLD.business_unit_name
BEGIN SELECT RAISE(ABORT,'La unidad de una venta es inmutable'); END;
CREATE TRIGGER prepared_order_unit_immutable BEFORE UPDATE OF business_unit_id,business_unit_name ON prepared_orders
WHEN NEW.business_unit_id IS NOT OLD.business_unit_id OR NEW.business_unit_name IS NOT OLD.business_unit_name
BEGIN SELECT RAISE(ABORT,'La unidad de una orden es inmutable'); END;
