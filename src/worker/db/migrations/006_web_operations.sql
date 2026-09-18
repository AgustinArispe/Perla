CREATE TABLE terminals (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL CHECK(active IN (0,1)),
 revision INTEGER NOT NULL CHECK(revision>0), created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL
) STRICT;
ALTER TABLE auth_sessions ADD COLUMN last_seen_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auth_sessions ADD COLUMN terminal_id TEXT REFERENCES terminals(id);
DELETE FROM auth_sessions;
CREATE TABLE register_shifts (
 id TEXT PRIMARY KEY NOT NULL, terminal_id TEXT NOT NULL REFERENCES terminals(id),
 status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED')),
 opening_cash_cents INTEGER NOT NULL CHECK(opening_cash_cents BETWEEN 0 AND 9999999999),
 opened_by TEXT NOT NULL REFERENCES users(id), opened_at_utc TEXT NOT NULL,
 closed_by TEXT REFERENCES users(id), closed_at_utc TEXT,
 counted_cash_cents INTEGER, expected_cash_cents INTEGER, difference_cents INTEGER,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 open_key TEXT NOT NULL UNIQUE, open_hash TEXT NOT NULL,
 close_key TEXT UNIQUE, close_hash TEXT,
 CHECK((status='OPEN' AND closed_at_utc IS NULL) OR (status='CLOSED' AND closed_at_utc IS NOT NULL))
) STRICT;
CREATE UNIQUE INDEX one_open_shift_per_terminal ON register_shifts(terminal_id) WHERE status='OPEN';
CREATE INDEX shifts_date ON register_shifts(opened_at_utc,id);
CREATE TABLE register_movements (
 id TEXT PRIMARY KEY NOT NULL, shift_id TEXT NOT NULL REFERENCES register_shifts(id),
 kind TEXT NOT NULL CHECK(kind IN ('IN','OUT','REFUND')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999), reason TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), created_at_utc TEXT NOT NULL,
 operation_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 sale_id TEXT REFERENCES sales(id)
) STRICT;
CREATE UNIQUE INDEX one_cash_refund_per_sale ON register_movements(sale_id) WHERE kind='REFUND';
CREATE INDEX register_movements_shift ON register_movements(shift_id);
ALTER TABLE sales ADD COLUMN terminal_id TEXT REFERENCES terminals(id);
ALTER TABLE sales ADD COLUMN register_shift_id TEXT REFERENCES register_shifts(id);
CREATE INDEX sales_shift ON sales(register_shift_id,status);
CREATE TABLE business_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), business_name TEXT NOT NULL, currency TEXT NOT NULL CHECK(currency='ARS'),
 payment_methods_json TEXT NOT NULL CHECK(json_valid(payment_methods_json)), revision INTEGER NOT NULL CHECK(revision>0),
 updated_at_utc TEXT NOT NULL
) STRICT;
INSERT INTO business_settings VALUES(1,'El Bocha','ARS','["CASH","DEBIT","CREDIT","TRANSFER","OTHER"]',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE INDEX audit_date_id ON audit_events(created_at_utc,id);
