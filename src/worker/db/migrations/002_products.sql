ALTER TABLE app_settings RENAME COLUMN value TO value_json;
ALTER TABLE app_settings ADD COLUMN updated_at_utc TEXT NOT NULL DEFAULT '';
UPDATE app_settings SET updated_at_utc = strftime('%Y-%m-%dT%H:%M:%fZ','now');

CREATE TABLE products (
  id TEXT PRIMARY KEY NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  search_name TEXT NOT NULL,
  category TEXT,
  sale_unit TEXT NOT NULL CHECK(sale_unit IN ('UNIT','KG')),
  price_cents INTEGER NOT NULL CHECK(price_cents BETWEEN 1 AND 9999999999),
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  track_stock INTEGER NOT NULL CHECK(track_stock IN (0,1)),
  stock_initialized INTEGER NOT NULL DEFAULT 0 CHECK(stock_initialized IN (0,1)),
  min_stock_base INTEGER NOT NULL CHECK(min_stock_base BETWEEN 0 AND 1000000000),
  revision INTEGER NOT NULL CHECK(revision >= 1),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX products_search ON products(search_name,id);
CREATE INDEX products_active_search ON products(active,search_name,id);

CREATE TABLE checkout_drafts (
  id TEXT PRIMARY KEY NOT NULL CHECK(id='main'),
  revision INTEGER NOT NULL CHECK(revision>=1),
  body_json TEXT NOT NULL CHECK(json_valid(body_json)),
  updated_at_utc TEXT NOT NULL
) STRICT;

CREATE TABLE import_batches (
  id TEXT PRIMARY KEY NOT NULL,
  source_name TEXT NOT NULL,
  source_hash TEXT UNIQUE NOT NULL,
  preview_token TEXT UNIQUE NOT NULL,
  operation_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK(status='APPLIED'),
  rows_applied INTEGER NOT NULL CHECK(rows_applied>0),
  created_at_utc TEXT NOT NULL
) STRICT;
