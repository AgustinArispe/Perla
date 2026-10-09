CREATE TABLE printer_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  terminal_id TEXT REFERENCES terminals(id),
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('THERMAL_58','THERMAL_80','A4')),
  mode TEXT NOT NULL CHECK(mode IN ('MANUAL','AUTO')),
  header TEXT NOT NULL DEFAULT '',
  footer TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>0),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX printer_profiles_terminal ON printer_profiles(terminal_id,active);

CREATE TABLE sale_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  sale_number INTEGER NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('THERMAL_58','THERMAL_80','A4')),
  status TEXT NOT NULL CHECK(status IN ('PENDING','PRINTED')),
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  reprint_reason TEXT,
  requested_by TEXT REFERENCES users(id),
  requested_by_name TEXT,
  created_at_utc TEXT NOT NULL,
  printed_at_utc TEXT,
  CHECK((status='PENDING' AND printed_at_utc IS NULL) OR (status='PRINTED' AND printed_at_utc IS NOT NULL))
) STRICT;
CREATE INDEX sale_receipts_sale ON sale_receipts(sale_id,created_at_utc);
CREATE INDEX sale_receipts_status ON sale_receipts(status,created_at_utc);
