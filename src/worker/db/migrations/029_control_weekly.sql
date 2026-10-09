CREATE TABLE weekly_snapshots (
 id TEXT PRIMARY KEY, week_start TEXT NOT NULL, version INTEGER NOT NULL,
 operation_key TEXT UNIQUE, generated_at_utc TEXT NOT NULL, body_json TEXT NOT NULL CHECK(json_valid(body_json)),
 UNIQUE(week_start,version)
) STRICT;
CREATE TRIGGER weekly_snapshot_immutable_update BEFORE UPDATE ON weekly_snapshots BEGIN SELECT RAISE(ABORT,'El resumen es inmutable'); END;
CREATE TRIGGER weekly_snapshot_immutable_delete BEFORE DELETE ON weekly_snapshots BEGIN SELECT RAISE(ABORT,'El resumen es inmutable'); END;
CREATE TABLE control_audit_details (
 id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL,
 before_json TEXT NOT NULL CHECK(json_valid(before_json)), after_json TEXT NOT NULL CHECK(json_valid(after_json)),
 reason TEXT NOT NULL, actor_user_id TEXT NOT NULL REFERENCES users(id), actor_name TEXT NOT NULL, created_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX control_audit_entity ON control_audit_details(entity_type,entity_id,created_at_utc);
CREATE TRIGGER control_audit_immutable_update BEFORE UPDATE ON control_audit_details BEGIN SELECT RAISE(ABORT,'El evento es inmutable'); END;
CREATE TRIGGER control_audit_immutable_delete BEFORE DELETE ON control_audit_details BEGIN SELECT RAISE(ABORT,'El evento es inmutable'); END;
