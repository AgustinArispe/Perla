import type Database from 'better-sqlite3';

const migrations = [
  {
    version: 1,
    sql: `CREATE TABLE app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    ) STRICT;`,
  },
];

export function migrate(database: Database.Database): void {
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  ) STRICT;`);
  database.transaction(() => {
    const current = database
      .prepare('SELECT MAX(version) AS version FROM schema_migrations')
      .get() as { version: number | null };
    const latest = migrations.at(-1)?.version ?? 0;
    if ((current.version ?? 0) > latest)
      throw new Error('La base fue creada por una versión más reciente.');
    for (const migration of migrations) {
      if (migration.version <= (current.version ?? 0)) continue;
      database.exec(migration.sql);
      database
        .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(migration.version, new Date().toISOString());
    }
  })();
}
