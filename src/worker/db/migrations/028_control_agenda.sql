ALTER TABLE customer_receivables ADD COLUMN due_on TEXT;
ALTER TABLE customer_receivables ADD COLUMN due_revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE supplier_payables ADD COLUMN due_on TEXT;
ALTER TABLE supplier_payables ADD COLUMN due_revision INTEGER NOT NULL DEFAULT 1;
CREATE INDEX control_customer_due ON customer_receivables(status,due_on,sale_id);
CREATE INDEX control_supplier_due ON supplier_payables(status,due_on,purchase_id);
CREATE TABLE control_due_history (
 id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('CUSTOMER','SUPPLIER')), obligation_id TEXT NOT NULL,
 previous_due_on TEXT, due_on TEXT, revision INTEGER NOT NULL, reason TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX control_due_obligation ON control_due_history(kind,obligation_id,revision);
