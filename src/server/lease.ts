import Database from 'better-sqlite3';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
export function acquireDatabaseLease(databasePath: string) {
  mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
  const path = databasePath + '.process-lock.sqlite',
    db = new Database(path, { timeout: 1000 });
  try {
    chmodSync(path, 0o600);
    db.pragma('journal_mode=DELETE');
    db.pragma('locking_mode=EXCLUSIVE');
    db.exec('BEGIN EXCLUSIVE');
  } catch {
    db.close();
    throw new Error(
      'La base está siendo utilizada. Detené el servicio antes de administrar o recuperar los datos.',
    );
  }
  return {
    close() {
      if (db.open) db.close();
    },
  };
}
