-- Counterparties and account movements share typed storage.
PRAGMA legacy_alter_table=ON;

CREATE TABLE parties (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 140), search_name TEXT NOT NULL,
 phone TEXT,email TEXT,contact_name TEXT CHECK(contact_name IS NULL OR length(contact_name) BETWEEN 1 AND 120),
 address TEXT CHECK(address IS NULL OR length(address) BETWEEN 1 AND 240), notes TEXT,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 credit_enabled INTEGER NOT NULL DEFAULT 0 CHECK(credit_enabled IN (0,1)), credit_limit_cents INTEGER NOT NULL DEFAULT 0 CHECK(credit_limit_cents BETWEEN 0 AND 9999999999),
 is_customer INTEGER NOT NULL DEFAULT 0 CHECK(is_customer IN (0,1)), is_supplier INTEGER NOT NULL DEFAULT 0 CHECK(is_supplier IN (0,1)),
 created_at_utc TEXT NOT NULL,updated_at_utc TEXT NOT NULL,
 CHECK(is_customer=1 OR is_supplier=1),
 CHECK(is_supplier=0 OR ((phone IS NULL OR length(phone) BETWEEN 1 AND 40) AND (notes IS NULL OR length(notes) BETWEEN 1 AND 1000)))
) STRICT;
INSERT INTO parties(id,name,search_name,phone,email,notes,active,credit_enabled,credit_limit_cents,revision,created_at_utc,updated_at_utc,is_customer) SELECT id,name,search_name,phone,email,notes,active,credit_enabled,credit_limit_cents,revision,created_at_utc,updated_at_utc,1 FROM customers;
INSERT INTO parties(id,name,search_name,phone,contact_name,address,notes,active,revision,created_at_utc,updated_at_utc,is_supplier) SELECT id,name,search_name,phone,contact_name,address,notes,active,revision,created_at_utc,updated_at_utc,1 FROM suppliers;
CREATE INDEX parties_customer_search ON parties(is_customer,active,search_name,id);
CREATE INDEX parties_supplier_search ON parties(is_supplier,active,search_name,id);
CREATE INDEX parties_supplier_name ON parties(is_supplier,search_name,id);

CREATE TABLE account_payments (
  id TEXT PRIMARY KEY NOT NULL,
  operation_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  note TEXT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
  register_movement_id TEXT,
  created_at_utc TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('IN','OUT')),
  UNIQUE(direction,operation_key),
  CHECK((method='CASH' AND shift_id IS NOT NULL) OR (method<>'CASH' AND shift_id IS NULL))
) STRICT;

INSERT INTO account_payments(id,operation_key,payload_hash,party_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,register_movement_id,created_at_utc,direction) SELECT id,operation_key,payload_hash,customer_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,register_movement_id,created_at_utc,'IN' FROM customer_collections;

INSERT INTO account_payments(id,operation_key,payload_hash,party_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,register_movement_id,created_at_utc,direction) SELECT id,operation_key,payload_hash,supplier_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,register_movement_id,created_at_utc,'OUT' FROM supplier_payments;

CREATE INDEX account_payments_party_date ON account_payments(direction,party_id,business_date DESC,created_at_utc DESC,id);
CREATE TABLE account_payment_allocations (
 id INTEGER PRIMARY KEY,payment_id TEXT NOT NULL REFERENCES account_payments(id) ON DELETE RESTRICT,
 sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT,purchase_id TEXT REFERENCES purchases(id) ON DELETE RESTRICT,
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
 CHECK((sale_id IS NOT NULL)+(purchase_id IS NOT NULL)=1),UNIQUE(payment_id,sale_id),UNIQUE(payment_id,purchase_id)
) STRICT;
INSERT INTO account_payment_allocations(payment_id,sale_id,amount_cents) SELECT collection_id,sale_id,amount_cents FROM customer_collection_allocations;
INSERT INTO account_payment_allocations(payment_id,purchase_id,amount_cents) SELECT payment_id,purchase_id,amount_cents FROM supplier_payment_allocations;
CREATE INDEX account_allocations_sale ON account_payment_allocations(sale_id,payment_id) WHERE sale_id IS NOT NULL;
CREATE INDEX account_allocations_purchase ON account_payment_allocations(purchase_id,payment_id) WHERE purchase_id IS NOT NULL;
CREATE TABLE account_credits (
 id TEXT PRIMARY KEY NOT NULL,party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
 sale_id TEXT UNIQUE REFERENCES sales(id) ON DELETE RESTRICT,purchase_id TEXT UNIQUE REFERENCES purchases(id) ON DELETE RESTRICT,
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),reason TEXT NOT NULL,created_at_utc TEXT NOT NULL,
 CHECK((sale_id IS NOT NULL)+(purchase_id IS NOT NULL)=1),CHECK(purchase_id IS NULL OR length(reason) BETWEEN 3 AND 240)
) STRICT;
INSERT INTO account_credits(id,party_id,sale_id,amount_cents,reason,created_at_utc) SELECT id,customer_id,sale_id,amount_cents,reason,created_at_utc FROM customer_credits;
INSERT INTO account_credits(id,party_id,purchase_id,amount_cents,reason,created_at_utc) SELECT id,supplier_id,purchase_id,amount_cents,reason,created_at_utc FROM supplier_credits;
CREATE INDEX account_credits_party_date ON account_credits(party_id,created_at_utc DESC,id);

CREATE TABLE sales_v34 (
 id TEXT PRIMARY KEY NOT NULL, number INTEGER NOT NULL CHECK(number > 0),
 checkout_key TEXT UNIQUE, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('COMPLETED','VOIDED','CONFIRMED')),
 created_at_utc TEXT NOT NULL, business_date TEXT NOT NULL, local_month TEXT NOT NULL,
 subtotal_cents INTEGER CHECK(subtotal_cents BETWEEN 0 AND 9999999999),
 discount_cents INTEGER CHECK(discount_cents BETWEEN 0 AND subtotal_cents),
 total_cents INTEGER NOT NULL CHECK(total_cents BETWEEN 0 AND 9999999999 AND (total_cents = subtotal_cents - discount_cents)),
 discount_json TEXT CHECK(json_valid(discount_json))
, actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, actor_name TEXT, terminal_id TEXT REFERENCES terminals(id), register_shift_id TEXT REFERENCES register_shifts(id), promotions_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(promotions_json)), customer_id TEXT REFERENCES parties(id) ON DELETE RESTRICT, customer_name TEXT, on_account_cents INTEGER NOT NULL DEFAULT 0 CHECK(on_account_cents BETWEEN 0 AND total_cents), location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT, debt_party_id TEXT REFERENCES parties(id) ON DELETE RESTRICT, debt_original_cents INTEGER CHECK(debt_original_cents BETWEEN 1 AND 9999999999), debt_balance_cents INTEGER CHECK(debt_balance_cents BETWEEN 0 AND debt_original_cents), debt_status TEXT CHECK(debt_status IN ('OPEN','PAID','VOIDED')), debt_created_at_utc TEXT, debt_updated_at_utc TEXT, due_on TEXT, due_revision INTEGER NOT NULL DEFAULT 1,
document_type TEXT NOT NULL DEFAULT 'SALE' CHECK(document_type IN ('SALE','RETURN')),
 original_sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT,
 operation_key TEXT UNIQUE, input_json TEXT CHECK(input_json IS NULL OR json_valid(input_json)), reason TEXT,
 cost_cents INTEGER CHECK(cost_cents BETWEEN 0 AND 9999999999),
 UNIQUE(document_type,number), UNIQUE(document_type,id),
 CHECK((document_type='SALE' AND status IN ('COMPLETED','VOIDED') AND original_sale_id IS NULL AND checkout_key IS NOT NULL AND subtotal_cents IS NOT NULL AND discount_cents IS NOT NULL AND discount_json IS NOT NULL)
 OR (document_type='RETURN' AND status='CONFIRMED' AND original_sale_id IS NOT NULL AND operation_key IS NOT NULL AND input_json IS NOT NULL AND reason IS NOT NULL AND actor_user_id IS NOT NULL AND actor_name IS NOT NULL AND debt_status IS NULL))
) STRICT;

INSERT INTO sales_v34(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,actor_user_id,actor_name,terminal_id,register_shift_id,promotions_json,customer_id,customer_name,on_account_cents,location_id,debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision,document_type,original_sale_id,operation_key,input_json,reason,cost_cents) SELECT id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,actor_user_id,actor_name,terminal_id,register_shift_id,promotions_json,customer_id,customer_name,on_account_cents,location_id,debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision,document_type,original_sale_id,operation_key,input_json,reason,cost_cents FROM sales;

DROP TABLE sales;

ALTER TABLE sales_v34 RENAME TO sales;

CREATE INDEX sales_customer_date ON sales(customer_id,created_at_utc DESC) WHERE customer_id IS NOT NULL;

CREATE INDEX sales_date_number ON sales(business_date,number DESC);

CREATE INDEX sales_debt_due ON sales(debt_status,due_on,id);

CREATE INDEX sales_debt_party ON sales(debt_party_id,debt_status,debt_created_at_utc,id);

CREATE INDEX sales_location_date ON sales(location_id,business_date,status);

CREATE INDEX sales_month ON sales(local_month,status);

CREATE INDEX sales_original ON sales(original_sale_id,number) WHERE document_type='RETURN';

CREATE INDEX sales_shift ON sales(register_shift_id,status);

CREATE INDEX sales_status_business_date ON sales(status,business_date);

CREATE INDEX sales_status_number ON sales(status,number DESC);

CREATE TABLE purchases_v34 (
  id TEXT PRIMARY KEY NOT NULL,
  number INTEGER NOT NULL UNIQUE CHECK(number>0),
  receipt_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  status TEXT NOT NULL CHECK(status IN ('RECEIVED','VOIDED')),
  received_at_utc TEXT NOT NULL,
  business_date TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK(total_cents BETWEEN 0 AND 9999999999),
  stock_applied INTEGER NOT NULL CHECK(stock_applied IN (0,1)),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL
, debt_party_id TEXT REFERENCES parties(id) ON DELETE RESTRICT, debt_original_cents INTEGER CHECK(debt_original_cents BETWEEN 1 AND 9999999999), debt_balance_cents INTEGER CHECK(debt_balance_cents BETWEEN 0 AND debt_original_cents), debt_status TEXT CHECK(debt_status IN ('OPEN','PAID','VOIDED')), debt_created_at_utc TEXT, debt_updated_at_utc TEXT, due_on TEXT, due_revision INTEGER NOT NULL DEFAULT 1) STRICT;

INSERT INTO purchases_v34(id,number,receipt_key,payload_hash,supplier_id,supplier_name,supplier_phone,status,received_at_utc,business_date,total_cents,stock_applied,actor_user_id,actor_name,debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision) SELECT id,number,receipt_key,payload_hash,supplier_id,supplier_name,supplier_phone,status,received_at_utc,business_date,total_cents,stock_applied,actor_user_id,actor_name,debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision FROM purchases;

DROP TABLE purchases;

ALTER TABLE purchases_v34 RENAME TO purchases;

CREATE INDEX purchases_date_number ON purchases(business_date,number DESC);

CREATE INDEX purchases_debt_due ON purchases(debt_status,due_on,id);

CREATE INDEX purchases_debt_party ON purchases(debt_party_id,debt_status,debt_created_at_utc,id);

CREATE INDEX purchases_status_number ON purchases(status,number DESC);

CREATE INDEX purchases_supplier_date ON purchases(supplier_id,business_date DESC,number DESC);

CREATE TABLE register_movements_v34 (
 id TEXT PRIMARY KEY NOT NULL, shift_id TEXT NOT NULL REFERENCES register_shifts(id),
 kind TEXT NOT NULL CHECK(kind IN ('IN','OUT','REFUND')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999), reason TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), created_at_utc TEXT NOT NULL,
 operation_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 sale_id TEXT REFERENCES sales(id)
, return_id TEXT REFERENCES sales(id) ON DELETE RESTRICT, supplier_payment_id TEXT REFERENCES account_payments(id) ON DELETE RESTRICT, customer_collection_id TEXT REFERENCES account_payments(id) ON DELETE RESTRICT) STRICT;

INSERT INTO register_movements_v34(id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,sale_id,return_id,supplier_payment_id,customer_collection_id) SELECT id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,sale_id,return_id,supplier_payment_id,customer_collection_id FROM register_movements;

DROP TABLE register_movements;

ALTER TABLE register_movements_v34 RENAME TO register_movements;

CREATE UNIQUE INDEX one_cash_refund_per_sale ON register_movements(sale_id) WHERE kind='REFUND';

CREATE UNIQUE INDEX register_customer_collection ON register_movements(customer_collection_id) WHERE customer_collection_id IS NOT NULL;

CREATE INDEX register_movements_shift ON register_movements(shift_id);

CREATE UNIQUE INDEX register_return_refund ON register_movements(return_id)
  WHERE return_id IS NOT NULL;

CREATE UNIQUE INDEX register_supplier_payment ON register_movements(supplier_payment_id)
  WHERE supplier_payment_id IS NOT NULL;

CREATE TABLE replenishment_orders_v34 (
  id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE CHECK(number>0), supplier_id TEXT NOT NULL REFERENCES parties(id),
  location_id TEXT NOT NULL REFERENCES locations(id), status TEXT NOT NULL CHECK(status IN ('DRAFT','ORDERED','PARTIAL','RECEIVED','CANCELLED')),
  expected_date TEXT, revision INTEGER NOT NULL CHECK(revision>0), actor_user_id TEXT NOT NULL REFERENCES users(id), created_at_utc TEXT NOT NULL
) STRICT;

INSERT INTO replenishment_orders_v34(id,number,supplier_id,location_id,status,expected_date,revision,actor_user_id,created_at_utc) SELECT id,number,supplier_id,location_id,status,expected_date,revision,actor_user_id,created_at_utc FROM replenishment_orders;

DROP TABLE replenishment_orders;

ALTER TABLE replenishment_orders_v34 RENAME TO replenishment_orders;

CREATE INDEX replenishment_orders_pending ON replenishment_orders(location_id,status,expected_date);

DROP TABLE customer_collection_allocations;

DROP TABLE supplier_payment_allocations;

DROP TABLE customer_credits;

DROP TABLE supplier_credits;

DROP TABLE customer_collections;

DROP TABLE supplier_payments;

DROP TABLE customers;

DROP TABLE suppliers;

CREATE VIEW customers AS SELECT id,name,search_name,phone,email,notes,active,credit_enabled,credit_limit_cents,revision,created_at_utc,updated_at_utc FROM parties WHERE is_customer=1;
CREATE VIEW suppliers AS SELECT id,name,search_name,phone,contact_name,address,notes,active,revision,created_at_utc,updated_at_utc FROM parties WHERE is_supplier=1;
CREATE VIEW customer_collections AS SELECT id,operation_key,payload_hash,party_id customer_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,register_movement_id,created_at_utc FROM account_payments WHERE direction='IN';
CREATE VIEW supplier_payments AS SELECT id,operation_key,payload_hash,party_id supplier_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,register_movement_id,created_at_utc FROM account_payments WHERE direction='OUT';
CREATE VIEW customer_collection_allocations AS SELECT payment_id collection_id,sale_id,amount_cents FROM account_payment_allocations WHERE sale_id IS NOT NULL;
CREATE VIEW supplier_payment_allocations AS SELECT payment_id,purchase_id,amount_cents FROM account_payment_allocations WHERE purchase_id IS NOT NULL;
CREATE VIEW customer_credits AS SELECT id,party_id customer_id,sale_id,amount_cents,reason,created_at_utc FROM account_credits WHERE sale_id IS NOT NULL;
CREATE VIEW supplier_credits AS SELECT id,party_id supplier_id,purchase_id,amount_cents,reason,created_at_utc FROM account_credits WHERE purchase_id IS NOT NULL;

CREATE TRIGGER account_payment_party_insert BEFORE INSERT ON account_payments BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.party_id AND CASE NEW.direction WHEN 'IN' THEN is_customer ELSE is_supplier END=1) THEN RAISE(ABORT,'El pago requiere el tipo de contraparte correspondiente') END;
 SELECT CASE WHEN NEW.direction='OUT' AND NEW.note IS NOT NULL AND length(NEW.note) NOT BETWEEN 1 AND 240 THEN RAISE(ABORT,'La nota de pago es inválida') END;
END;
CREATE TRIGGER account_payment_identity_update BEFORE UPDATE OF direction,party_id ON account_payments WHEN NEW.direction<>OLD.direction OR NEW.party_id<>OLD.party_id BEGIN
 SELECT RAISE(ABORT,'El sentido y titular del pago son inmutables');
END;
CREATE TRIGGER account_allocation_document_insert BEFORE INSERT ON account_payment_allocations BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM account_payments p LEFT JOIN sales s ON s.id=NEW.sale_id LEFT JOIN purchases b ON b.id=NEW.purchase_id WHERE p.id=NEW.payment_id AND ((p.direction='IN' AND s.document_type='SALE' AND s.debt_party_id=p.party_id AND s.debt_status IS NOT NULL AND NEW.purchase_id IS NULL) OR (p.direction='OUT' AND b.debt_party_id=p.party_id AND b.debt_status IS NOT NULL AND NEW.sale_id IS NULL))) THEN RAISE(ABORT,'La imputación no corresponde al pago y su cuenta') END;
END;
CREATE TRIGGER account_allocation_immutable_update BEFORE UPDATE ON account_payment_allocations BEGIN
 SELECT RAISE(ABORT,'La imputación es inmutable');
END;
CREATE TRIGGER account_credit_document_insert BEFORE INSERT ON account_credits BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM parties p LEFT JOIN sales s ON s.id=NEW.sale_id LEFT JOIN purchases b ON b.id=NEW.purchase_id WHERE p.id=NEW.party_id AND ((p.is_customer=1 AND s.document_type='SALE' AND s.debt_party_id=p.id AND NEW.purchase_id IS NULL) OR (p.is_supplier=1 AND b.debt_party_id=p.id AND NEW.sale_id IS NULL))) THEN RAISE(ABORT,'El crédito no corresponde a su cuenta') END;
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
CREATE TRIGGER register_document_types_insert BEFORE INSERT ON register_movements BEGIN
 SELECT CASE WHEN NEW.sale_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.sale_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.return_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER register_document_types_update BEFORE UPDATE ON register_movements BEGIN
 SELECT CASE WHEN NEW.sale_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.sale_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.return_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER register_account_types_insert BEFORE INSERT ON register_movements BEGIN
 SELECT CASE WHEN NEW.customer_collection_id IS NOT NULL AND EXISTS(SELECT 1 FROM account_payments WHERE id=NEW.customer_collection_id AND direction<>'IN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.supplier_payment_id IS NOT NULL AND EXISTS(SELECT 1 FROM account_payments WHERE id=NEW.supplier_payment_id AND direction<>'OUT') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER register_account_types_update BEFORE UPDATE ON register_movements BEGIN
 SELECT CASE WHEN NEW.customer_collection_id IS NOT NULL AND EXISTS(SELECT 1 FROM account_payments WHERE id=NEW.customer_collection_id AND direction<>'IN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.supplier_payment_id IS NOT NULL AND EXISTS(SELECT 1 FROM account_payments WHERE id=NEW.supplier_payment_id AND direction<>'OUT') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER account_payment_note_insert BEFORE INSERT ON account_payments BEGIN
 SELECT CASE WHEN NEW.direction='OUT' AND NEW.note IS NOT NULL AND length(NEW.note) NOT BETWEEN 1 AND 240 THEN RAISE(ABORT,'La nota de pago es inválida') END;
END;
CREATE TRIGGER account_payment_note_update BEFORE UPDATE ON account_payments BEGIN
 SELECT CASE WHEN NEW.direction='OUT' AND NEW.note IS NOT NULL AND length(NEW.note) NOT BETWEEN 1 AND 240 THEN RAISE(ABORT,'La nota de pago es inválida') END;
END;
PRAGMA legacy_alter_table=OFF;
