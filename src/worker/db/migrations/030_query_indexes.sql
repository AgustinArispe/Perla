-- Product-level history lookups must not scan the whole price-event log for
-- every catalog row (the home page also runs the price review).
CREATE INDEX commercial_events_product_version ON commercial_price_events(product_id,id DESC);
CREATE INDEX commercial_events_product_time ON commercial_price_events(product_id,created_at_utc DESC);

-- Reports and the last-sale indicator filter by status and movement date.
CREATE INDEX sales_status_business_date ON sales(status,business_date);
CREATE INDEX returns_status_business_date ON sale_returns(status,business_date);
