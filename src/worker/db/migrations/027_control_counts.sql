CREATE TABLE control_count_sessions (
 id TEXT PRIMARY KEY NOT NULL, location_id TEXT NOT NULL REFERENCES locations(id), category_id TEXT,
 revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL CHECK(status IN ('DRAFT','APPLIED')),
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL, updated_at_utc TEXT NOT NULL
) STRICT;
CREATE TABLE control_count_lines (
 session_id TEXT NOT NULL REFERENCES control_count_sessions(id), product_id TEXT NOT NULL REFERENCES products(id),
 counted_base INTEGER CHECK(counted_base IS NULL OR counted_base BETWEEN 0 AND 1000000000), observed_base INTEGER,
 stock_revision INTEGER, product_revision INTEGER, counted_at_utc TEXT, applied_at_utc TEXT,
 lot_counts_json TEXT CHECK(lot_counts_json IS NULL OR json_valid(lot_counts_json)),
 PRIMARY KEY(session_id,product_id)
) STRICT;
CREATE INDEX control_counts_location_date ON control_count_sessions(location_id,updated_at_utc DESC);
CREATE TABLE control_operation_results (
 operation_key TEXT PRIMARY KEY NOT NULL, payload_hash TEXT NOT NULL, result_json TEXT NOT NULL CHECK(json_valid(result_json)), created_at_utc TEXT NOT NULL
) STRICT;
CREATE TABLE control_cash_reviews (
 shift_id TEXT PRIMARY KEY NOT NULL REFERENCES register_shifts(id), revision INTEGER NOT NULL, note TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, reviewed_at_utc TEXT NOT NULL
) STRICT;
CREATE TABLE control_cash_review_history (
 id TEXT PRIMARY KEY NOT NULL, shift_id TEXT NOT NULL REFERENCES register_shifts(id), revision INTEGER NOT NULL, note TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
