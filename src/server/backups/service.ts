import Database from 'better-sqlite3';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { createDeflate, createInflate, inflateSync } from 'node:zlib';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { MIGRATIONS, SCHEMA_VERSION, migrate } from '../../worker/db/migrations';
import { DomainError } from '../../shared/errors';

export interface BackupInfo {
  id: string;
  createdAt: string;
  kind: 'MANUAL' | 'DAILY' | 'PRE_RESTORE';
  appVersion: string;
  schemaVersion: number;
  bytes: number;
  keyId: string;
  sha256: string;
}
interface Options {
  databasePath: string;
  backupDirectory: string;
  key: Buffer;
  appVersion: string;
  getDatabase: () => Database.Database;
  closeDatabase: () => void;
  reopenDatabase: () => void;
  maxBytes?: number;
}
const MAGIC = Buffer.from('BOCHABK1');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
function fileHash(path: string): string {
  const digest = createHash('sha256');
  const fd = openSync(path, 'r');
  try {
    const block = Buffer.allocUnsafe(64 * 1024);
    let bytes: number;
    while ((bytes = readSync(fd, block, 0, block.length, null)) > 0)
      digest.update(block.subarray(0, bytes));
    return digest.digest('hex');
  } finally {
    closeSync(fd);
  }
}
const invalid = (message = 'La copia no pasó la validación.') =>
  new DomainError('BACKUP_INVALID', message);
function durable(path: string, data: Buffer | string): void {
  writeFileSync(path, data, { mode: 0o600 });
  chmodSync(path, 0o600);
  const fd = openSync(path, 'r+');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function syncDirectory(path: string): void {
  // Windows does not support opening directories for fsync; file handles are flushed above.
  if (process.platform === 'win32') return;
  const fd = openSync(path, 'r');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function removeSidecars(path: string): void {
  for (const suffix of ['-wal', '-shm']) rmSync(path + suffix, { force: true });
}
function writeJournal(path: string, state: object): void {
  durable(path + '.next', JSON.stringify(state));
  renameSync(path + '.next', path);
  syncDirectory(dirname(path));
}
function recoverOfflineInterrupted(databasePath: string): void {
  const journal = databasePath + '.offline-journal';
  if (!existsSync(journal)) {
    rmSync(databasePath + '.offline-candidate', { force: true });
    rmSync(journal + '.next', { force: true });
    return;
  }
  const state = JSON.parse(readFileSync(journal, 'utf8')) as {
    version?: number;
    phase?: string;
    hadOriginal?: boolean;
  };
  if (
    state.version !== 1 ||
    !['swapping', 'committed'].includes(state.phase ?? '') ||
    typeof state.hadOriginal !== 'boolean'
  )
    throw invalid('Journal offline inválido.');
  if (state.phase === 'swapping') {
    removeSidecars(databasePath);
    if (state.hadOriginal) {
      if (!existsSync(databasePath + '.offline-original'))
        throw invalid('Falta el original de recuperación.');
      durable(
        databasePath + '.offline-candidate',
        readFileSync(databasePath + '.offline-original'),
      );
      renameSync(databasePath + '.offline-candidate', databasePath);
      for (const suffix of ['-wal', '-shm'])
        if (existsSync(databasePath + '.offline-original' + suffix))
          durable(databasePath + suffix, readFileSync(databasePath + '.offline-original' + suffix));
    } else rmSync(databasePath, { force: true });
    syncDirectory(dirname(databasePath));
  }
  rmSync(databasePath + '.offline-candidate', { force: true });
  rmSync(journal, { force: true });
  rmSync(journal + '.next', { force: true });
  syncDirectory(dirname(databasePath));
}
export function recoverInterruptedRestore(databasePath: string): void {
  recoverOfflineInterrupted(databasePath);
  const journal = databasePath + '.restore-journal';
  if (!existsSync(journal)) {
    for (const suffix of [
      '.restore-candidate',
      '.restore-previous',
      '.restore-recovery',
      '.restore-journal.next',
    ])
      rmSync(databasePath + suffix, { force: true });
    return;
  }
  const state = JSON.parse(readFileSync(journal, 'utf8')) as { version?: number; phase?: string };
  if (state.version !== 1 || !['swapping', 'committed'].includes(state.phase ?? ''))
    throw invalid('Journal de recuperación inválido.');
  const previous = databasePath + '.restore-previous';
  if (state.phase === 'swapping') {
    if (!existsSync(previous)) throw invalid('Falta la base anterior para recuperar.');
    const check = new Database(previous, { readonly: true, fileMustExist: true });
    try {
      if (check.pragma('integrity_check', { simple: true }) !== 'ok') throw invalid();
    } finally {
      check.close();
    }
    removeSidecars(databasePath);
    copyFileSync(previous, databasePath + '.restore-recovery');
    durable(databasePath + '.restore-recovery', readFileSync(databasePath + '.restore-recovery'));
    renameSync(databasePath + '.restore-recovery', databasePath);
    syncDirectory(dirname(databasePath));
  }
  rmSync(databasePath + '.restore-candidate', { force: true });
  rmSync(previous, { force: true });
  rmSync(journal, { force: true });
  syncDirectory(dirname(databasePath));
}

export class BackupService {
  private readonly maxBytes: number;
  private readonly key: Buffer;
  private readonly previews = new Map<
    string,
    { id: string; fileHash: string; stateHash: string; expires: number }
  >();
  private busy = false;
  private readonly listed = new Map<string, { hash: string; info: BackupInfo | null }>();
  constructor(private readonly options: Options) {
    if (options.key.length !== 32) throw new Error('La clave de backup debe tener 32 bytes.');
    this.key = Buffer.from(options.key);
    this.maxBytes = options.maxBytes ?? 512 * 1024 * 1024;
    mkdirSync(options.backupDirectory, { recursive: true, mode: 0o700 });
    chmodSync(options.backupDirectory, 0o700);
  }
  private path(id: string): string {
    if (!UUID.test(id)) throw invalid();
    return join(this.options.backupDirectory, id + '.bochabackup');
  }
  private validateSqlite(bytes: Buffer, version: number): void {
    const path = join(this.options.backupDirectory, randomUUID() + '.validation');
    try {
      durable(path, bytes);
      this.validateSqliteFile(path, version);
    } finally {
      rmSync(path, { force: true });
      removeSidecars(path);
    }
  }
  private validateSqliteFile(path: string, version: number): void {
    if (!Number.isInteger(version) || version < 1 || version > SCHEMA_VERSION)
      throw invalid('La versión de la base no es compatible.');
    let db: Database.Database | undefined;
    const expected = new Database(':memory:');
    try {
      db = new Database(path, { readonly: true, fileMustExist: true });
      if (
        db.pragma('integrity_check', { simple: true }) !== 'ok' ||
        (db.pragma('foreign_key_check') as unknown[]).length
      )
        throw invalid();
      migrate(
        expected,
        MIGRATIONS.filter((m) => m.version <= version),
      );
      const schema = (database: Database.Database) =>
        database
          .prepare(
            "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
          )
          .all()
          .map((row) => {
            const value = row as { sql: string | null };
            return {
              ...(row as Record<string, unknown>),
              sql: value.sql?.replace(/\r\n/g, '\n') ?? null,
            };
          });
      if (JSON.stringify(schema(db)) !== JSON.stringify(schema(expected)))
        throw invalid('El esquema no pertenece a esta aplicación.');
      const rows = db
        .prepare('SELECT version,checksum FROM schema_migrations ORDER BY version')
        .all() as { version: number; checksum: string }[];
      if (
        rows.length !== MIGRATIONS.filter((m) => m.version <= version).length ||
        rows.some((row, index) => {
          const migration = MIGRATIONS[index]!;
          return (
            row.version !== migration.version ||
            ![
              hash(migration.sql.replace(/\r\n/g, '\n')),
              hash(migration.sql.replace(/\r?\n/g, '\r\n')),
            ].includes(row.checksum)
          );
        })
      )
        throw invalid('El historial de migraciones no coincide.');
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw invalid();
    } finally {
      db?.close();
      expected.close();
    }
  }
  private decode(buffer: Buffer): { info: BackupInfo; database: Buffer } {
    try {
      if (
        buffer.length > this.maxBytes ||
        buffer.length < 40 ||
        !buffer.subarray(0, 8).equals(MAGIC)
      )
        throw invalid();
      const decipher = createDecipheriv('aes-256-gcm', this.key, buffer.subarray(8, 20));
      decipher.setAAD(MAGIC);
      decipher.setAuthTag(buffer.subarray(20, 36));
      const packed = Buffer.concat([decipher.update(buffer.subarray(36)), decipher.final()]);
      const length = packed.readUInt32BE(0);
      if (length > 16384 || length < 2 || length + 4 > packed.length) throw invalid();
      const info = JSON.parse(packed.subarray(4, length + 4).toString('utf8')) as BackupInfo;
      if (
        !UUID.test(info.id) ||
        !['MANUAL', 'DAILY', 'PRE_RESTORE'].includes(info.kind) ||
        typeof info.appVersion !== 'string' ||
        !Number.isFinite(Date.parse(info.createdAt)) ||
        info.keyId !== hash(this.key).slice(0, 16)
      )
        throw invalid();
      const database = inflateSync(packed.subarray(length + 4), { maxOutputLength: this.maxBytes });
      if (info.sha256 !== hash(database)) throw invalid();
      this.validateSqlite(database, info.schemaVersion);
      return { info: { ...info, bytes: buffer.length }, database };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw invalid();
    }
  }
  async create(kind: BackupInfo['kind'] = 'MANUAL'): Promise<BackupInfo> {
    const path = join(this.options.backupDirectory, randomUUID() + '.snapshot');
    const output = path + '.encrypted';
    try {
      durable(path, Buffer.alloc(0));
      await this.options.getDatabase().backup(path);
      chmodSync(path, 0o600);
      if (statSync(path).size > this.maxBytes) throw invalid('La base supera el límite de copia.');
      const version = (
        this.options
          .getDatabase()
          .prepare('SELECT MAX(version) AS version FROM schema_migrations')
          .get() as { version: number }
      ).version;
      this.validateSqliteFile(path, version);
      const info: BackupInfo = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        kind,
        appVersion: this.options.appVersion,
        schemaVersion: version,
        bytes: 0,
        keyId: hash(this.key).slice(0, 16),
        sha256: fileHash(path),
      };
      const manifest = Buffer.from(JSON.stringify(info));
      const size = Buffer.alloc(4);
      size.writeUInt32BE(manifest.length);
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', this.key, iv);
      cipher.setAAD(MAGIC);
      // Keep the BOCHABK1 format while bounding memory independently of database size.
      const header = Buffer.concat([MAGIC, iv, Buffer.alloc(16)]);
      const prefix = cipher.update(Buffer.concat([size, manifest]));
      durable(output, Buffer.concat([header, prefix]));
      await pipeline(
        createReadStream(path),
        createDeflate(),
        cipher,
        createWriteStream(output, { flags: 'a', mode: 0o600 }),
      );
      const bytes = statSync(output).size;
      if (bytes > this.maxBytes) throw invalid();
      const fd = openSync(output, 'r+');
      try {
        writeSync(fd, cipher.getAuthTag(), 0, 16, MAGIC.length + iv.length);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      const destination = this.path(info.id);
      renameSync(output, destination);
      syncDirectory(this.options.backupDirectory);
      const result = { ...info, bytes };
      this.listed.set(destination, { hash: fileHash(destination), info: result });
      return result;
    } finally {
      rmSync(path, { force: true });
      removeSidecars(path);
      rmSync(output, { force: true });
    }
  }
  private async readInfo(path: string): Promise<BackupInfo> {
    const packed = join(this.options.backupDirectory, randomUUID() + '.packed');
    const database = packed + '.validation';
    try {
      const bytes = statSync(path).size;
      if (bytes < 40 || bytes > this.maxBytes) throw invalid();
      const fd = openSync(path, 'r');
      const header = Buffer.alloc(36);
      try {
        if (readSync(fd, header, 0, header.length, 0) !== header.length) throw invalid();
      } finally {
        closeSync(fd);
      }
      if (!header.subarray(0, 8).equals(MAGIC)) throw invalid();
      const decipher = createDecipheriv('aes-256-gcm', this.key, header.subarray(8, 20));
      decipher.setAAD(MAGIC);
      decipher.setAuthTag(header.subarray(20, 36));
      // Authenticate the whole payload before inflating any untrusted content.
      await pipeline(
        createReadStream(path, { start: 36 }),
        decipher,
        createWriteStream(packed, { flags: 'wx', mode: 0o600 }),
      );
      const packedFd = openSync(packed, 'r');
      let length: number;
      let info: BackupInfo;
      try {
        const size = Buffer.alloc(4);
        if (readSync(packedFd, size, 0, 4, 0) !== 4) throw invalid();
        length = size.readUInt32BE(0);
        if (length < 2 || length > 16384 || length + 4 > statSync(packed).size) throw invalid();
        const manifest = Buffer.alloc(length);
        if (readSync(packedFd, manifest, 0, length, 4) !== length) throw invalid();
        info = JSON.parse(manifest.toString('utf8')) as BackupInfo;
      } finally {
        closeSync(packedFd);
      }
      if (
        !UUID.test(info.id) ||
        !['MANUAL', 'DAILY', 'PRE_RESTORE'].includes(info.kind) ||
        typeof info.appVersion !== 'string' ||
        !Number.isFinite(Date.parse(info.createdAt)) ||
        info.keyId !== hash(this.key).slice(0, 16)
      )
        throw invalid();
      let inflatedBytes = 0;
      const limit = this.maxBytes;
      const bounded = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          inflatedBytes += chunk.length;
          callback(inflatedBytes > limit ? invalid() : null, chunk);
        },
      });
      await pipeline(
        createReadStream(packed, { start: length + 4 }),
        createInflate(),
        bounded,
        createWriteStream(database, { flags: 'wx', mode: 0o600 }),
      );
      if (fileHash(database) !== info.sha256) throw invalid();
      this.validateSqliteFile(database, info.schemaVersion);
      return { ...info, bytes };
    } finally {
      rmSync(packed, { force: true });
      rmSync(database, { force: true });
      removeSidecars(database);
    }
  }
  async list(): Promise<BackupInfo[]> {
    const result: BackupInfo[] = [];
    for (const name of readdirSync(this.options.backupDirectory).filter(
      (name) => name.endsWith('.bochabackup') && UUID.test(name.slice(0, -12)),
    )) {
      try {
        const path = join(this.options.backupDirectory, name);
        if (statSync(path).size > this.maxBytes) continue;
        const digest = fileHash(path);
        const cached = this.listed.get(path);
        if (cached?.hash === digest) {
          if (cached.info) result.push(cached.info);
          continue;
        }
        try {
          const info = await this.readInfo(path);
          this.listed.set(path, { hash: digest, info });
          result.push(info);
        } catch {
          this.listed.set(path, { hash: digest, info: null });
        }
      } catch {
        // Ignore unreadable entries, as with invalid backups.
      }
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  download(id: string): Buffer {
    const path = this.path(id);
    if (statSync(path).size > this.maxBytes) throw invalid();
    const bytes = readFileSync(path);
    this.decode(bytes);
    return bytes;
  }
  async upload(buffer: Buffer): Promise<BackupInfo> {
    const { info } = this.decode(buffer);
    const path = this.path(info.id);
    if (existsSync(path)) {
      if (!readFileSync(path).equals(buffer))
        throw invalid('Ya existe una copia con ese identificador.');
      return info;
    }
    durable(path, buffer);
    syncDirectory(this.options.backupDirectory);
    return info;
  }
  private stateHash(): string {
    const db = this.options.getDatabase();
    const digest = createHash('sha256');
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('auth_sessions','auth_attempts','audit_events') ORDER BY name",
      )
      .all() as { name: string }[];
    for (const { name } of tables) {
      digest.update(name);
      const rows = db
        .prepare('SELECT * FROM "' + name.replaceAll('"', '""') + '"')
        .all()
        .map((row) => JSON.stringify(row))
        .sort();
      for (const row of rows) digest.update(row);
    }
    return digest.digest('hex');
  }
  async inspect(id: string): Promise<{ info: BackupInfo; previewToken: string }> {
    const bytes = this.download(id);
    const { info } = this.decode(bytes);
    const previewToken = randomUUID();
    for (const [token, p] of this.previews) if (p.expires < Date.now()) this.previews.delete(token);
    this.previews.set(previewToken, {
      id,
      fileHash: hash(bytes),
      stateHash: this.stateHash(),
      expires: Date.now() + 300000,
    });
    return { info, previewToken };
  }
  async restore(previewToken: string): Promise<{ restored: true; backupId: string }> {
    const preview = this.previews.get(previewToken);
    this.previews.delete(previewToken);
    if (
      this.busy ||
      !preview ||
      preview.expires < Date.now() ||
      preview.stateHash !== this.stateHash()
    )
      throw invalid('La vista previa venció o los datos cambiaron.');
    const drafts = this.options
      .getDatabase()
      .prepare('SELECT body_json FROM checkout_drafts')
      .all() as { body_json: string }[];
    if (
      drafts.some((d) => {
        try {
          const body = JSON.parse(d.body_json) as { lines?: unknown[] };
          return !Array.isArray(body.lines) || body.lines.length > 0;
        } catch {
          return true;
        }
      })
    )
      throw invalid('Resolvé los carritos pendientes antes de restaurar.');
    const buffer = this.download(preview.id);
    if (hash(buffer) !== preview.fileHash) throw invalid();
    const { database } = this.decode(buffer);
    this.busy = true;
    const path = this.options.databasePath;
    const journal = path + '.restore-journal';
    const previous = path + '.restore-previous';
    const candidate = path + '.restore-candidate';
    let closed = false;
    try {
      await this.create('PRE_RESTORE');
      if (preview.stateHash !== this.stateHash())
        throw invalid('Los datos cambiaron durante el respaldo.');
      durable(candidate, database);
      this.options.getDatabase().pragma('wal_checkpoint(TRUNCATE)');
      this.options.closeDatabase();
      closed = true;
      durable(previous, readFileSync(path));
      writeJournal(journal, { version: 1, phase: 'swapping' });
      syncDirectory(dirname(path));
      removeSidecars(path);
      renameSync(candidate, path);
      syncDirectory(dirname(path));
      this.options.reopenDatabase();
      closed = false;
      this.options
        .getDatabase()
        .transaction(() => {
          this.options.getDatabase().exec('DELETE FROM auth_sessions; DELETE FROM auth_attempts');
        })
        .immediate();
      this.options.getDatabase().pragma('wal_checkpoint(TRUNCATE)');
      writeJournal(journal, { version: 1, phase: 'committed' });
      syncDirectory(dirname(path));
      recoverInterruptedRestore(path);
      this.previews.clear();
      return { restored: true, backupId: preview.id };
    } catch (error) {
      if (existsSync(journal)) {
        if (!closed) {
          this.options.closeDatabase();
          closed = true;
        }
        recoverInterruptedRestore(path);
      }
      if (closed) this.options.reopenDatabase();
      throw error;
    } finally {
      rmSync(candidate, { force: true });
      if (!existsSync(journal)) rmSync(previous, { force: true });
      this.busy = false;
    }
  }
  async ensureDaily(): Promise<BackupInfo> {
    const day = new Date().toISOString().slice(0, 10);
    const backups = await this.list();
    const existing = backups.find(
      (info) => info.kind === 'DAILY' && info.createdAt.slice(0, 10) === day,
    );
    const info = existing ?? (await this.create('DAILY'));
    for (const expired of [info, ...backups.filter((backup) => backup.id !== info.id)]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((item) => item.kind === 'DAILY')
      .slice(14))
      rmSync(this.path(expired.id), { force: true });
    return info;
  }
  recoverOffline(buffer: Buffer): { restored: true; backupId: string; preservedPath?: string } {
    const { info, database } = this.decode(buffer);
    const path = this.options.databasePath;
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    recoverInterruptedRestore(path);
    const previous = path + '.offline-original';
    const candidate = path + '.offline-candidate';
    const journal = path + '.offline-journal';
    if (existsSync(previous))
      throw invalid(
        'Ya existe un original preservado; movelo a un archivo seguro antes de otra recuperación.',
      );
    const hadOriginal = existsSync(path);
    try {
      durable(candidate, database);
      const db = new Database(candidate);
      try {
        db.pragma('foreign_keys=ON');
        migrate(db);
        db.transaction(() =>
          db.exec('DELETE FROM auth_sessions; DELETE FROM auth_attempts'),
        ).immediate();
        if (
          db.pragma('integrity_check', { simple: true }) !== 'ok' ||
          (db.pragma('foreign_key_check') as unknown[]).length
        )
          throw invalid();
      } finally {
        db.close();
      }
      durable(candidate, readFileSync(candidate));
      if (hadOriginal) {
        durable(previous, readFileSync(path));
        for (const suffix of ['-wal', '-shm'])
          if (existsSync(path + suffix)) durable(previous + suffix, readFileSync(path + suffix));
      }
      writeJournal(journal, { version: 1, phase: 'swapping', hadOriginal });
      removeSidecars(path);
      renameSync(candidate, path);
      syncDirectory(dirname(path));
      writeJournal(journal, { version: 1, phase: 'committed', hadOriginal });
      recoverOfflineInterrupted(path);
      return {
        restored: true,
        backupId: info.id,
        ...(hadOriginal ? { preservedPath: previous } : {}),
      };
    } catch (error) {
      if (existsSync(journal)) recoverOfflineInterrupted(path);
      throw error;
    } finally {
      rmSync(candidate, { force: true });
      removeSidecars(candidate);
    }
  }
}

export function recoverDatabaseFromBackup(
  options: Pick<Options, 'databasePath' | 'backupDirectory' | 'key' | 'appVersion' | 'maxBytes'> & {
    buffer: Buffer;
  },
): { restored: true; backupId: string; preservedPath?: string } {
  const unavailable = (): never => {
    throw new Error('La recuperación offline exige el servicio detenido.');
  };
  return new BackupService({
    ...options,
    getDatabase: unavailable,
    closeDatabase: unavailable,
    reopenDatabase: unavailable,
  }).recoverOffline(options.buffer);
}
