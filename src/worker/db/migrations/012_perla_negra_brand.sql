-- Update only known default names. Preserve custom names and historical receipt snapshots.
UPDATE business_settings
SET business_name='Perla Negra', revision=revision+1,
    updated_at_utc=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE business_name IN ('El Perla', 'El Bocha', 'El Bocha · Demo');
