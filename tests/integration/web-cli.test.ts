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
it('CLI privada crea un único administrador con contraseña reforzada', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-admin-cli-')),
    databasePath = join(directory, 'db.sqlite'),
    env = {
      ...process.env,
      NODE_ENV: 'test',
      BOCHA_PUBLIC_ORIGIN: 'http://pos.test',
      BOCHA_BACKUP_KEY: randomBytes(32).toString('hex'),
      BOCHA_DATABASE_PATH: databasePath,
      BOCHA_BACKUP_DIRECTORY: join(directory, 'backups'),
    };
  try {
    const create = (password: string) =>
      spawnSync(
        process.execPath,
        [
          resolve('dist/api/cli.cjs'),
          'admin:create',
          '--username',
          'agus-admin',
          '--name',
          'Agus',
          '--password-stdin',
        ],
        { input: password, encoding: 'utf8', env },
      );
    expect(create('Corta-1!').status).not.toBe(0);
    expect(create('Administracion-Segura-2026!').status).toBe(0);
    expect(create('Administracion-Segura-2026!').status).not.toBe(0);
    const db = new Database(databasePath, { readonly: true });
    try {
      expect(
        db
          .prepare('SELECT username,role,system_admin,password_hash FROM users')
          .get(),
      ).toMatchObject({ username: 'agus-admin', role: 'OWNER', system_admin: 1 });
      expect(
        (db.prepare('SELECT password_hash FROM users').get() as { password_hash: string })
          .password_hash,
      ).not.toContain('Administracion-Segura-2026!');
    } finally {
      db.close();
    }
    const recovery = spawnSync(
      process.execPath,
      [
        resolve('dist/api/cli.cjs'),
        'admin:recover',
        '--username',
        'agus-admin',
        '--password-stdin',
      ],
      { input: 'Nueva-Administracion-2026!', encoding: 'utf8', env },
    );
    expect(recovery.status).toBe(0);
    const recovered = new Database(databasePath, { readonly: true });
    try {
      expect(
        (recovered.prepare('SELECT password_hash FROM users').get() as { password_hash: string })
          .password_hash,
      ).not.toContain('Nueva-Administracion-2026!');
    } finally {
      recovered.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 15_000);

it('la recuperación privada del jefe elimina sus intentos bloqueados', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-owner-recovery-')),
    databasePath = join(directory, 'db.sqlite'),
    env = {
      ...process.env,
      NODE_ENV: 'test',
      BOCHA_PUBLIC_ORIGIN: 'http://pos.test',
      BOCHA_BACKUP_KEY: randomBytes(32).toString('hex'),
      BOCHA_DATABASE_PATH: databasePath,
      BOCHA_BACKUP_DIRECTORY: join(directory, 'backups'),
    };
  try {
    const create = spawnSync(
      process.execPath,
      [
        resolve('dist/api/cli.cjs'),
        'owner:create',
        '--username',
        'jefe',
        '--name',
        'Jefe',
        '--password-stdin',
      ],
      { input: 'Clave-Temporal-2026!', encoding: 'utf8', env },
    );
    expect(create.status).toBe(0);
    const db = new Database(databasePath);
    db.prepare('INSERT INTO auth_attempts VALUES (?,?,?,?)').run('jefe', 5, Date.now() + 60000, Date.now());
    db.close();
    const recover = spawnSync(
      process.execPath,
      [resolve('dist/api/cli.cjs'), 'owner:recover', '--username', 'jefe', '--password-stdin'],
      { input: 'Clave-Recuperada-2026!', encoding: 'utf8', env },
    );
    expect(recover.status).toBe(0);
    const recovered = new Database(databasePath, { readonly: true });
    try {
      expect(recovered.prepare('SELECT count(*) AS n FROM auth_attempts WHERE username=?').get('jefe')).toEqual({ n: 0 });
    } finally {
      recovered.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
