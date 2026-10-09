CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 140),
  search_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  credit_enabled INTEGER NOT NULL DEFAULT 0 CHECK(credit_enabled IN (0,1)),
  credit_limit_cents INTEGER NOT NULL DEFAULT 0 CHECK(credit_limit_cents BETWEEN 0 AND 9999999999),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX customers_search ON customers(active,search_name,id);

ALTER TABLE sales ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE RESTRICT;
ALTER TABLE sales ADD COLUMN customer_name TEXT;
ALTER TABLE sales ADD COLUMN on_account_cents INTEGER NOT NULL DEFAULT 0 CHECK(on_account_cents BETWEEN 0 AND total_cents);
CREATE INDEX sales_customer_date ON sales(customer_id,created_at_utc DESC) WHERE customer_id IS NOT NULL;

CREATE TABLE customer_receivables (
  sale_id TEXT PRIMARY KEY NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  original_cents INTEGER NOT NULL CHECK(original_cents BETWEEN 1 AND 9999999999),
  balance_cents INTEGER NOT NULL CHECK(balance_cents BETWEEN 0 AND original_cents),
  status TEXT NOT NULL CHECK(status IN ('OPEN','PAID','VOIDED')),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX customer_receivables_customer_status_date ON customer_receivables(customer_id,status,created_at_utc,sale_id);

CREATE TABLE customer_collections (
  id TEXT PRIMARY KEY NOT NULL,
  operation_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  business_date TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('CASH','DEBIT','CREDIT','TRANSFER','OTHER')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  note TEXT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  shift_id TEXT REFERENCES register_shifts(id) ON DELETE RESTRICT,
  register_movement_id TEXT,
  created_at_utc TEXT NOT NULL,
  CHECK((method='CASH' AND shift_id IS NOT NULL) OR (method<>'CASH' AND shift_id IS NULL))
) STRICT;
CREATE INDEX customer_collections_customer_date ON customer_collections(customer_id,business_date DESC,created_at_utc DESC,id);

CREATE TABLE customer_collection_allocations (
  collection_id TEXT NOT NULL REFERENCES customer_collections(id) ON DELETE RESTRICT,
  sale_id TEXT NOT NULL REFERENCES customer_receivables(sale_id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  PRIMARY KEY(collection_id,sale_id)
) STRICT, WITHOUT ROWID;

CREATE TABLE customer_credits (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_id TEXT NOT NULL UNIQUE REFERENCES sales(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999),
  reason TEXT NOT NULL,
  created_at_utc TEXT NOT NULL
) STRICT;

ALTER TABLE register_movements ADD COLUMN customer_collection_id TEXT REFERENCES customer_collections(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX register_customer_collection ON register_movements(customer_collection_id) WHERE customer_collection_id IS NOT NULL;

INSERT INTO business_features(feature_key,enabled,updated_at_utc) VALUES
 ('CUSTOMERS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('CUSTOMER_CREDIT',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
