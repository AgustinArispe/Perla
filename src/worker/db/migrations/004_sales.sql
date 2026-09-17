CREATE TABLE sales (
 id TEXT PRIMARY KEY NOT NULL, number INTEGER NOT NULL UNIQUE CHECK(number > 0),
 checkout_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('COMPLETED','VOIDED')),
 created_at_utc TEXT NOT NULL, business_date TEXT NOT NULL, local_month TEXT NOT NULL,
 subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents BETWEEN 0 AND 9999999999),
 discount_cents INTEGER NOT NULL CHECK(discount_cents BETWEEN 0 AND subtotal_cents),
 total_cents INTEGER NOT NULL CHECK(total_cents = subtotal_cents - discount_cents),
 discount_json TEXT NOT NULL CHECK(json_valid(discount_json))
) STRICT;
CREATE TABLE sale_items (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 line_id TEXT NOT NULL, position INTEGER NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 sku TEXT NOT NULL, barcode TEXT, name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('UNIT','KG')),
 unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents BETWEEN 1 AND 9999999999),
 quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 1 AND 1000000000),
 gross_cents INTEGER NOT NULL CHECK(gross_cents BETWEEN 0 AND 9999999999),
 discount_cents INTEGER NOT NULL CHECK(discount_cents BETWEEN 0 AND gross_cents),
 net_cents INTEGER NOT NULL CHECK(net_cents = gross_cents - discount_cents),
 UNIQUE(sale_id,line_id), UNIQUE(sale_id,position)
) STRICT;
CREATE TABLE sale_payments (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 position INTEGER NOT NULL, method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
 tendered_cents INTEGER CHECK(tendered_cents BETWEEN amount_cents AND 9999999999),
 change_cents INTEGER NOT NULL CHECK(change_cents >= 0),
 CHECK(method = 'CASH' OR (tendered_cents IS NULL AND change_cents = 0)),
 CHECK(change_cents = COALESCE(tendered_cents,amount_cents) - amount_cents), UNIQUE(sale_id,position)
) STRICT;
CREATE TABLE sale_events (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('COMPLETED','VOIDED')), reason TEXT NOT NULL,
 operation_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL, created_at_utc TEXT NOT NULL, clock_warning TEXT,
 UNIQUE(sale_id,kind)
) STRICT;
ALTER TABLE stock_movements ADD COLUMN sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT;
ALTER TABLE stock_movements ADD COLUMN sale_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX stock_sale_item_kind ON stock_movements(sale_item_id,kind) WHERE sale_item_id IS NOT NULL;
CREATE INDEX stock_sale_sequence ON stock_movements(sale_id,sequence);
CREATE INDEX sales_date_number ON sales(business_date,number DESC);
CREATE INDEX sales_status_number ON sales(status,number DESC);
CREATE INDEX sales_month ON sales(local_month,status);
CREATE INDEX sale_items_product ON sale_items(product_id,sale_id);
CREATE INDEX sale_events_clock ON sale_events(created_at_utc);
CREATE INDEX stock_movements_clock ON stock_movements(created_at_utc);
