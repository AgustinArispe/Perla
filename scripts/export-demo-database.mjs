import Database from 'better-sqlite3';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

// Export a consistent private copy, including committed WAL data, without
// modifying the source. Never put this archive or authentication hashes in Git.
const source = resolve(process.argv[2] ?? '.data/five-month-local/pos.sqlite');
const exportsDirectory = resolve('.data/exports');
await mkdir(exportsDirectory, { recursive: true });
const directory = await mkdtemp(join(exportsDirectory, 'demo-'));
const snapshot = join(directory, 'pos.sqlite');
const archive = `${snapshot}.gz`;
const original = new Database(source, { readonly: true, fileMustExist: true });
try {
  await original.backup(snapshot);
} finally {
  original.close();
}
const copy = new Database(snapshot, { fileMustExist: true });
let manifest;
try {
  copy.pragma('journal_mode = DELETE');
  copy.transaction(() => {
    copy.prepare('DELETE FROM auth_sessions').run();
    copy.prepare('DELETE FROM auth_attempts').run();
  })();
  const integrity = copy.pragma('integrity_check');
  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok')
    throw new Error('La copia no supera la verificación de integridad.');
  if (copy.pragma('foreign_key_check').length)
    throw new Error('La copia tiene relaciones inconsistentes.');
  manifest = {
    exportedAt: new Date().toISOString(),
    products: copy.prepare('SELECT count(*) AS total FROM products').get().total,
    users: copy.prepare('SELECT username, name, role, active FROM users ORDER BY username').all(),
    note: 'Copia privada de simulación. Conserva las contraseñas existentes; no contiene sesiones activas. No publicar en GitHub.',
  };
} finally {
  copy.close();
}
await pipeline(
  createReadStream(snapshot),
  createGzip({ level: 9 }),
  createWriteStream(archive, { flags: 'wx', mode: 0o600 }),
);
const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
manifest.sha256 = hash.digest('hex');
await writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
  flag: 'wx',
  mode: 0o600,
});
console.log(JSON.stringify({ archive, ...manifest }, null, 2));
