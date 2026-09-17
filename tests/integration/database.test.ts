import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SQLite local', () => {
  it('aplica una migración una sola vez y conserva datos al reabrir', () => {
    const directory = mkdtempSync(join(tmpdir(), 'bocha-db-test-'));
    directories.push(directory);
    const path = join(directory, 'data', 'bocha.sqlite');
    let database = openDatabase(path);
    database
      .prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)')
      .run('store_name', 'El Bocha');
    database.close();
    database = openDatabase(path);
    try {
      expect(
        database.prepare('SELECT value FROM app_settings WHERE key = ?').get('store_name'),
      ).toEqual({ value: 'El Bocha' });
      expect(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({
        count: 1,
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
          database.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('test', '1');
          database.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('test', '2');
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
