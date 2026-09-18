import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
it('CLI privada rechaza alta incompleta sin crear una cuenta con el nombre de una opción', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-cli-')),
    databasePath = join(directory, 'db.sqlite');
  try {
    const result = spawnSync(
      process.execPath,
      [resolve('dist/api/cli.cjs'), 'owner:create', '--name', 'Jefe', '--password-stdin'],
      {
        input: 'Prueba-CLI-Bocha-2026!',
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BOCHA_PUBLIC_ORIGIN: 'http://pos.test',
          BOCHA_BACKUP_KEY: randomBytes(32).toString('hex'),
          BOCHA_DATABASE_PATH: databasePath,
          BOCHA_BACKUP_DIRECTORY: join(directory, 'backups'),
        },
      },
    );
    expect(result.status).not.toBe(0);
    const db = new Database(databasePath, { readonly: true });
    try {
      expect(db.prepare('SELECT count(*) AS n FROM users').get()).toEqual({ n: 0 });
    } finally {
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
