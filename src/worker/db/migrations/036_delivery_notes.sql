INSERT INTO business_features(feature_key,enabled,updated_at_utc) VALUES
 ('DELIVERY_NOTES_SALES',0,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('DELIVERY_NOTES_PURCHASES',0,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('DELIVERY_NOTES_INTERNAL',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));

CREATE TABLE delivery_notes (
 id TEXT PRIMARY KEY NOT NULL,
 number INTEGER NOT NULL UNIQUE CHECK(number>0),
 kind TEXT NOT NULL CHECK(kind IN ('SALE','PURCHASE','TRANSFER')),
 sale_id TEXT REFERENCES sales(id) ON DELETE RESTRICT,
 purchase_id TEXT REFERENCES purchases(id) ON DELETE RESTRICT,
 transfer_id TEXT REFERENCES stock_transfers(id) ON DELETE RESTRICT,
 supersedes_id TEXT UNIQUE REFERENCES delivery_notes(id) ON DELETE RESTRICT,
 operation_key TEXT NOT NULL UNIQUE,
 payload_hash TEXT NOT NULL,
 snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 status TEXT NOT NULL CHECK(status IN ('ISSUED','DELIVERED','CANCELLED')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at_utc TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 actor_name TEXT NOT NULL,
 delivered_at_utc TEXT,
 delivered_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
 delivered_by_name TEXT,
 delivery_reason TEXT,
 delivery_key TEXT UNIQUE,
 delivery_hash TEXT,
 cancelled_at_utc TEXT,
 cancelled_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
 cancelled_by_name TEXT,
 cancel_reason TEXT,
 cancel_key TEXT UNIQUE,
 cancel_hash TEXT,
 CHECK((kind='SALE' AND sale_id IS NOT NULL AND purchase_id IS NULL AND transfer_id IS NULL)
 OR (kind='PURCHASE' AND purchase_id IS NOT NULL AND sale_id IS NULL AND transfer_id IS NULL)
 OR (kind='TRANSFER' AND transfer_id IS NOT NULL AND sale_id IS NULL AND purchase_id IS NULL)),
 CHECK((status='ISSUED' AND delivered_at_utc IS NULL AND cancelled_at_utc IS NULL)
 OR (status='DELIVERED' AND delivered_at_utc IS NOT NULL AND delivered_by IS NOT NULL AND cancelled_at_utc IS NULL)
 OR (status='CANCELLED' AND cancelled_at_utc IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL))
) STRICT;
CREATE INDEX delivery_notes_kind_number ON delivery_notes(kind,number DESC);
CREATE INDEX delivery_notes_status_number ON delivery_notes(status,number DESC);
CREATE UNIQUE INDEX delivery_notes_sale_active ON delivery_notes(sale_id) WHERE status<>'CANCELLED';
CREATE UNIQUE INDEX delivery_notes_purchase_active ON delivery_notes(purchase_id) WHERE status<>'CANCELLED';
CREATE UNIQUE INDEX delivery_notes_transfer_active ON delivery_notes(transfer_id) WHERE status<>'CANCELLED';
CREATE TRIGGER delivery_notes_source BEFORE INSERT ON delivery_notes BEGIN
 SELECT CASE WHEN NEW.kind='SALE' AND NOT EXISTS(SELECT 1 FROM sales WHERE id=NEW.sale_id AND document_type='SALE' AND status='COMPLETED') THEN RAISE(ABORT,'La venta no está vigente') END;
 SELECT CASE WHEN NEW.kind='PURCHASE' AND NOT EXISTS(SELECT 1 FROM purchases WHERE id=NEW.purchase_id AND status='RECEIVED') THEN RAISE(ABORT,'La compra no está vigente') END;
 SELECT CASE WHEN NEW.kind='TRANSFER' AND NOT EXISTS(SELECT 1 FROM stock_transfers WHERE id=NEW.transfer_id AND status IN ('IN_TRANSIT','RECEIVED')) THEN RAISE(ABORT,'El traslado no está vigente') END;
 SELECT CASE WHEN NEW.supersedes_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM delivery_notes n WHERE n.id=NEW.supersedes_id AND n.status='CANCELLED' AND n.kind=NEW.kind AND n.sale_id IS NEW.sale_id AND n.purchase_id IS NEW.purchase_id AND n.transfer_id IS NEW.transfer_id) THEN RAISE(ABORT,'El remito reemplazado no corresponde al mismo origen') END;
END;
CREATE TRIGGER delivery_notes_immutable BEFORE UPDATE ON delivery_notes
WHEN NEW.id IS NOT OLD.id OR NEW.number IS NOT OLD.number OR NEW.kind IS NOT OLD.kind
 OR NEW.sale_id IS NOT OLD.sale_id OR NEW.purchase_id IS NOT OLD.purchase_id OR NEW.transfer_id IS NOT OLD.transfer_id
 OR NEW.supersedes_id IS NOT OLD.supersedes_id
 OR NEW.snapshot_json IS NOT OLD.snapshot_json OR NEW.operation_key IS NOT OLD.operation_key OR NEW.payload_hash IS NOT OLD.payload_hash
 OR NEW.actor_user_id IS NOT OLD.actor_user_id OR NEW.actor_name IS NOT OLD.actor_name OR NEW.created_at_utc IS NOT OLD.created_at_utc
BEGIN SELECT RAISE(ABORT,'El contenido emitido del remito es inmutable'); END;
CREATE TRIGGER delivery_notes_no_delete BEFORE DELETE ON delivery_notes
BEGIN SELECT RAISE(ABORT,'Los remitos se anulan; no se eliminan'); END;
CREATE TRIGGER delivery_notes_transition BEFORE UPDATE ON delivery_notes BEGIN
 SELECT CASE WHEN OLD.status='CANCELLED' OR NEW.revision<>OLD.revision+1
  OR NOT ((OLD.status='ISSUED' AND NEW.status IN ('DELIVERED','CANCELLED')) OR (OLD.status='DELIVERED' AND NEW.status='CANCELLED'))
  THEN RAISE(ABORT,'Transición de remito inválida') END;
 SELECT CASE WHEN OLD.status='DELIVERED' AND (NEW.delivered_at_utc IS NOT OLD.delivered_at_utc
  OR NEW.delivered_by IS NOT OLD.delivered_by OR NEW.delivered_by_name IS NOT OLD.delivered_by_name
  OR NEW.delivery_reason IS NOT OLD.delivery_reason OR NEW.delivery_key IS NOT OLD.delivery_key OR NEW.delivery_hash IS NOT OLD.delivery_hash)
  THEN RAISE(ABORT,'La constancia de entrega es inmutable') END;
END;
