import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';

describe('migraciones trazables', () => {
  it('conserva configuración legacy al actualizar y revierte un lote fallido', () => {
    const db = new Database(':memory:');
    try {
      db.exec(
        'CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT',
      );
      db.exec(
        'CREATE TABLE app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) STRICT',
      );
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(1, '2026-01-01');
      db.prepare('INSERT INTO app_settings VALUES (?, ?)').run('store_name', 'El Bocha');
      migrate(db);
      expect(db.prepare('SELECT value_json FROM app_settings').get()).toEqual({
        value_json: 'El Bocha',
      });
      const before = db.prepare('SELECT * FROM schema_migrations ORDER BY version').all();
      expect(() =>
        migrate(db, [
          ...MIGRATIONS,
          { version: 4, sql: 'CREATE TABLE probe (id INTEGER)' },
          { version: 5, sql: 'INSERT INTO does_not_exist VALUES (1)' },
        ]),
      ).toThrow();
      expect(db.prepare("SELECT name FROM sqlite_master WHERE name='probe'").get()).toBeUndefined();
      expect(db.prepare('SELECT * FROM schema_migrations ORDER BY version').all()).toEqual(before);
    } finally {
      db.close();
    }
  });
  it('bloquea una base futura o un checksum alterado sin mutaciones', () => {
    const db = new Database(':memory:');
    try {
      migrate(db);
      db.prepare("UPDATE schema_migrations SET checksum='tampered' WHERE version=1").run();
      expect(() => migrate(db)).toThrow();
      db.prepare('DELETE FROM schema_migrations').run();
      db.prepare(
        "INSERT INTO schema_migrations (version, applied_at, checksum) VALUES (999, 'test', 'future')",
      ).run();
      expect(() => migrate(db)).toThrow();
      expect(db.prepare('SELECT version FROM schema_migrations').all()).toEqual([{ version: 999 }]);
    } finally {
      db.close();
    }
  });
});
