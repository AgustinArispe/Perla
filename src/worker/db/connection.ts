import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { migrate, SCHEMA_VERSION } from './migrations';
import { DomainError } from '../../shared/errors';

export function openDatabase(path: string): Database.Database {
  const existing = path !== ':memory:' && existsSync(path);
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path, { timeout: 5000 });
  try {
    database.pragma('foreign_keys = ON');
    database.pragma('trusted_schema = OFF');
    database.pragma('journal_mode = WAL');
    database.pragma('synchronous = FULL');
    database.pragma('busy_timeout = 5000');
    if (existing) {
      if (database.pragma('quick_check', { simple: true }) !== 'ok')
        throw new DomainError('BACKUP_INVALID', 'La base no pasó la comprobación de integridad.');
      const table = database
        .prepare("SELECT name FROM sqlite_master WHERE name='schema_migrations'")
        .get();
      if (!table && database.prepare('SELECT name FROM sqlite_master LIMIT 1').get())
        throw new DomainError('BACKUP_INVALID', 'El archivo no pertenece a una base de Perla Negra.');
      const current = table
        ? (database.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as {
            version: number | null;
          })
        : { version: 0 };
      if (table && (current.version ?? 0) < SCHEMA_VERSION) {
        const folder = join(dirname(path), 'migration-backups');
        mkdirSync(folder, { recursive: true });
        const backupPath = join(folder, `before-v${SCHEMA_VERSION}-${randomUUID()}.sqlite`);
        database.prepare('VACUUM INTO ?').run(backupPath);
        const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
        try {
          if (
            backup.pragma('quick_check', { simple: true }) !== 'ok' ||
            (backup.pragma('foreign_key_check') as unknown[]).length
          )
            throw new DomainError(
              'BACKUP_INVALID',
              'No se pudo validar el respaldo previo a la actualización.',
            );
        } finally {
          backup.close();
        }
      }
    }
    migrate(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
