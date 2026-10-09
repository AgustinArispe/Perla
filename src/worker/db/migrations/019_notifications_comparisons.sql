CREATE TABLE notification_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  read_at_utc TEXT NOT NULL,
  PRIMARY KEY(user_id,notification_key)
) STRICT;

INSERT INTO business_features(feature_key,enabled,updated_at_utc)
VALUES ('NOTIFICATIONS',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));

