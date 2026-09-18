import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import Database from 'better-sqlite3';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import { openDatabase } from '../../src/worker/db/connection';
import {
  BackupService,
  recoverInterruptedRestore,
  recoverDatabaseFromBackup,
} from '../../src/server/backups/service';

const cleanups: (() => void)[] = [];
it('backup acepta esquema con fin de línea de Windows para recuperarlo en Linux', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-portable-')),
    databasePath = join(directory, 'db.sqlite'),
    db = new Database(databasePath);
  migrate(
    db,
    MIGRATIONS.map((m) => ({ ...m, sql: m.sql.replace(/\r?\n/g, '\r\n') })),
  );
  const service = new BackupService({
    databasePath,
    backupDirectory: join(directory, 'backups'),
    key: randomBytes(32),
    appVersion: 'test',
    getDatabase: () => db,
    closeDatabase: () => db.close(),
    reopenDatabase: () => {
      throw new Error('unused');
    },
  });
  try {
    const info = await service.create();
    expect((await service.inspect(info.id)).info.id).toBe(info.id);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
afterEach(() => {
  vi.useRealTimers();
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-web-backup-'));
  const databasePath = join(directory, 'db.sqlite');
  let db = openDatabase(databasePath);
  let failReopen = false;
  const key = randomBytes(32);
  const service = new BackupService({
    databasePath,
    backupDirectory: join(directory, 'backups'),
    key,
    appVersion: '0.1.0',
    getDatabase: () => db,
    closeDatabase: () => db.close(),
    reopenDatabase: () => {
      if (failReopen) {
        failReopen = false;
        throw new Error('simulated reopen failure');
      }
      db = openDatabase(databasePath);
    },
  });
  cleanups.push(() => {
    if (db.open) db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    service,
    directory,
    databasePath,
    key,
    db: () => db,
    fail: () => {
      failReopen = true;
    },
  };
}
function repack(buffer: Buffer, key: Buffer, change: (packed: Buffer) => Buffer): Buffer {
  const magic = buffer.subarray(0, 8);
  const decipher = createDecipheriv('aes-256-gcm', key, buffer.subarray(8, 20));
  decipher.setAAD(magic);
  decipher.setAuthTag(buffer.subarray(20, 36));
  const packed = Buffer.concat([decipher.update(buffer.subarray(36)), decipher.final()]);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(magic);
  const encrypted = Buffer.concat([cipher.update(change(packed)), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}
it('rejects authenticated checksum mismatches and bounded decompression bombs', async () => {
  const f = fixture();
  const info = await f.service.create();
  const original = f.service.download(info.id);
  const corrupt = repack(original, f.key, (packed) => {
    const length = packed.readUInt32BE();
    const manifest = JSON.parse(packed.subarray(4, 4 + length).toString()) as { sha256: string };
    manifest.sha256 = '0'.repeat(64);
    const json = Buffer.from(JSON.stringify(manifest));
    const size = Buffer.alloc(4);
    size.writeUInt32BE(json.length);
    return Buffer.concat([size, json, packed.subarray(4 + length)]);
  });
  await expect(f.service.upload(corrupt)).rejects.toThrow();
  const bomb = repack(original, f.key, (packed) =>
    Buffer.concat([
      packed.subarray(0, 4 + packed.readUInt32BE()),
      deflateSync(Buffer.alloc(129 * 1024 * 1024)),
    ]),
  );
  await expect(f.service.upload(bomb)).rejects.toThrow();
});
it('exports authenticated ciphertext and restores a verified online snapshot, revoking sessions', async () => {
  const f = fixture();
  f.db().exec(
    "INSERT INTO users VALUES('owner','owner','Owner','OWNER',1,'hash',1,'now','now'); INSERT INTO auth_sessions(token_hash,user_id,user_revision,expires_at_ms) VALUES('session','owner',1,9999999999999); INSERT INTO auth_attempts VALUES('owner',1,0,0)",
  );
  const backup = await f.service.create();
  const bytes = f.service.download(backup.id);
  expect(bytes.includes(Buffer.from('SQLite format'))).toBe(false);
  expect(f.service.list()).toEqual([backup]);
  expect((await f.service.upload(bytes)).sha256).toBe(backup.sha256);
  f.db().prepare("UPDATE business_settings SET business_name='changed'").run();
  const preview = await f.service.inspect(backup.id);
  expect(await f.service.restore(preview.previewToken)).toEqual({
    restored: true,
    backupId: backup.id,
  });
  expect(f.db().prepare('SELECT business_name FROM business_settings').get()).toEqual({
    business_name: 'El Bocha',
  });
  expect(f.db().prepare('SELECT COUNT(*) AS n FROM auth_sessions').get()).toEqual({ n: 0 });
  expect(f.db().prepare('SELECT COUNT(*) AS n FROM auth_attempts').get()).toEqual({ n: 0 });
  expect(f.service.list().some((b) => b.kind === 'PRE_RESTORE')).toBe(true);
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
});
it('rejects a backup encrypted with another key and a missing or future application schema', async () => {
  const first = fixture();
  const second = fixture();
  const info = await first.service.create();
  await expect(second.service.upload(first.service.download(info.id))).rejects.toThrow();
  first.db().exec('UPDATE schema_migrations SET version=99 WHERE version=6');
  await expect(first.service.create()).rejects.toThrow();
  second.db().exec('DROP TABLE business_settings');
  await expect(second.service.create()).rejects.toThrow();
});
it('rejects tampering, foreign keys, oversized imports and arbitrary paths', async () => {
  const f = fixture();
  const info = await f.service.create();
  const bytes = f.service.download(info.id);
  bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1;
  await expect(f.service.upload(bytes)).rejects.toThrow();
  await expect(f.service.upload(Buffer.alloc(128 * 1024 * 1024 + 1))).rejects.toThrow();
  expect(() => f.service.download('../db.sqlite')).toThrow();
  f.db().pragma('foreign_keys=OFF');
  f.db().exec(
    "INSERT INTO terminals VALUES('terminal','terminal',1,1,'now','now'); INSERT INTO register_shifts(id,terminal_id,status,opening_cash_cents,opened_by,opened_at_utc,open_key,open_hash) VALUES('shift','terminal','OPEN',0,'missing','now','key','hash')",
  );
  await expect(f.service.create()).rejects.toThrow();
});
it('invalidates preview after writes, expiry and ciphertext replacement', async () => {
  const f = fixture();
  const info = await f.service.create();
  let preview = await f.service.inspect(info.id);
  f.db().exec("UPDATE business_settings SET business_name='write'");
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
  preview = await f.service.inspect(info.id);
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 300001);
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
  vi.useRealTimers();
  preview = await f.service.inspect(info.id);
  writeFileSync(join(f.directory, 'backups', info.id + '.bochabackup'), Buffer.from('bad'));
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
});
it('blocks all nonempty carts and rolls back a failed reopen', async () => {
  const f = fixture();
  const info = await f.service.create();
  f.db().exec(
    "INSERT INTO checkout_drafts(id,revision,body_json,updated_at_utc) VALUES('main',1,'{\"lines\":[{}]}','now')",
  );
  const preview = await f.service.inspect(info.id);
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
  f.db().exec(
    "DELETE FROM checkout_drafts; UPDATE business_settings SET business_name='preserved'",
  );
  const next = await f.service.inspect(info.id);
  f.fail();
  await expect(f.service.restore(next.previewToken)).rejects.toThrow('simulated');
  expect(f.db().prepare('SELECT business_name FROM business_settings').get()).toEqual({
    business_name: 'preserved',
  });
});
it('recovers an interrupted atomic swap to the prior database', async () => {
  const f = fixture();
  f.db().pragma('wal_checkpoint(TRUNCATE)');
  f.db().close();
  const previous = f.databasePath + '.restore-previous';
  writeFileSync(previous, readFileSync(f.databasePath));
  writeFileSync(f.databasePath, 'interrupted');
  writeFileSync(
    f.databasePath + '.restore-journal',
    JSON.stringify({ version: 1, phase: 'swapping' }),
  );
  recoverInterruptedRestore(f.databasePath);
  expect(readFileSync(f.databasePath).subarray(0, 15).toString()).toBe('SQLite format 3');
  expect(existsSync(f.databasePath + '.restore-journal')).toBe(false);
});
it('cleans abandoned plaintext recovery files before opening the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-orphan-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'db.sqlite');
  writeFileSync(path + '.restore-candidate', 'abandoned');
  writeFileSync(path + '.restore-previous', 'abandoned');
  recoverInterruptedRestore(path);
  expect(existsSync(path + '.restore-candidate')).toBe(false);
  expect(existsSync(path + '.restore-previous')).toBe(false);
});
it('creates one daily backup per day and retains fourteen daily copies', async () => {
  const f = fixture();
  const manual = await f.service.create();
  for (let day = 0; day < 16; day++) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, day + 1));
    await f.service.ensureDaily();
    await f.service.ensureDaily();
  }
  expect(f.service.list().filter((b) => b.kind === 'DAILY')).toHaveLength(14);
  expect(f.service.download(manual.id).length).toBeGreaterThan(0);
}, 20000);
it('recovers corrupt and missing databases offline and preserves the corrupt original', async () => {
  const f = fixture();
  const backup = await f.service.create();
  const buffer = f.service.download(backup.id);
  f.db().close();
  writeFileSync(f.databasePath, 'original corruption');
  const options = {
    databasePath: f.databasePath,
    backupDirectory: join(f.directory, 'backups'),
    key: f.key,
    appVersion: '0.1.0',
    buffer,
  };
  expect(recoverDatabaseFromBackup(options).restored).toBe(true);
  expect(readFileSync(f.databasePath + '.offline-original', 'utf8')).toBe('original corruption');
  const recovered = openDatabase(f.databasePath);
  expect(recovered.pragma('integrity_check', { simple: true })).toBe('ok');
  recovered.close();
  const missing = join(f.directory, 'missing.sqlite');
  expect(recoverDatabaseFromBackup({ ...options, databasePath: missing }).restored).toBe(true);
  expect(existsSync(missing + '.offline-original')).toBe(false);
});
it('rolls back an interrupted offline recovery without validating the corrupt original', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-offline-cut-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'db.sqlite');
  writeFileSync(path, 'partially installed');
  writeFileSync(path + '.offline-original', 'corrupt preserved');
  writeFileSync(
    path + '.offline-journal',
    JSON.stringify({ version: 1, phase: 'swapping', hadOriginal: true }),
  );
  recoverInterruptedRestore(path);
  expect(readFileSync(path, 'utf8')).toBe('corrupt preserved');
  expect(readFileSync(path + '.offline-original', 'utf8')).toBe('corrupt preserved');
});
