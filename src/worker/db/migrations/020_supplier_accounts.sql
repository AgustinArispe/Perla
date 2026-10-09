CREATE TABLE supplier_payables (
  purchase_id TEXT PRIMARY KEY NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  original_cents INTEGER NOT NULL CHECK(original_cents BETWEEN 1 AND 9999999999),
  balance_cents INTEGER NOT NULL CHECK(balance_cents BETWEEN 0 AND original_cents),
  status TEXT NOT NULL CHECK(status IN ('OPEN','PAID','VOIDED')),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX supplier_payables_supplier_status_date
  ON supplier_payables(supplier_id,status,created_at_utc,purchase_id);

CREATE TABLE supplier_payments (
  id TEXT PRIMARY KEY NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  note TEXT CHECK(note IS NULL OR length(note) BETWEEN 1 AND 240),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
  register_movement_id TEXT,
  created_at_utc TEXT NOT NULL,
  CHECK((method='CASH' AND shift_id IS NOT NULL) OR (method<>'CASH' AND shift_id IS NULL))
) STRICT;
CREATE INDEX supplier_payments_supplier_date
  ON supplier_payments(supplier_id,business_date DESC,created_at_utc DESC,id);

CREATE TABLE supplier_payment_allocations (
  payment_id TEXT NOT NULL REFERENCES supplier_payments(id) ON DELETE RESTRICT,
  purchase_id TEXT NOT NULL REFERENCES supplier_payables(purchase_id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  PRIMARY KEY(payment_id,purchase_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX supplier_allocations_purchase ON supplier_payment_allocations(purchase_id,payment_id);

CREATE TABLE supplier_credits (
  id TEXT PRIMARY KEY NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_id TEXT NOT NULL UNIQUE REFERENCES purchases(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 240),
  created_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX supplier_credits_supplier_date ON supplier_credits(supplier_id,created_at_utc DESC,id);

ALTER TABLE register_movements
  ADD COLUMN supplier_payment_id TEXT REFERENCES supplier_payments(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX register_supplier_payment ON register_movements(supplier_payment_id)
  WHERE supplier_payment_id IS NOT NULL;

INSERT INTO business_features(feature_key,enabled,updated_at_utc)
VALUES ('SUPPLIER_ACCOUNTS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));

