ALTER TABLE business_settings ADD COLUMN features_revision INTEGER NOT NULL DEFAULT 1 CHECK(features_revision>0);

CREATE TABLE business_features (
  feature_key TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  updated_at_utc TEXT NOT NULL
) STRICT;

INSERT INTO business_features (feature_key,enabled,updated_at_utc) VALUES
  ('STOCK_CONTROL',1,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('MONTHLY_DASHBOARD',1,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('RECEIPTS',1,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('PRODUCT_LABELS',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
