import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { SCHEMA_VERSION } from '../../src/worker/db/migrations';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SQLite local', () => {
  it('recupera una inicialización interrumpida en archivo vacío y rechaza bases ajenas', () => {
    const directory = mkdtempSync(join(tmpdir(), 'bocha-empty-test-'));
    directories.push(directory);
    const path = join(directory, 'bocha.sqlite');
    new Database(path).close();
    const recovered = openDatabase(path);
    expect(
      recovered.prepare('SELECT MAX(version) AS version FROM schema_migrations').get(),
    ).toEqual({ version: SCHEMA_VERSION });
    recovered.close();
    const foreignPath = join(directory, 'foreign.sqlite');
    const foreign = new Database(foreignPath);
    foreign.exec('CREATE TABLE sqliteData (id INTEGER)');
    foreign.close();
    expect(() => openDatabase(foreignPath)).toThrow('no pertenece');
  });

  it('respalda y verifica la base anterior antes de migrar', () => {
    const directory = mkdtempSync(join(tmpdir(), 'bocha-upgrade-test-'));
    directories.push(directory);
    const path = join(directory, 'bocha.sqlite');
    const legacy = new Database(path);
    legacy.exec(
      'CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT; CREATE TABLE app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) STRICT',
    );
    legacy.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(1, '2026-01-01');
    legacy.prepare('INSERT INTO app_settings VALUES (?, ?)').run('store_name', 'El Bocha');
    legacy.close();
    const upgraded = openDatabase(path);
    try {
      expect(upgraded.prepare('SELECT value_json FROM app_settings').get()).toEqual({
        value_json: 'El Bocha',
      });
      const backups = readdirSync(join(directory, 'migration-backups'));
      expect(backups).toHaveLength(1);
      const backup = new Database(join(directory, 'migration-backups', backups[0]!), {
        readonly: true,
      });
      try {
        expect(backup.pragma('quick_check', { simple: true })).toBe('ok');
        expect(
          backup.prepare('SELECT MAX(version) AS version FROM schema_migrations').get(),
        ).toEqual({ version: 1 });
        expect(backup.prepare('SELECT value FROM app_settings').get()).toEqual({
          value: 'El Bocha',
        });
      } finally {
        backup.close();
      }
    } finally {
      upgraded.close();
    }
  });

  it('aplica una migración una sola vez y conserva datos al reabrir', () => {
    const directory = mkdtempSync(join(tmpdir(), 'bocha-db-test-'));
    directories.push(directory);
    const path = join(directory, 'data', 'bocha.sqlite');
    let database = openDatabase(path);
    database
      .prepare('INSERT INTO app_settings (key, value_json) VALUES (?, ?)')
      .run('store_name', 'El Bocha');
    database.close();
    database = openDatabase(path);
    try {
      expect(
        database.prepare('SELECT value_json FROM app_settings WHERE key = ?').get('store_name'),
      ).toEqual({ value_json: 'El Bocha' });
      expect(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({
        count: SCHEMA_VERSION,
      });
      expect(database.pragma('journal_mode', { simple: true })).toBe('wal');
      expect(database.pragma('foreign_keys', { simple: true })).toBe(1);
      expect(database.pragma('synchronous', { simple: true })).toBe(2);
    } finally {
      database.close();
    }
  });

  it('revierte una transacción completa ante un error', () => {
    const database = openDatabase(':memory:');
    try {
      expect(() =>
        database.transaction(() => {
          database
            .prepare('INSERT INTO app_settings (key, value_json) VALUES (?, ?)')
            .run('test', '1');
          database
            .prepare('INSERT INTO app_settings (key, value_json) VALUES (?, ?)')
            .run('test', '2');
        })(),
      ).toThrow();
      expect(database.prepare('SELECT COUNT(*) AS count FROM app_settings').get()).toEqual({
        count: 0,
      });
    } finally {
      database.close();
    }
  });
});
