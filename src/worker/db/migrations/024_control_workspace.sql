CREATE TABLE saved_views (
 id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 module TEXT NOT NULL,name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
 filters_json TEXT NOT NULL CHECK(json_valid(filters_json)),dates TEXT NOT NULL CHECK(dates IN ('FIXED','WEEK','MONTH')),
 filter_schema_version INTEGER NOT NULL DEFAULT 1,revision INTEGER NOT NULL CHECK(revision>0),
 created_at_utc TEXT NOT NULL,updated_at_utc TEXT NOT NULL
) STRICT;
CREATE INDEX saved_views_user ON saved_views(user_id,module,name,id);

CREATE TABLE workspace_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,start_module TEXT NOT NULL) STRICT;
