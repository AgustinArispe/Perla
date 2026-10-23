-- Sales and returns share documents, lines, settlements and events.
-- Rebuilt atomically with FK checks before commit; IDs are never discarded.
PRAGMA legacy_alter_table=ON;

CREATE TABLE sales_v33 (
 id TEXT PRIMARY KEY NOT NULL, number INTEGER NOT NULL CHECK(number > 0),
 checkout_key TEXT UNIQUE, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('COMPLETED','VOIDED','CONFIRMED')),
 created_at_utc TEXT NOT NULL, business_date TEXT NOT NULL, local_month TEXT NOT NULL,
 subtotal_cents INTEGER CHECK(subtotal_cents BETWEEN 0 AND 9999999999),
 discount_cents INTEGER CHECK(discount_cents BETWEEN 0 AND subtotal_cents),
 total_cents INTEGER NOT NULL CHECK(total_cents BETWEEN 0 AND 9999999999 AND (total_cents = subtotal_cents - discount_cents)),
 discount_json TEXT CHECK(json_valid(discount_json))
, actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, actor_name TEXT, terminal_id TEXT REFERENCES terminals(id), register_shift_id TEXT REFERENCES register_shifts(id), promotions_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(promotions_json)), customer_id TEXT REFERENCES customers(id) ON DELETE RESTRICT, customer_name TEXT, on_account_cents INTEGER NOT NULL DEFAULT 0 CHECK(on_account_cents BETWEEN 0 AND total_cents), location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT, debt_party_id TEXT REFERENCES customers(id) ON DELETE RESTRICT, debt_original_cents INTEGER CHECK(debt_original_cents BETWEEN 1 AND 9999999999), debt_balance_cents INTEGER CHECK(debt_balance_cents BETWEEN 0 AND debt_original_cents), debt_status TEXT CHECK(debt_status IN ('OPEN','PAID','VOIDED')), debt_created_at_utc TEXT, debt_updated_at_utc TEXT, due_on TEXT, due_revision INTEGER NOT NULL DEFAULT 1,
document_type TEXT NOT NULL DEFAULT 'SALE' CHECK(document_type IN ('SALE','RETURN')),
 original_sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT,
 operation_key TEXT UNIQUE, input_json TEXT CHECK(input_json IS NULL OR json_valid(input_json)), reason TEXT,
 cost_cents INTEGER CHECK(cost_cents BETWEEN 0 AND 9999999999),
 UNIQUE(document_type,number), UNIQUE(document_type,id),
 CHECK((document_type='SALE' AND status IN ('COMPLETED','VOIDED') AND original_sale_id IS NULL AND checkout_key IS NOT NULL AND subtotal_cents IS NOT NULL AND discount_cents IS NOT NULL AND discount_json IS NOT NULL)
 OR (document_type='RETURN' AND status='CONFIRMED' AND original_sale_id IS NOT NULL AND operation_key IS NOT NULL AND input_json IS NOT NULL AND reason IS NOT NULL AND actor_user_id IS NOT NULL AND actor_name IS NOT NULL AND debt_status IS NULL))
) STRICT;

INSERT INTO sales_v33(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,actor_user_id,actor_name,terminal_id,register_shift_id,promotions_json,customer_id,customer_name,on_account_cents,location_id,debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision) SELECT id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,actor_user_id,actor_name,terminal_id,register_shift_id,promotions_json,customer_id,customer_name,on_account_cents,location_id,debt_party_id,debt_original_cents,debt_balance_cents,debt_status,debt_created_at_utc,debt_updated_at_utc,due_on,due_revision FROM sales;

INSERT INTO sales_v33(id,number,original_sale_id,operation_key,payload_hash,input_json,status,reason,total_cents,cost_cents,actor_user_id,actor_name,created_at_utc,business_date,local_month,document_type)
 SELECT id,number,sale_id,operation_key,payload_hash,input_json,status,reason,total_cents,cost_cents,actor_user_id,actor_name,created_at_utc,business_date,local_month,'RETURN' FROM sale_returns;

DROP TABLE sales;

ALTER TABLE sales_v33 RENAME TO sales;

CREATE INDEX sales_customer_date ON sales(customer_id,created_at_utc DESC) WHERE customer_id IS NOT NULL;

CREATE INDEX sales_date_number ON sales(business_date,number DESC);

CREATE INDEX sales_debt_due ON sales(debt_status,due_on,id);

CREATE INDEX sales_debt_party ON sales(debt_party_id,debt_status,debt_created_at_utc,id);

CREATE INDEX sales_location_date ON sales(location_id,business_date,status);

CREATE INDEX sales_month ON sales(local_month,status);

CREATE INDEX sales_shift ON sales(register_shift_id,status);

CREATE INDEX sales_status_business_date ON sales(status,business_date);

CREATE INDEX sales_status_number ON sales(status,number DESC);

CREATE INDEX sales_original ON sales(original_sale_id,number) WHERE document_type='RETURN';

CREATE TABLE sale_items_v33 (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 line_id TEXT NOT NULL, position INTEGER NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 sku TEXT NOT NULL, barcode TEXT, name TEXT NOT NULL, unit TEXT NOT NULL CHECK(unit IN ('UNIT','KG')),
 unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents BETWEEN 1 AND 9999999999),
 quantity_base INTEGER NOT NULL CHECK(quantity_base BETWEEN 1 AND 1000000000),
 gross_cents INTEGER NOT NULL CHECK(gross_cents BETWEEN 0 AND 9999999999),
 discount_cents INTEGER NOT NULL CHECK(discount_cents BETWEEN 0 AND gross_cents),
 net_cents INTEGER NOT NULL CHECK(net_cents = gross_cents - discount_cents), cost_method TEXT CHECK(cost_method IS NULL OR cost_method IN ('WEIGHTED_AVERAGE','REFERENCE')), cost_rate_micros_per_base INTEGER CHECK(cost_rate_micros_per_base IS NULL OR cost_rate_micros_per_base>0), cost_cents INTEGER CHECK(cost_cents IS NULL OR cost_cents>=0), cost_effective_at_utc TEXT, category_name TEXT, promotion_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(promotion_discount_cents>=0), manual_discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(manual_discount_cents>=0),
 document_type TEXT NOT NULL DEFAULT 'SALE' CHECK(document_type IN ('SALE','RETURN')),
 original_sale_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT,
 disposition TEXT CHECK(disposition IN ('RESTOCK','WASTE','NONE')),
 FOREIGN KEY(document_type,sale_id) REFERENCES sales(document_type,id) ON DELETE RESTRICT,
 CHECK((document_type='SALE' AND original_sale_item_id IS NULL AND disposition IS NULL) OR (document_type='RETURN' AND original_sale_item_id IS NOT NULL AND disposition IS NOT NULL)),
 UNIQUE(sale_id,original_sale_item_id),
 UNIQUE(sale_id,line_id), UNIQUE(sale_id,position)
) STRICT;

INSERT INTO sale_items_v33(id,sale_id,line_id,position,product_id,sku,barcode,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_method,cost_rate_micros_per_base,cost_cents,cost_effective_at_utc,category_name,promotion_discount_cents,manual_discount_cents) SELECT id,sale_id,line_id,position,product_id,sku,barcode,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_method,cost_rate_micros_per_base,cost_cents,cost_effective_at_utc,category_name,promotion_discount_cents,manual_discount_cents FROM sale_items;

INSERT INTO sale_items_v33(id,sale_id,line_id,position,product_id,sku,barcode,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_cents,document_type,original_sale_item_id,disposition)
 SELECT r.id,r.return_id,r.sale_item_id,i.position,r.product_id,i.sku,i.barcode,i.name,i.unit,i.unit_price_cents,r.quantity_base,r.gross_cents,r.discount_cents,r.net_cents,r.cost_cents,'RETURN',r.sale_item_id,r.disposition FROM sale_return_items r JOIN sale_items i ON i.id=r.sale_item_id;

DROP TABLE sale_items;

ALTER TABLE sale_items_v33 RENAME TO sale_items;

CREATE INDEX sale_items_product ON sale_items(product_id,sale_id);

CREATE INDEX sale_items_original ON sale_items(original_sale_item_id,sale_id) WHERE original_sale_item_id IS NOT NULL;

CREATE TABLE sale_payments_v33 (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 position INTEGER NOT NULL, method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 0 AND 9999999999),
 tendered_cents INTEGER CHECK(tendered_cents BETWEEN amount_cents AND 9999999999),
 change_cents INTEGER NOT NULL CHECK(change_cents >= 0),
 direction TEXT NOT NULL DEFAULT 'PAYMENT' CHECK(direction IN ('PAYMENT','REFUND')),
 register_shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
 register_movement_id TEXT REFERENCES register_movements(id) ON DELETE RESTRICT,
 CHECK(direction='REFUND' OR amount_cents>0),
 CHECK(method = 'CASH' OR (tendered_cents IS NULL AND change_cents = 0)),
 CHECK(change_cents = COALESCE(tendered_cents,amount_cents) - amount_cents), UNIQUE(sale_id,position)
) STRICT;

INSERT INTO sale_payments_v33(id,sale_id,position,method,amount_cents,tendered_cents,change_cents) SELECT id,sale_id,position,method,amount_cents,tendered_cents,change_cents FROM sale_payments;

INSERT INTO sale_payments_v33(id,sale_id,position,method,amount_cents,change_cents,direction,register_shift_id,register_movement_id)
 SELECT id,return_id,0,method,amount_cents,0,'REFUND',register_shift_id,register_movement_id FROM sale_return_refunds;

DROP TABLE sale_payments;

ALTER TABLE sale_payments_v33 RENAME TO sale_payments;

CREATE UNIQUE INDEX one_refund_per_return ON sale_payments(sale_id) WHERE direction='REFUND';

CREATE TABLE sale_events_v33 (
 id TEXT PRIMARY KEY NOT NULL, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('COMPLETED','VOIDED','CONFIRMED')), reason TEXT NOT NULL,
 operation_key TEXT UNIQUE, payload_hash TEXT, created_at_utc TEXT NOT NULL, clock_warning TEXT, actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, actor_name TEXT,
 CHECK(kind='CONFIRMED' OR (operation_key IS NOT NULL AND payload_hash IS NOT NULL)),
 UNIQUE(sale_id,kind)
) STRICT;

INSERT INTO sale_events_v33(id,sale_id,kind,reason,operation_key,payload_hash,created_at_utc,clock_warning,actor_user_id,actor_name) SELECT id,sale_id,kind,reason,operation_key,payload_hash,created_at_utc,clock_warning,actor_user_id,actor_name FROM sale_events;

INSERT INTO sale_events_v33(id,sale_id,kind,reason,actor_user_id,actor_name,created_at_utc)
 SELECT id,return_id,kind,reason,actor_user_id,actor_name,created_at_utc FROM sale_return_events;

DROP TABLE sale_events;

ALTER TABLE sale_events_v33 RENAME TO sale_events;

CREATE INDEX sale_events_clock ON sale_events(created_at_utc);

INSERT INTO sale_item_lots SELECT return_item_id,lot_id,quantity_base FROM sale_return_item_lots;

CREATE TABLE stock_movements_v33 (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  delta_base INTEGER NOT NULL CHECK(delta_base BETWEEN -2000000000 AND 2000000000),
  balance_after_base INTEGER NOT NULL CHECK(balance_after_base BETWEEN -1000000000 AND 1000000000),
  kind TEXT NOT NULL CHECK(kind IN ('OPENING','RECEIPT','WASTE','ADJUSTMENT','SALE','VOID')),
  reason TEXT NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  created_at_utc TEXT NOT NULL,
  business_date TEXT NOT NULL, sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT, sale_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT, actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT, actor_name TEXT, purchase_id TEXT REFERENCES purchases(id) ON DELETE RESTRICT, purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT, return_id TEXT REFERENCES sales(id) ON DELETE RESTRICT, return_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT, location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT, transfer_id TEXT REFERENCES stock_transfers(id) ON DELETE RESTRICT, transfer_item_id TEXT REFERENCES stock_transfer_items(id) ON DELETE RESTRICT,
  CHECK(delta_base != 0 OR kind IN ('OPENING','ADJUSTMENT')),
  CHECK(kind != 'RECEIPT' OR delta_base > 0),
  CHECK(kind != 'WASTE' OR delta_base < 0)
) STRICT;

INSERT INTO stock_movements_v33(sequence,id,product_id,delta_base,balance_after_base,kind,reason,operation_key,payload_hash,result_json,created_at_utc,business_date,sale_id,sale_item_id,actor_user_id,actor_name,purchase_id,purchase_item_id,return_id,return_item_id,location_id,transfer_id,transfer_item_id) SELECT sequence,id,product_id,delta_base,balance_after_base,kind,reason,operation_key,payload_hash,result_json,created_at_utc,business_date,sale_id,sale_item_id,actor_user_id,actor_name,purchase_id,purchase_item_id,return_id,return_item_id,location_id,transfer_id,transfer_item_id FROM stock_movements;

DROP TABLE stock_movements;

ALTER TABLE stock_movements_v33 RENAME TO stock_movements;

CREATE INDEX stock_movements_clock ON stock_movements(created_at_utc);

CREATE INDEX stock_movements_product_date ON stock_movements(product_id, business_date, sequence DESC);

CREATE INDEX stock_movements_product_sequence ON stock_movements(product_id, sequence DESC);

CREATE UNIQUE INDEX stock_purchase_item_kind ON stock_movements(purchase_item_id,kind)
  WHERE purchase_item_id IS NOT NULL;

CREATE INDEX stock_purchase_sequence ON stock_movements(purchase_id,sequence);

CREATE UNIQUE INDEX stock_return_item_kind ON stock_movements(return_item_id,kind)
  WHERE return_item_id IS NOT NULL;

CREATE INDEX stock_return_sequence ON stock_movements(return_id,sequence);

CREATE UNIQUE INDEX stock_sale_item_kind ON stock_movements(sale_item_id,kind) WHERE sale_item_id IS NOT NULL;

CREATE INDEX stock_sale_sequence ON stock_movements(sale_id,sequence);

CREATE TABLE register_movements_v33 (
 id TEXT PRIMARY KEY NOT NULL, shift_id TEXT NOT NULL REFERENCES register_shifts(id),
 kind TEXT NOT NULL CHECK(kind IN ('IN','OUT','REFUND')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999), reason TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), created_at_utc TEXT NOT NULL,
 operation_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 sale_id TEXT REFERENCES sales(id)
, return_id TEXT REFERENCES sales(id) ON DELETE RESTRICT, supplier_payment_id TEXT REFERENCES supplier_payments(id) ON DELETE RESTRICT, customer_collection_id TEXT REFERENCES customer_collections(id) ON DELETE RESTRICT) STRICT;

INSERT INTO register_movements_v33(id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,sale_id,return_id,supplier_payment_id,customer_collection_id) SELECT id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,sale_id,return_id,supplier_payment_id,customer_collection_id FROM register_movements;

DROP TABLE register_movements;

ALTER TABLE register_movements_v33 RENAME TO register_movements;

CREATE UNIQUE INDEX one_cash_refund_per_sale ON register_movements(sale_id) WHERE kind='REFUND';

CREATE UNIQUE INDEX register_customer_collection ON register_movements(customer_collection_id) WHERE customer_collection_id IS NOT NULL;

CREATE INDEX register_movements_shift ON register_movements(shift_id);

CREATE UNIQUE INDEX register_return_refund ON register_movements(return_id)
  WHERE return_id IS NOT NULL;

CREATE UNIQUE INDEX register_supplier_payment ON register_movements(supplier_payment_id)
  WHERE supplier_payment_id IS NOT NULL;

CREATE TABLE lot_movements_v33 (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  delta_base INTEGER NOT NULL CHECK(delta_base!=0),
  balance_after_base INTEGER NOT NULL CHECK(balance_after_base BETWEEN 0 AND 1000000000),
  kind TEXT NOT NULL CHECK(kind IN ('RECEIPT','SALE','RETURN','VOID','WASTE','ADJUSTMENT')),
  reason TEXT NOT NULL,
  operation_key TEXT NOT NULL REFERENCES lot_operations(operation_key) ON DELETE RESTRICT,
  sale_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT,
  purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT,
  return_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
) STRICT;

INSERT INTO lot_movements_v33(sequence,id,lot_id,delta_base,balance_after_base,kind,reason,operation_key,sale_item_id,purchase_item_id,return_item_id,actor_user_id,actor_name,created_at_utc) SELECT sequence,id,lot_id,delta_base,balance_after_base,kind,reason,operation_key,sale_item_id,purchase_item_id,return_item_id,actor_user_id,actor_name,created_at_utc FROM lot_movements;

DROP TABLE lot_movements;

ALTER TABLE lot_movements_v33 RENAME TO lot_movements;

CREATE INDEX lot_movements_lot_sequence ON lot_movements(lot_id,sequence DESC);

CREATE INDEX lot_movements_sale_item ON lot_movements(sale_item_id,sequence);

DROP TABLE sale_return_item_lots;

DROP TABLE sale_return_refunds;

DROP TABLE sale_return_events;

DROP TABLE sale_return_items;

DROP TABLE sale_returns;

CREATE VIEW sale_orders AS SELECT * FROM sales WHERE document_type='SALE';
CREATE VIEW sale_order_items AS SELECT * FROM sale_items WHERE document_type='SALE';
CREATE VIEW sale_order_payments AS SELECT * FROM sale_payments WHERE direction='PAYMENT';
CREATE VIEW sale_order_events AS SELECT rowid AS rowid,* FROM sale_events WHERE kind IN ('COMPLETED','VOIDED');
CREATE VIEW sale_returns AS SELECT id,number,original_sale_id sale_id,operation_key,payload_hash,input_json,status,reason,total_cents,cost_cents,actor_user_id,actor_name,created_at_utc,business_date,local_month FROM sales WHERE document_type='RETURN';
CREATE VIEW sale_return_items AS SELECT id,sale_id return_id,original_sale_item_id sale_item_id,product_id,quantity_base,gross_cents,discount_cents,net_cents,cost_cents,disposition FROM sale_items WHERE document_type='RETURN';
CREATE VIEW sale_return_refunds AS SELECT id,sale_id return_id,method,amount_cents,register_shift_id,register_movement_id FROM sale_payments WHERE direction='REFUND';
CREATE VIEW sale_return_events AS SELECT id,sale_id return_id,kind,reason,actor_user_id,actor_name,created_at_utc FROM sale_events WHERE kind='CONFIRMED';
CREATE VIEW sale_return_item_lots AS SELECT l.sale_item_id return_item_id,l.lot_id,l.quantity_base FROM sale_item_lots l JOIN sale_items i ON i.id=l.sale_item_id WHERE i.document_type='RETURN';

CREATE TRIGGER sales_return_origin_insert BEFORE INSERT ON sales WHEN NEW.document_type='RETURN' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sales s WHERE s.id=NEW.original_sale_id AND s.document_type='SALE') THEN RAISE(ABORT,'La devolución requiere una venta original') END;
END;
CREATE TRIGGER sales_document_identity_update BEFORE UPDATE OF document_type,original_sale_id ON sales
WHEN NEW.document_type<>OLD.document_type OR NEW.original_sale_id IS NOT OLD.original_sale_id BEGIN
 SELECT RAISE(ABORT,'El tipo y origen del documento son inmutables');
END;
CREATE TRIGGER sale_items_return_origin_insert BEFORE INSERT ON sale_items WHEN NEW.document_type='RETURN' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sale_items i JOIN sales r ON r.id=NEW.sale_id WHERE i.id=NEW.original_sale_item_id AND i.document_type='SALE' AND i.sale_id=r.original_sale_id AND i.product_id=NEW.product_id) THEN RAISE(ABORT,'La línea no corresponde a la venta original') END;
 SELECT CASE WHEN NEW.quantity_base+COALESCE((SELECT SUM(quantity_base) FROM sale_items WHERE original_sale_item_id=NEW.original_sale_item_id),0)>(SELECT quantity_base FROM sale_items WHERE id=NEW.original_sale_item_id) THEN RAISE(ABORT,'La devolución supera la cantidad vendida') END;
END;
CREATE TRIGGER sale_items_return_immutable BEFORE UPDATE ON sale_items WHEN OLD.document_type='RETURN' BEGIN
 SELECT RAISE(ABORT,'La línea devuelta es inmutable');
END;
CREATE TRIGGER sale_payment_document_insert BEFORE INSERT ON sale_payments BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sales s WHERE s.id=NEW.sale_id AND s.document_type=CASE NEW.direction WHEN 'PAYMENT' THEN 'SALE' ELSE 'RETURN' END) THEN RAISE(ABORT,'El pago no corresponde al tipo de documento') END;
END;
CREATE TRIGGER sale_payment_document_update BEFORE UPDATE OF sale_id,direction ON sale_payments BEGIN
 SELECT CASE WHEN NEW.sale_id<>OLD.sale_id OR NEW.direction<>OLD.direction THEN RAISE(ABORT,'El origen del pago es inmutable') END;
END;
CREATE TRIGGER sale_event_document_insert BEFORE INSERT ON sale_events BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sales s WHERE s.id=NEW.sale_id AND s.document_type=CASE NEW.kind WHEN 'CONFIRMED' THEN 'RETURN' ELSE 'SALE' END) THEN RAISE(ABORT,'El evento no corresponde al tipo de documento') END;
END;
CREATE TRIGGER sales_debt_complete_insert BEFORE INSERT ON sales BEGIN
 SELECT CASE WHEN NOT ((NEW.debt_party_id IS NULL AND NEW.debt_original_cents IS NULL AND NEW.debt_balance_cents IS NULL AND NEW.debt_status IS NULL AND NEW.debt_created_at_utc IS NULL AND NEW.debt_updated_at_utc IS NULL) OR (NEW.debt_party_id IS NOT NULL AND NEW.debt_original_cents IS NOT NULL AND NEW.debt_balance_cents IS NOT NULL AND NEW.debt_status IS NOT NULL AND NEW.debt_created_at_utc IS NOT NULL AND NEW.debt_updated_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER sales_debt_complete_update BEFORE UPDATE ON sales BEGIN
 SELECT CASE WHEN NOT ((NEW.debt_party_id IS NULL AND NEW.debt_original_cents IS NULL AND NEW.debt_balance_cents IS NULL AND NEW.debt_status IS NULL AND NEW.debt_created_at_utc IS NULL AND NEW.debt_updated_at_utc IS NULL) OR (NEW.debt_party_id IS NOT NULL AND NEW.debt_original_cents IS NOT NULL AND NEW.debt_balance_cents IS NOT NULL AND NEW.debt_status IS NOT NULL AND NEW.debt_created_at_utc IS NOT NULL AND NEW.debt_updated_at_utc IS NOT NULL)) THEN RAISE(ABORT,'El estado debe estar completo o ausente') END;
END;
CREATE TRIGGER stock_document_types_insert BEFORE INSERT ON stock_movements BEGIN
 SELECT CASE WHEN NEW.sale_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.sale_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.return_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.sale_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.sale_item_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.return_item_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER stock_document_types_update BEFORE UPDATE ON stock_movements BEGIN
 SELECT CASE WHEN NEW.sale_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.sale_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.return_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.sale_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.sale_item_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.return_item_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER register_document_types_insert BEFORE INSERT ON register_movements BEGIN
 SELECT CASE WHEN NEW.sale_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.sale_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.return_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER register_document_types_update BEFORE UPDATE ON register_movements BEGIN
 SELECT CASE WHEN NEW.sale_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.sale_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_id IS NOT NULL AND EXISTS(SELECT 1 FROM sales WHERE id=NEW.return_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER lot_document_types_insert BEFORE INSERT ON lot_movements BEGIN
 SELECT CASE WHEN NEW.sale_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.sale_item_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.return_item_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER lot_document_types_update BEFORE UPDATE ON lot_movements BEGIN
 SELECT CASE WHEN NEW.sale_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.sale_item_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.return_item_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER sale_event_identity_update BEFORE UPDATE OF sale_id,kind ON sale_events WHEN NEW.sale_id<>OLD.sale_id OR NEW.kind<>OLD.kind BEGIN SELECT RAISE(ABORT,'El origen del evento es inmutable'); END;
PRAGMA legacy_alter_table=OFF;
