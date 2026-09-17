import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import productsSql from './migrations/002_products.sql?raw';
import inventorySql from './migrations/003_inventory.sql?raw';
import { DomainError } from '../../shared/errors';

export interface Migration {
  version: number;
  sql: string;
}
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    ) STRICT;`,
  },
  { version: 2, sql: productsSql },
  { version: 3, sql: inventorySql },
];
export const SCHEMA_VERSION = MIGRATIONS.at(-1)!.version;
const checksum = (sql: string) => createHash('sha256').update(sql).digest('hex');

export function migrate(database: Database.Database, migrations: Migration[] = MIGRATIONS): void {
  database
    .transaction(() => {
      database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL,
    checksum TEXT
  ) STRICT;`);
      const columns = database.pragma('table_info(schema_migrations)') as { name: string }[];
      if (!columns.some((column) => column.name === 'checksum'))
        database.exec('ALTER TABLE schema_migrations ADD COLUMN checksum TEXT');
      const current = database
        .prepare('SELECT MAX(version) AS version FROM schema_migrations')
        .get() as { version: number | null };
      const latest = migrations.at(-1)?.version ?? 0;
      if ((current.version ?? 0) > latest)
        throw new DomainError(
          'SCHEMA_TOO_NEW',
          'Esta base requiere una versión más reciente de El Bocha. No se modificaron los datos.',
        );
      const applied = database
        .prepare('SELECT version, checksum FROM schema_migrations ORDER BY version')
        .all() as { version: number; checksum: string | null }[];
      for (const row of applied) {
        const original = migrations.find((migration) => migration.version === row.version);
        if (!original || (row.checksum && row.checksum !== checksum(original.sql)))
          throw new DomainError(
            'BACKUP_INVALID',
            'El historial de migraciones no coincide con esta aplicación.',
          );
        if (!row.checksum)
          database
            .prepare('UPDATE schema_migrations SET checksum=? WHERE version=?')
            .run(checksum(original.sql), row.version);
      }
      for (const migration of migrations) {
        if (migration.version <= (current.version ?? 0)) continue;
        database.exec(migration.sql);
        database
          .prepare('INSERT INTO schema_migrations (version, applied_at, checksum) VALUES (?, ?, ?)')
          .run(migration.version, new Date().toISOString(), checksum(migration.sql));
      }
    })
    .immediate();
}
