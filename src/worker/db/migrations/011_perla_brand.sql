-- Preserve custom business names and historical receipt snapshots.
UPDATE business_settings
SET business_name='El Perla', revision=revision+1,
    updated_at_utc=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE business_name IN ('El Bocha', 'El Bocha · Demo');
