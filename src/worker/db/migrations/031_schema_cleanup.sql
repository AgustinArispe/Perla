-- A user's initial page is a single optional attribute, with the same lifecycle
-- as the user. Preserve unset preferences as NULL.
ALTER TABLE users ADD COLUMN start_module TEXT;
UPDATE users SET start_module=(
  SELECT start_module FROM workspace_preferences WHERE user_id=users.id
);
DROP TABLE workspace_preferences;

-- No application path reads or writes printer_profiles. Preserve any historical
-- profiles as namespaced legacy settings before retiring the unused table.
-- A key collision aborts the migration rather than overwriting existing data.
INSERT INTO app_settings(key,value_json,updated_at_utc)
SELECT 'legacy.printer_profiles.' || id,
  json_object('id',id,'terminal_id',terminal_id,'name',name,'format',format,
    'mode',mode,'header',header,'footer',footer,'active',active,'revision',revision,
    'created_at_utc',created_at_utc,'updated_at_utc',updated_at_utc),
  updated_at_utc
FROM printer_profiles;
DROP TABLE printer_profiles;
