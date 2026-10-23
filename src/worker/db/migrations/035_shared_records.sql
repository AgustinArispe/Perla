-- Consolidate auxiliary records without erasing history or operation scopes.
PRAGMA legacy_alter_table=ON;

CREATE TABLE audit_events_v35 (
 id TEXT NOT NULL,event_type TEXT NOT NULL DEFAULT 'ACTION' CHECK(event_type IN ('ACTION','DETAIL','CASH_REVIEW','DUE_DATE')),
 operation TEXT NOT NULL,entity_type TEXT,entity_id TEXT,
 before_json TEXT CHECK(before_json IS NULL OR json_valid(before_json)),after_json TEXT CHECK(after_json IS NULL OR json_valid(after_json)),
 reason TEXT,note TEXT,revision INTEGER,
 shift_id TEXT REFERENCES register_shifts(id),sale_id TEXT REFERENCES sales(id),purchase_id TEXT REFERENCES purchases(id),
 obligation_kind TEXT CHECK(obligation_kind IN ('CUSTOMER','SUPPLIER')),previous_due_on TEXT,due_on TEXT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,actor_name TEXT NOT NULL,created_at_utc TEXT NOT NULL,
 PRIMARY KEY(event_type,id),
 CHECK(event_type<>'DETAIL' OR (entity_type IS NOT NULL AND entity_id IS NOT NULL AND before_json IS NOT NULL AND after_json IS NOT NULL AND reason IS NOT NULL)),
 CHECK(event_type<>'CASH_REVIEW' OR (shift_id IS NOT NULL AND revision IS NOT NULL AND note IS NOT NULL)),
 CHECK(event_type<>'DUE_DATE' OR (revision IS NOT NULL AND reason IS NOT NULL AND ((obligation_kind='CUSTOMER' AND sale_id IS NOT NULL AND purchase_id IS NULL) OR (obligation_kind='SUPPLIER' AND purchase_id IS NOT NULL AND sale_id IS NULL))))
) STRICT;
INSERT INTO audit_events_v35(id,operation,entity_id,actor_user_id,actor_name,created_at_utc) SELECT id,operation,entity_id,actor_user_id,actor_name,created_at_utc FROM audit_events;
INSERT INTO audit_events_v35(id,event_type,entity_type,entity_id,operation,before_json,after_json,reason,actor_user_id,actor_name,created_at_utc) SELECT id,'DETAIL',entity_type,entity_id,operation,before_json,after_json,reason,actor_user_id,actor_name,created_at_utc FROM control_audit_details;
INSERT INTO audit_events_v35(id,event_type,operation,shift_id,entity_id,revision,note,actor_user_id,actor_name,created_at_utc) SELECT id,'CASH_REVIEW','control.cashReview',shift_id,shift_id,revision,note,actor_user_id,actor_name,created_at_utc FROM control_cash_review_history;
INSERT INTO audit_events_v35(id,event_type,operation,obligation_kind,entity_id,sale_id,purchase_id,previous_due_on,due_on,revision,reason,actor_user_id,actor_name,created_at_utc) SELECT id,'DUE_DATE','control.agendaDate',kind,obligation_id,CASE WHEN kind='CUSTOMER' THEN obligation_id END,CASE WHEN kind='SUPPLIER' THEN obligation_id END,previous_due_on,due_on,revision,reason,actor_user_id,actor_name,created_at_utc FROM control_due_history;
DROP TABLE control_audit_details;
DROP TABLE control_cash_review_history;
DROP TABLE control_due_history;
DROP TABLE audit_events;
ALTER TABLE audit_events_v35 RENAME TO audit_events;
CREATE INDEX audit_events_date ON audit_events(event_type,created_at_utc,id);
CREATE INDEX audit_entity ON audit_events(event_type,entity_type,entity_id,created_at_utc);
CREATE INDEX audit_due_sale ON audit_events(obligation_kind,sale_id,revision) WHERE event_type='DUE_DATE';
CREATE INDEX audit_due_purchase ON audit_events(obligation_kind,purchase_id,revision) WHERE event_type='DUE_DATE';
CREATE TRIGGER audit_history_immutable_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'El evento es inmutable'); END;
CREATE TRIGGER audit_history_immutable_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT,'El evento es inmutable'); END;
CREATE VIEW audit_actions AS SELECT id,operation,entity_id,actor_user_id,actor_name,created_at_utc FROM audit_events WHERE event_type='ACTION';
CREATE VIEW control_audit_details AS SELECT id,entity_type,entity_id,operation,before_json,after_json,reason,actor_user_id,actor_name,created_at_utc FROM audit_events WHERE event_type='DETAIL';
CREATE VIEW control_cash_review_history AS SELECT id,shift_id,revision,note,actor_user_id,actor_name,created_at_utc FROM audit_events WHERE event_type='CASH_REVIEW';
CREATE VIEW control_due_history AS SELECT id,obligation_kind kind,COALESCE(sale_id,purchase_id) obligation_id,previous_due_on,due_on,revision,reason,actor_user_id,actor_name,created_at_utc FROM audit_events WHERE event_type='DUE_DATE';

CREATE TABLE drafts (
 document_type TEXT NOT NULL CHECK(document_type IN ('SALE','PURCHASE')),id TEXT NOT NULL,
 owner_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,terminal_id TEXT REFERENCES terminals(id) ON DELETE SET NULL,
 revision INTEGER NOT NULL CHECK(revision>0),body_json TEXT NOT NULL CHECK(json_valid(body_json)),updated_at_utc TEXT NOT NULL,
 PRIMARY KEY(document_type,id),UNIQUE(document_type,owner_user_id),CHECK(document_type='SALE' OR (owner_user_id IS NOT NULL AND owner_user_id=id))
) STRICT;
INSERT INTO drafts(document_type,id,owner_user_id,revision,body_json,updated_at_utc) SELECT 'SALE',id,owner_user_id,revision,body_json,updated_at_utc FROM checkout_drafts;
INSERT INTO drafts(document_type,id,owner_user_id,terminal_id,revision,body_json,updated_at_utc) SELECT 'PURCHASE',user_id,user_id,terminal_id,revision,body_json,updated_at_utc FROM purchase_drafts;
DROP TABLE checkout_drafts;
DROP TABLE purchase_drafts;
CREATE VIEW checkout_drafts AS SELECT id,owner_user_id,revision,body_json,updated_at_utc FROM drafts WHERE document_type='SALE';
CREATE VIEW purchase_drafts AS SELECT owner_user_id user_id,terminal_id,revision,body_json,updated_at_utc FROM drafts WHERE document_type='PURCHASE';
CREATE TABLE operation_results (
 scope TEXT NOT NULL CHECK(scope IN ('LOTS','CONTROL')),operation_key TEXT NOT NULL,payload_hash TEXT NOT NULL,
 kind TEXT CHECK(kind IN ('RECEIPT','ALLOCATION','RECONCILIATION','VOID')),result_json TEXT NOT NULL CHECK(json_valid(result_json)),created_at_utc TEXT NOT NULL,
 PRIMARY KEY(scope,operation_key),CHECK(scope<>'LOTS' OR kind IS NOT NULL)
) STRICT;
INSERT INTO operation_results(scope,operation_key,payload_hash,kind,result_json,created_at_utc) SELECT 'LOTS',operation_key,payload_hash,kind,result_json,created_at_utc FROM lot_operations;
INSERT INTO operation_results(scope,operation_key,payload_hash,result_json,created_at_utc) SELECT 'CONTROL',operation_key,payload_hash,result_json,created_at_utc FROM control_operation_results;

CREATE TABLE lot_movements_v35 (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  lot_id TEXT NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,
  delta_base INTEGER NOT NULL CHECK(delta_base!=0),
  balance_after_base INTEGER NOT NULL CHECK(balance_after_base BETWEEN 0 AND 1000000000),
  kind TEXT NOT NULL CHECK(kind IN ('RECEIPT','SALE','RETURN','VOID','WASTE','ADJUSTMENT')),
  reason TEXT NOT NULL,
  operation_key TEXT NOT NULL ,
  sale_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT,
  purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE RESTRICT,
  return_item_id TEXT REFERENCES sale_items(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
,operation_scope TEXT NOT NULL DEFAULT 'LOTS' CHECK(operation_scope='LOTS'),FOREIGN KEY(operation_scope,operation_key) REFERENCES operation_results(scope,operation_key) ON DELETE RESTRICT) STRICT;

INSERT INTO lot_movements_v35(sequence,id,lot_id,delta_base,balance_after_base,kind,reason,operation_key,sale_item_id,purchase_item_id,return_item_id,actor_user_id,actor_name,created_at_utc) SELECT sequence,id,lot_id,delta_base,balance_after_base,kind,reason,operation_key,sale_item_id,purchase_item_id,return_item_id,actor_user_id,actor_name,created_at_utc FROM lot_movements;

DROP TABLE lot_movements;

ALTER TABLE lot_movements_v35 RENAME TO lot_movements;

CREATE INDEX lot_movements_lot_sequence ON lot_movements(lot_id,sequence DESC);

CREATE INDEX lot_movements_sale_item ON lot_movements(sale_item_id,sequence);

DROP TABLE lot_operations;
DROP TABLE control_operation_results;
CREATE VIEW lot_operations AS SELECT operation_key,payload_hash,kind,result_json,created_at_utc FROM operation_results WHERE scope='LOTS';
CREATE VIEW control_operation_results AS SELECT operation_key,payload_hash,result_json,created_at_utc FROM operation_results WHERE scope='CONTROL';

CREATE TABLE price_change_batches_v35 (
  id TEXT PRIMARY KEY NOT NULL,
  operation_key TEXT UNIQUE,
  payload_hash TEXT,
  change_json TEXT CHECK(json_valid(change_json)),
  item_count INTEGER CHECK(item_count>0),
  actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT,
  created_at_utc TEXT
,record_type TEXT NOT NULL DEFAULT 'APPLIED' CHECK(record_type IN ('PREVIEW','APPLIED')),
 input_json TEXT CHECK(input_json IS NULL OR json_valid(input_json)),result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),expires_at_ms INTEGER,
 source_preview_id TEXT REFERENCES price_change_batches(id) ON DELETE SET NULL,
 CHECK((record_type='PREVIEW' AND input_json IS NOT NULL AND result_json IS NOT NULL AND expires_at_ms IS NOT NULL AND operation_key IS NULL)
 OR (record_type='APPLIED' AND operation_key IS NOT NULL AND payload_hash IS NOT NULL AND change_json IS NOT NULL AND item_count IS NOT NULL AND actor_user_id IS NOT NULL AND actor_name IS NOT NULL AND created_at_utc IS NOT NULL))
) STRICT;

INSERT INTO price_change_batches_v35(id,operation_key,payload_hash,change_json,item_count,actor_user_id,actor_name,created_at_utc) SELECT id,operation_key,payload_hash,change_json,item_count,actor_user_id,actor_name,created_at_utc FROM price_change_batches;

INSERT INTO price_change_batches_v35(id,record_type,input_json,result_json,expires_at_ms) SELECT id,'PREVIEW',input_json,result_json,expires_at_ms FROM price_change_previews;

DROP TABLE price_change_batches;

ALTER TABLE price_change_batches_v35 RENAME TO price_change_batches;

DROP TABLE price_change_previews;

CREATE INDEX price_preview_expiry ON price_change_batches(expires_at_ms) WHERE record_type='PREVIEW';
CREATE INDEX price_preview_source ON price_change_batches(source_preview_id) WHERE source_preview_id IS NOT NULL;
CREATE VIEW price_change_previews AS SELECT id,input_json,result_json,expires_at_ms FROM price_change_batches WHERE record_type='PREVIEW';
CREATE VIEW price_change_applications AS SELECT id,operation_key,payload_hash,change_json,item_count,actor_user_id,actor_name,created_at_utc FROM price_change_batches WHERE record_type='APPLIED';

-- Recreate document guards after the party migration rebuilt sales.
CREATE TRIGGER sales_return_origin_insert BEFORE INSERT ON sales WHEN NEW.document_type='RETURN' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sales s WHERE s.id=NEW.original_sale_id AND s.document_type='SALE') THEN RAISE(ABORT,'La devolución requiere una venta original') END;
END;
CREATE TRIGGER sales_document_identity_update BEFORE UPDATE OF document_type,original_sale_id ON sales
WHEN NEW.document_type<>OLD.document_type OR NEW.original_sale_id IS NOT OLD.original_sale_id BEGIN
 SELECT RAISE(ABORT,'El tipo y origen del documento son inmutables');
END;
CREATE TRIGGER sale_customer_role_insert BEFORE INSERT ON sales BEGIN
 SELECT CASE WHEN (NEW.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.customer_id AND is_customer=1)) OR (NEW.debt_party_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.debt_party_id AND is_customer=1)) THEN RAISE(ABORT,'La venta requiere un cliente') END;
END;
CREATE TRIGGER sale_customer_role_update BEFORE UPDATE OF customer_id,debt_party_id ON sales BEGIN
 SELECT CASE WHEN (NEW.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.customer_id AND is_customer=1)) OR (NEW.debt_party_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.debt_party_id AND is_customer=1)) THEN RAISE(ABORT,'La venta requiere un cliente') END;
END;
CREATE TRIGGER purchase_supplier_role_insert BEFORE INSERT ON purchases BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.supplier_id AND is_supplier=1) OR (NEW.debt_party_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.debt_party_id AND is_supplier=1)) THEN RAISE(ABORT,'La compra requiere un proveedor') END;
END;
CREATE TRIGGER purchase_supplier_role_update BEFORE UPDATE OF supplier_id,debt_party_id ON purchases BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.supplier_id AND is_supplier=1) OR (NEW.debt_party_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM parties WHERE id=NEW.debt_party_id AND is_supplier=1)) THEN RAISE(ABORT,'La compra requiere un proveedor') END;
END;
CREATE TRIGGER party_roles_immutable BEFORE UPDATE OF is_customer,is_supplier ON parties
WHEN NEW.is_customer<OLD.is_customer OR NEW.is_supplier<OLD.is_supplier BEGIN
 SELECT RAISE(ABORT,'No se puede retirar un rol histórico de la contraparte');
END;
CREATE TRIGGER lot_document_types_insert BEFORE INSERT ON lot_movements BEGIN
 SELECT CASE WHEN NEW.sale_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.sale_item_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.return_item_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER lot_document_types_update BEFORE UPDATE ON lot_movements BEGIN
 SELECT CASE WHEN NEW.sale_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.sale_item_id AND document_type<>'SALE') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
 SELECT CASE WHEN NEW.return_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM sale_items WHERE id=NEW.return_item_id AND document_type<>'RETURN') THEN RAISE(ABORT,'La referencia no corresponde al tipo de entidad') END;
END;
CREATE TRIGGER price_preview_source_insert BEFORE INSERT ON price_change_batches BEGIN
 SELECT CASE WHEN NEW.source_preview_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM price_change_batches WHERE id=NEW.source_preview_id AND record_type='PREVIEW') THEN RAISE(ABORT,'El origen debe ser una vista previa') END;
END;
CREATE TRIGGER price_preview_source_update BEFORE UPDATE ON price_change_batches BEGIN
 SELECT CASE WHEN NEW.source_preview_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM price_change_batches WHERE id=NEW.source_preview_id AND record_type='PREVIEW') THEN RAISE(ABORT,'El origen debe ser una vista previa') END;
END;
CREATE TRIGGER price_record_type_immutable BEFORE UPDATE OF record_type ON price_change_batches WHEN NEW.record_type<>OLD.record_type BEGIN SELECT RAISE(ABORT,'El tipo de registro de precios es inmutable'); END;
CREATE TRIGGER price_item_application_insert BEFORE INSERT ON price_change_items BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM price_change_batches WHERE id=NEW.batch_id AND record_type<>'APPLIED') THEN RAISE(ABORT,'El detalle requiere un cambio aplicado') END;
END;
CREATE TRIGGER price_item_application_update BEFORE UPDATE ON price_change_items BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM price_change_batches WHERE id=NEW.batch_id AND record_type<>'APPLIED') THEN RAISE(ABORT,'El detalle requiere un cambio aplicado') END;
END;

CREATE TRIGGER returned_original_line_identity BEFORE UPDATE OF document_type,sale_id,product_id,quantity_base ON sale_items
WHEN EXISTS(SELECT 1 FROM sale_items WHERE original_sale_item_id=OLD.id)
 AND (NEW.document_type<>OLD.document_type OR NEW.sale_id<>OLD.sale_id OR NEW.product_id<>OLD.product_id OR NEW.quantity_base<>OLD.quantity_base) BEGIN
 SELECT RAISE(ABORT,'La línea original de una devolución es inmutable');
END;
CREATE TRIGGER sale_debt_owner_immutable BEFORE UPDATE OF debt_party_id ON sales
WHEN OLD.debt_status IS NOT NULL AND NEW.debt_party_id IS NOT OLD.debt_party_id BEGIN
 SELECT RAISE(ABORT,'El titular histórico de la deuda es inmutable');
END;
CREATE TRIGGER purchase_debt_owner_immutable BEFORE UPDATE OF debt_party_id ON purchases
WHEN OLD.debt_status IS NOT NULL AND NEW.debt_party_id IS NOT OLD.debt_party_id BEGIN
 SELECT RAISE(ABORT,'El titular histórico de la deuda es inmutable');
END;
CREATE TRIGGER account_credit_identity_immutable BEFORE UPDATE OF party_id,sale_id,purchase_id ON account_credits
WHEN NEW.party_id<>OLD.party_id OR NEW.sale_id IS NOT OLD.sale_id OR NEW.purchase_id IS NOT OLD.purchase_id BEGIN
 SELECT RAISE(ABORT,'El origen y titular del crédito son inmutables');
END;
CREATE TRIGGER replenishment_supplier_insert BEFORE INSERT ON replenishment_orders BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM parties WHERE id=NEW.supplier_id AND is_supplier<>1) THEN RAISE(ABORT,'El pedido requiere un proveedor') END;
END;
CREATE TRIGGER replenishment_supplier_update BEFORE UPDATE OF supplier_id ON replenishment_orders BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM parties WHERE id=NEW.supplier_id AND is_supplier<>1) THEN RAISE(ABORT,'El pedido requiere un proveedor') END;
END;
PRAGMA legacy_alter_table=OFF;
