CREATE TABLE product_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  search_name TEXT NOT NULL,
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>=1),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;

CREATE TABLE product_brands (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  search_name TEXT NOT NULL,
  active INTEGER NOT NULL CHECK(active IN (0,1)),
  revision INTEGER NOT NULL CHECK(revision>=1),
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
) STRICT;

ALTER TABLE products ADD COLUMN category_id TEXT;
ALTER TABLE products ADD COLUMN brand_id TEXT;

INSERT INTO product_categories (id,name,search_name,active,revision,created_at_utc,updated_at_utc)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
       trim(category), lower(trim(category)), 1, 1, datetime('now'), datetime('now')
FROM products
WHERE category IS NOT NULL AND trim(category) <> ''
GROUP BY lower(trim(category));

UPDATE products
SET category_id=(SELECT id FROM product_categories c WHERE c.search_name=lower(trim(products.category)))
WHERE category IS NOT NULL AND trim(category) <> '';

CREATE INDEX products_category_search_idx ON products(category_id,search_name,id);
CREATE INDEX products_brand_search_idx ON products(brand_id,search_name,id);
