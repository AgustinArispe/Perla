CREATE TABLE users (
 id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('SELLER','SUPERVISOR','OWNER')), active INTEGER NOT NULL CHECK(active IN (0,1)),
 password_hash TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 created_at_utc TEXT NOT NULL,updated_at_utc TEXT NOT NULL
) STRICT;
CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,user_revision INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL) STRICT;
CREATE INDEX auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE auth_attempts (username TEXT PRIMARY KEY NOT NULL,failures INTEGER NOT NULL,blocked_until_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL) STRICT;
CREATE TABLE audit_events (id TEXT PRIMARY KEY NOT NULL,operation TEXT NOT NULL,entity_id TEXT,actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,actor_name TEXT NOT NULL,created_at_utc TEXT NOT NULL) STRICT;
CREATE INDEX audit_events_date ON audit_events(created_at_utc);
ALTER TABLE sales ADD COLUMN actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE sales ADD COLUMN actor_name TEXT;
ALTER TABLE sale_events ADD COLUMN actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE sale_events ADD COLUMN actor_name TEXT;
ALTER TABLE stock_movements ADD COLUMN actor_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE stock_movements ADD COLUMN actor_name TEXT;
ALTER TABLE checkout_drafts RENAME TO checkout_drafts_legacy;
CREATE TABLE checkout_drafts (id TEXT PRIMARY KEY NOT NULL,owner_user_id TEXT UNIQUE REFERENCES users(id) ON DELETE RESTRICT,revision INTEGER NOT NULL CHECK(revision>=1),body_json TEXT NOT NULL CHECK(json_valid(body_json)),updated_at_utc TEXT NOT NULL) STRICT;
INSERT INTO checkout_drafts(id,revision,body_json,updated_at_utc) SELECT id,revision,body_json,updated_at_utc FROM checkout_drafts_legacy;
DROP TABLE checkout_drafts_legacy;
