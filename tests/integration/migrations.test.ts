import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS, SCHEMA_VERSION } from '../../src/worker/db/migrations';

describe('migraciones trazables', () => {
  it('crea compras y proveedores desactivados por defecto con vínculos de stock', () => {
    const db = new Database(':memory:');
    try {
      db.pragma('foreign_keys=ON');
      migrate(db);
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'purchase%' OR name='suppliers'",
        )
        .all() as { name: string }[];
      expect(tables.map((row) => row.name).sort()).toEqual([
        'purchase_drafts',
        'purchase_events',
        'purchase_items',
        'purchases',
        'suppliers',
      ]);
      expect(
        db
          .prepare("SELECT enabled FROM business_features WHERE feature_key='SUPPLIERS_PURCHASES'")
          .get(),
      ).toEqual({ enabled: 0 });
      const stockColumns = db.pragma('table_info(stock_movements)') as { name: string }[];
      expect(stockColumns.map((column) => column.name)).toEqual(
        expect.arrayContaining(['purchase_id', 'purchase_item_id']),
      );
      expect(db.pragma('foreign_key_check')).toEqual([]);
    } finally {
      db.close();
    }
  });
  it('actualiza los nombres anteriores sin reemplazar nombres personalizados ni repetir la revisión', () => {
    for (const [before, after] of [
      ['El Bocha', 'Perla Negra'],
      ['El Bocha · Demo', 'Perla Negra'],
      ['El Perla', 'Perla Negra'],
      ['Mi comercio', 'Mi comercio'],
    ]) {
      const db = new Database(':memory:');
      try {
        migrate(
          db,
          MIGRATIONS.filter((migration) => migration.version <= 10),
        );
        db.prepare('UPDATE business_settings SET business_name=?').run(before);
        migrate(db);
        const settings = db.prepare('SELECT business_name,revision FROM business_settings').get();
        expect(settings).toEqual({
          business_name: after,
          revision: before === after ? 1 : before === 'El Perla' ? 2 : 3,
        });
        migrate(db);
        expect(db.prepare('SELECT business_name,revision FROM business_settings').get()).toEqual(
          settings,
        );
      } finally {
        db.close();
      }
    }
  });
  it('acepta checksum legacy CRLF y lo normaliza para mover la base entre Windows y Linux', () => {
    const db = new Database(':memory:');
    try {
      migrate(db);
      const sql = MIGRATIONS[1]!.sql.replace(/\r?\n/g, '\r\n');
      const legacy = createHash('sha256').update(sql).digest('hex');
      db.prepare('UPDATE schema_migrations SET checksum=? WHERE version=2').run(legacy);
      expect(() => migrate(db)).not.toThrow();
      const canonical = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      expect(db.prepare('SELECT checksum FROM schema_migrations WHERE version=2').get()).toEqual({
        checksum: canonical,
      });
    } finally {
      db.close();
    }
  });
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
          { version: SCHEMA_VERSION + 1, sql: 'CREATE TABLE probe (id INTEGER)' },
          { version: SCHEMA_VERSION + 2, sql: 'INSERT INTO does_not_exist VALUES (1)' },
        ]),
      ).toThrow();
      expect(db.prepare("SELECT name FROM sqlite_master WHERE name='probe'").get()).toBeUndefined();
      expect(db.prepare('SELECT * FROM schema_migrations ORDER BY version').all()).toEqual(before);
    } finally {
      db.close();
    }
  });
  it('actualiza v5 conservando catálogo y usuarios; invalida sesiones previas', () => {
    const db = new Database(':memory:');
    try {
      db.pragma('foreign_keys=ON');
      migrate(db, MIGRATIONS.slice(0, 5));
      db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)').run(
        'owner-id',
        'owner',
        'Owner',
        'OWNER',
        1,
        'stored-password',
        1,
        '2026-09-01',
        '2026-09-01',
      );
      db.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?)').run(
        'old-session',
        'owner-id',
        1,
        Date.now() + 60000,
      );
      const users = db.prepare('SELECT * FROM users').all() as Record<string, unknown>[];
      migrate(db);
      expect(db.prepare('SELECT * FROM users').all()).toEqual(
        users.map((user) => ({ ...user, system_admin: 0, start_module: null })),
      );
      expect(db.prepare('SELECT count(*) AS n FROM auth_sessions').get()).toEqual({ n: 0 });
      expect(db.prepare('SELECT max(version) AS version FROM schema_migrations').get()).toEqual({
        version: SCHEMA_VERSION,
      });
      expect(
        (db.pragma('table_info(users)') as { name: string }[]).some(
          (column) => column.name === 'system_admin',
        ),
      ).toBe(true);
      expect(db.pragma('foreign_key_check')).toEqual([]);
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
