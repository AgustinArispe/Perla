-- Current state belongs to its entity. The read-only views below keep domain
-- projections explicit; all writes target the entity and its own revision.
ALTER TABLE products ADD COLUMN cost_method TEXT CHECK(cost_method IN ('WEIGHTED_AVERAGE','REFERENCE'));
ALTER TABLE products ADD COLUMN cost_rate_micros_per_base INTEGER CHECK(cost_rate_micros_per_base>0);
ALTER TABLE products ADD COLUMN cost_covered_quantity_base INTEGER CHECK(cost_covered_quantity_base>=0);
ALTER TABLE products ADD COLUMN cost_revision INTEGER CHECK(cost_revision>0);
ALTER TABLE products ADD COLUMN cost_effective_at_utc TEXT;
ALTER TABLE products ADD COLUMN cost_actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE products ADD COLUMN cost_actor_name TEXT CHECK(
 (cost_method IS NULL AND cost_rate_micros_per_base IS NULL AND cost_covered_quantity_base IS NULL AND cost_revision IS NULL AND cost_effective_at_utc IS NULL AND cost_actor_user_id IS NULL AND cost_actor_name IS NULL)
 OR (cost_method IS NOT NULL AND cost_rate_micros_per_base IS NOT NULL AND cost_covered_quantity_base IS NOT NULL AND cost_revision IS NOT NULL AND cost_effective_at_utc IS NOT NULL AND cost_actor_user_id IS NOT NULL AND cost_actor_name IS NOT NULL));
UPDATE products SET (cost_method,cost_rate_micros_per_base,cost_covered_quantity_base,cost_revision,cost_effective_at_utc,cost_actor_user_id,cost_actor_name)=
 (SELECT method,rate_micros_per_base,covered_quantity_base,revision,effective_at_utc,actor_user_id,actor_name FROM product_cost_states WHERE product_id=products.id);
DROP TABLE product_cost_states;
CREATE VIEW product_cost_states AS SELECT id product_id,cost_method method,cost_rate_micros_per_base rate_micros_per_base,cost_covered_quantity_base covered_quantity_base,cost_revision revision,cost_effective_at_utc effective_at_utc,cost_actor_user_id actor_user_id,cost_actor_name actor_name FROM products WHERE cost_method IS NOT NULL;

ALTER TABLE products ADD COLUMN lots_enabled INTEGER CHECK(lots_enabled IN (0,1));
ALTER TABLE products ADD COLUMN lots_reconciled INTEGER CHECK(lots_reconciled IN (0,1));
ALTER TABLE products ADD COLUMN lots_revision INTEGER CHECK(lots_revision>0);
ALTER TABLE products ADD COLUMN lots_updated_at_utc TEXT;
ALTER TABLE products ADD COLUMN lots_actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE products ADD COLUMN lots_actor_name TEXT CHECK(
 (lots_enabled IS NULL AND lots_reconciled IS NULL AND lots_revision IS NULL AND lots_updated_at_utc IS NULL AND lots_actor_user_id IS NULL AND lots_actor_name IS NULL)
 OR (lots_enabled IS NOT NULL AND lots_reconciled IS NOT NULL AND lots_revision IS NOT NULL AND lots_updated_at_utc IS NOT NULL AND lots_actor_user_id IS NOT NULL AND lots_actor_name IS NOT NULL));
UPDATE products SET (lots_enabled,lots_reconciled,lots_revision,lots_updated_at_utc,lots_actor_user_id,lots_actor_name)=
 (SELECT enabled,reconciled,revision,updated_at_utc,actor_user_id,actor_name FROM lot_product_settings WHERE product_id=products.id);
DROP TABLE lot_product_settings;
CREATE VIEW lot_product_settings AS SELECT id product_id,lots_enabled enabled,lots_reconciled reconciled,lots_revision revision,lots_updated_at_utc updated_at_utc,lots_actor_user_id actor_user_id,lots_actor_name actor_name FROM products WHERE lots_revision IS NOT NULL;

ALTER TABLE products ADD COLUMN replenishment_revision INTEGER CHECK(replenishment_revision>0);
ALTER TABLE products ADD COLUMN purchase_multiple_base INTEGER CHECK(purchase_multiple_base BETWEEN 1 AND 1000000000);
UPDATE products SET (replenishment_revision,purchase_multiple_base)=(SELECT revision,purchase_multiple_base FROM replenishment_product_rules WHERE product_id=products.id);
DROP TABLE replenishment_product_rules;
CREATE VIEW replenishment_product_rules AS SELECT id product_id,replenishment_revision revision,purchase_multiple_base FROM products WHERE replenishment_revision IS NOT NULL;

ALTER TABLE locations ADD COLUMN calendar_revision INTEGER CHECK(calendar_revision>0);
ALTER TABLE locations ADD COLUMN weekdays_json TEXT CHECK(weekdays_json IS NULL OR json_valid(weekdays_json));
ALTER TABLE locations ADD COLUMN closed_dates_json TEXT CHECK(closed_dates_json IS NULL OR json_valid(closed_dates_json));
UPDATE locations SET (calendar_revision,weekdays_json,closed_dates_json)=(SELECT revision,weekdays_json,closed_dates_json FROM replenishment_calendars WHERE location_id=locations.id);
DROP TABLE replenishment_calendars;
CREATE VIEW replenishment_calendars AS SELECT id location_id,calendar_revision revision,weekdays_json,closed_dates_json FROM locations WHERE calendar_revision IS NOT NULL;

ALTER TABLE purchase_items ADD COLUMN replenishment_order_line_id TEXT REFERENCES replenishment_order_lines(id) ON DELETE RESTRICT;
ALTER TABLE purchase_items ADD COLUMN replenishment_received_base INTEGER CHECK((replenishment_order_line_id IS NULL AND replenishment_received_base IS NULL) OR (replenishment_order_line_id IS NOT NULL AND replenishment_received_base IS NOT NULL AND replenishment_received_base>0));
UPDATE purchase_items SET (replenishment_order_line_id,replenishment_received_base)=(SELECT line_id,quantity_base FROM replenishment_receipts WHERE purchase_item_id=purchase_items.id);
CREATE INDEX purchase_items_replenishment_line ON purchase_items(replenishment_order_line_id) WHERE replenishment_order_line_id IS NOT NULL;
DROP TABLE replenishment_receipts;
CREATE VIEW replenishment_receipts AS SELECT replenishment_order_line_id line_id,id purchase_item_id,replenishment_received_base quantity_base FROM purchase_items WHERE replenishment_order_line_id IS NOT NULL;

ALTER TABLE business_settings ADD COLUMN margin_basis_points INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE business_settings ADD COLUMN stale_days INTEGER NOT NULL DEFAULT 60;
ALTER TABLE business_settings ADD COLUMN commercial_revision INTEGER NOT NULL DEFAULT 1;
UPDATE business_settings SET (margin_basis_points,stale_days,commercial_revision)=(SELECT margin_basis_points,stale_days,revision FROM commercial_settings WHERE id='main');
DROP TABLE commercial_settings;
CREATE VIEW commercial_settings AS SELECT 'main' id,margin_basis_points,stale_days,commercial_revision revision FROM business_settings;

ALTER TABLE register_shifts ADD COLUMN review_revision INTEGER;
ALTER TABLE register_shifts ADD COLUMN review_note TEXT;
ALTER TABLE register_shifts ADD COLUMN review_actor_user_id TEXT REFERENCES users(id);
ALTER TABLE register_shifts ADD COLUMN review_actor_name TEXT;
ALTER TABLE register_shifts ADD COLUMN reviewed_at_utc TEXT;
UPDATE register_shifts SET (review_revision,review_note,review_actor_user_id,review_actor_name,reviewed_at_utc)=(SELECT revision,note,actor_user_id,actor_name,reviewed_at_utc FROM control_cash_reviews WHERE shift_id=register_shifts.id);
DROP TABLE control_cash_reviews;
CREATE VIEW control_cash_reviews AS SELECT id shift_id,review_revision revision,review_note note,review_actor_user_id actor_user_id,review_actor_name actor_name,reviewed_at_utc FROM register_shifts WHERE review_revision IS NOT NULL;

ALTER TABLE sales ADD COLUMN debt_party_id TEXT REFERENCES customers(id) ON DELETE RESTRICT;
ALTER TABLE sales ADD COLUMN debt_original_cents INTEGER CHECK(debt_original_cents BETWEEN 1 AND 9999999999);
ALTER TABLE sales ADD COLUMN debt_balance_cents INTEGER CHECK(debt_balance_cents BETWEEN 0 AND debt_original_cents);
ALTER TABLE sales ADD COLUMN debt_status TEXT CHECK(debt_status IN ('OPEN','PAID','VOIDED'));
ALTER TABLE sales ADD COLUMN debt_created_at_utc TEXT;
ALTER TABLE sales ADD COLUMN debt_updated_at_utc TEXT;
ALTER TABLE sales ADD COLUMN due_on TEXT;
ALTER TABLE sales ADD COLUMN due_revision INTEGER NOT NULL DEFAULT 1;
UPDATE sales SET (debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision)=(SELECT customer_id,original_cents,balance_cents,status,created_at_utc,updated_at_utc,due_on,due_revision FROM customer_receivables WHERE sale_id=sales.id) WHERE EXISTS(SELECT 1 FROM customer_receivables WHERE sale_id=sales.id);
CREATE INDEX sales_debt_party ON sales(debt_party_id,debt_status,debt_created_at_utc,id);
CREATE INDEX sales_debt_due ON sales(debt_status,due_on,id);
CREATE TABLE customer_collection_allocations_v32 (
 collection_id TEXT NOT NULL REFERENCES customer_collections(id) ON DELETE RESTRICT,
 sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
 PRIMARY KEY(collection_id,sale_id)
) STRICT, WITHOUT ROWID;
INSERT INTO customer_collection_allocations_v32 SELECT * FROM customer_collection_allocations;
DROP TABLE customer_collection_allocations;
ALTER TABLE customer_collection_allocations_v32 RENAME TO customer_collection_allocations;
DROP TABLE customer_receivables;
CREATE VIEW customer_receivables AS SELECT id sale_id,debt_party_id customer_id,debt_original_cents original_cents,debt_balance_cents balance_cents,debt_status status,debt_created_at_utc created_at_utc,debt_updated_at_utc updated_at_utc,due_on,due_revision FROM sales WHERE debt_status IS NOT NULL;

ALTER TABLE purchases ADD COLUMN debt_party_id TEXT REFERENCES suppliers(id) ON DELETE RESTRICT;
ALTER TABLE purchases ADD COLUMN debt_original_cents INTEGER CHECK(debt_original_cents BETWEEN 1 AND 9999999999);
ALTER TABLE purchases ADD COLUMN debt_balance_cents INTEGER CHECK(debt_balance_cents BETWEEN 0 AND debt_original_cents);
ALTER TABLE purchases ADD COLUMN debt_status TEXT CHECK(debt_status IN ('OPEN','PAID','VOIDED'));
ALTER TABLE purchases ADD COLUMN debt_created_at_utc TEXT;
ALTER TABLE purchases ADD COLUMN debt_updated_at_utc TEXT;
ALTER TABLE purchases ADD COLUMN due_on TEXT;
ALTER TABLE purchases ADD COLUMN due_revision INTEGER NOT NULL DEFAULT 1;
UPDATE purchases SET (debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision)=(SELECT supplier_id,original_cents,balance_cents,status,created_at_utc,updated_at_utc,due_on,due_revision FROM supplier_payables WHERE purchase_id=purchases.id) WHERE EXISTS(SELECT 1 FROM supplier_payables WHERE purchase_id=purchases.id);
CREATE INDEX purchases_debt_party ON purchases(debt_party_id,debt_status,debt_created_at_utc,id);
CREATE INDEX purchases_debt_due ON purchases(debt_status,due_on,id);
CREATE TABLE supplier_payment_allocations_v32 (
 payment_id TEXT NOT NULL REFERENCES supplier_payments(id) ON DELETE RESTRICT,
 purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
 PRIMARY KEY(payment_id,purchase_id)
) STRICT, WITHOUT ROWID;
INSERT INTO supplier_payment_allocations_v32 SELECT * FROM supplier_payment_allocations;
DROP TABLE supplier_payment_allocations;
ALTER TABLE supplier_payment_allocations_v32 RENAME TO supplier_payment_allocations;
CREATE INDEX supplier_allocations_purchase ON supplier_payment_allocations(purchase_id,payment_id);
DROP TABLE supplier_payables;
CREATE VIEW supplier_payables AS SELECT id purchase_id,debt_party_id supplier_id,debt_original_cents original_cents,debt_balance_cents balance_cents,debt_status status,debt_created_at_utc created_at_utc,debt_updated_at_utc updated_at_utc,due_on,due_revision FROM purchases WHERE debt_status IS NOT NULL;

CREATE TRIGGER product_replenishment_complete_insert BEFORE INSERT ON products BEGIN
 SELECT CASE WHEN NOT ((NEW.replenishment_revision IS NULL AND NEW.purchase_multiple_base IS NULL) OR (NEW.replenishment_revision IS NOT NULL AND NEW.purchase_multiple_base IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER product_replenishment_complete_update BEFORE UPDATE ON products BEGIN
 SELECT CASE WHEN NOT ((NEW.replenishment_revision IS NULL AND NEW.purchase_multiple_base IS NULL) OR (NEW.replenishment_revision IS NOT NULL AND NEW.purchase_multiple_base IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER location_calendar_complete_insert BEFORE INSERT ON locations BEGIN
 SELECT CASE WHEN NOT ((NEW.calendar_revision IS NULL AND NEW.weekdays_json IS NULL AND NEW.closed_dates_json IS NULL) OR (NEW.calendar_revision IS NOT NULL AND NEW.weekdays_json IS NOT NULL AND NEW.closed_dates_json IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER location_calendar_complete_update BEFORE UPDATE ON locations BEGIN
 SELECT CASE WHEN NOT ((NEW.calendar_revision IS NULL AND NEW.weekdays_json IS NULL AND NEW.closed_dates_json IS NULL) OR (NEW.calendar_revision IS NOT NULL AND NEW.weekdays_json IS NOT NULL AND NEW.closed_dates_json IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER shift_review_complete_insert BEFORE INSERT ON register_shifts BEGIN
 SELECT CASE WHEN NOT ((NEW.review_revision IS NULL AND NEW.review_note IS NULL AND NEW.review_actor_user_id IS NULL AND NEW.review_actor_name IS NULL AND NEW.reviewed_at_utc IS NULL) OR (NEW.review_revision IS NOT NULL AND NEW.review_note IS NOT NULL AND NEW.review_actor_user_id IS NOT NULL AND NEW.review_actor_name IS NOT NULL AND NEW.reviewed_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER shift_review_complete_update BEFORE UPDATE ON register_shifts BEGIN
 SELECT CASE WHEN NOT ((NEW.review_revision IS NULL AND NEW.review_note IS NULL AND NEW.review_actor_user_id IS NULL AND NEW.review_actor_name IS NULL AND NEW.reviewed_at_utc IS NULL) OR (NEW.review_revision IS NOT NULL AND NEW.review_note IS NOT NULL AND NEW.review_actor_user_id IS NOT NULL AND NEW.review_actor_name IS NOT NULL AND NEW.reviewed_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER sales_debt_complete_insert BEFORE INSERT ON sales BEGIN
 SELECT CASE WHEN NOT ((NEW.debt_party_id IS NULL AND NEW.debt_original_cents IS NULL AND NEW.debt_balance_cents IS NULL AND NEW.debt_status IS NULL AND NEW.debt_created_at_utc IS NULL AND NEW.debt_updated_at_utc IS NULL) OR (NEW.debt_party_id IS NOT NULL AND NEW.debt_original_cents IS NOT NULL AND NEW.debt_balance_cents IS NOT NULL AND NEW.debt_status IS NOT NULL AND NEW.debt_created_at_utc IS NOT NULL AND NEW.debt_updated_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER sales_debt_complete_update BEFORE UPDATE ON sales BEGIN
 SELECT CASE WHEN NOT ((NEW.debt_party_id IS NULL AND NEW.debt_original_cents IS NULL AND NEW.debt_balance_cents IS NULL AND NEW.debt_status IS NULL AND NEW.debt_created_at_utc IS NULL AND NEW.debt_updated_at_utc IS NULL) OR (NEW.debt_party_id IS NOT NULL AND NEW.debt_original_cents IS NOT NULL AND NEW.debt_balance_cents IS NOT NULL AND NEW.debt_status IS NOT NULL AND NEW.debt_created_at_utc IS NOT NULL AND NEW.debt_updated_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER purchases_debt_complete_insert BEFORE INSERT ON purchases BEGIN
 SELECT CASE WHEN NOT ((NEW.debt_party_id IS NULL AND NEW.debt_original_cents IS NULL AND NEW.debt_balance_cents IS NULL AND NEW.debt_status IS NULL AND NEW.debt_created_at_utc IS NULL AND NEW.debt_updated_at_utc IS NULL) OR (NEW.debt_party_id IS NOT NULL AND NEW.debt_original_cents IS NOT NULL AND NEW.debt_balance_cents IS NOT NULL AND NEW.debt_status IS NOT NULL AND NEW.debt_created_at_utc IS NOT NULL AND NEW.debt_updated_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER purchases_debt_complete_update BEFORE UPDATE ON purchases BEGIN
 SELECT CASE WHEN NOT ((NEW.debt_party_id IS NULL AND NEW.debt_original_cents IS NULL AND NEW.debt_balance_cents IS NULL AND NEW.debt_status IS NULL AND NEW.debt_created_at_utc IS NULL AND NEW.debt_updated_at_utc IS NULL) OR (NEW.debt_party_id IS NOT NULL AND NEW.debt_original_cents IS NOT NULL AND NEW.debt_balance_cents IS NOT NULL AND NEW.debt_status IS NOT NULL AND NEW.debt_created_at_utc IS NOT NULL AND NEW.debt_updated_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
