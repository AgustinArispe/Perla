import { readFileSync, statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { readServerConfig } from './config';
import { ServerRuntime } from './runtime';
import { AuthService } from '../worker/auth/service';
import { hashPassword } from '../worker/auth/password';
import { recordAudit } from '../worker/auth/audit';
import { recoverDatabaseFromBackup } from './backups/service';
import { AdminPasswordSchema, BootstrapSchema } from '../shared/auth';
import { acquireDatabaseLease } from './lease';
async function main() {
  const config = readServerConfig(),
    [command, ...args] = process.argv.slice(2);
  const arg = (name: string) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  if (command === 'restore:offline') {
    if (!args.includes('--service-stopped'))
      throw new Error('Detené el servicio antes de recuperar.');
    const path = arg('--file');
    if (!path || statSync(path).size > 128 * 1024 * 1024) throw new Error('Archivo inválido.');
    const lease = acquireDatabaseLease(config.databasePath);
    try {
      const result = recoverDatabaseFromBackup({
        ...config,
        key: config.backupKey,
        buffer: readFileSync(path),
      });
      console.log(JSON.stringify(result));
    } finally {
      lease.close();
    }
    return;
  }
  const runtime = new ServerRuntime(config);
  try {
    if (command === 'owner:create') {
      if (!args.includes('--password-stdin'))
        throw new Error('Ingresá la contraseña por entrada estándar.');
      const password = readFileSync(0, 'utf8').trim();
      const grant = new AuthService(runtime.database).bootstrap(
        BootstrapSchema.parse({ username: arg('--username'), name: arg('--name'), password }),
      );
      new AuthService(runtime.database).logout(grant.sessionToken);
      console.log('Jefe creado.');
    } else if (command === 'admin:create') {
      if (!args.includes('--password-stdin'))
        throw new Error('Ingresá la contraseña por entrada estándar.');
      const input = BootstrapSchema.parse({
        username: arg('--username'),
        name: arg('--name'),
        password: readFileSync(0, 'utf8').trim(),
      });
      AdminPasswordSchema.parse(input.password);
      runtime.database
        .transaction(() => {
          if (runtime.database.prepare('SELECT 1 FROM users WHERE system_admin=1').get())
            throw new Error('Ya existe un administrador del sistema.');
          const id = randomUUID(),
            now = new Date().toISOString(),
            admin = {
              id,
              username: input.username,
              name: input.name,
              role: 'ADMIN' as const,
              active: true,
              revision: 1,
              createdAt: now,
              updatedAt: now,
            };
          runtime.database
            .prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?)')
            .run(
              id,
              input.username,
              input.name,
              'OWNER',
              1,
              hashPassword(input.password),
              1,
              now,
              now,
              1,
            );
          recordAudit(runtime.database, admin, 'auth.adminCreated', id);
        })
        .immediate();
      console.log('Administrador del sistema creado.');
    } else if (command === 'owner:recover') {
      if (!args.includes('--password-stdin'))
        throw new Error('Ingresá la contraseña por entrada estándar.');
      const input = BootstrapSchema.parse({
        username: arg('--username'),
        name: 'Recuperación',
        password: readFileSync(0, 'utf8').trim(),
      });
      const row = runtime.database
        .prepare(
          "SELECT id FROM users WHERE username=? AND role='OWNER' AND system_admin=0 AND active=1",
        )
        .get(input.username) as { id: string } | undefined;
      if (!row) throw new Error('Jefe inexistente.');
      runtime.database
        .transaction(() => {
          runtime.database
            .prepare(
              'UPDATE users SET password_hash=?,revision=revision+1,updated_at_utc=? WHERE id=?',
            )
            .run(hashPassword(input.password), new Date().toISOString(), row.id);
          runtime.database.prepare('DELETE FROM auth_sessions').run();
          runtime.database.prepare('DELETE FROM auth_attempts WHERE username=?').run(input.username);
          const actor = runtime.database
            .prepare(
              'SELECT id,username,name,role,active,revision,created_at_utc AS createdAt,updated_at_utc AS updatedAt FROM users WHERE id=?',
            )
            .get(row.id);
          recordAudit(
            runtime.database,
            actor as Parameters<typeof recordAudit>[1],
            'auth.privateRecovery',
            row.id,
          );
        })
        .immediate();
      console.log('Acceso recuperado; sesiones revocadas.');
    } else if (command === 'admin:recover') {
      if (!args.includes('--password-stdin'))
        throw new Error('Ingresá la contraseña por entrada estándar.');
      const input = BootstrapSchema.parse({
        username: arg('--username'),
        name: 'Recuperación',
        password: readFileSync(0, 'utf8').trim(),
      });
      AdminPasswordSchema.parse(input.password);
      const row = runtime.database
        .prepare(
          'SELECT id,username,name,active,revision,created_at_utc AS createdAt,updated_at_utc AS updatedAt FROM users WHERE username=? AND system_admin=1 AND active=1',
        )
        .get(input.username) as
        | {
            id: string;
            username: string;
            name: string;
            active: number;
            revision: number;
            createdAt: string;
            updatedAt: string;
          }
        | undefined;
      if (!row) throw new Error('Administrador inexistente.');
      runtime.database
        .transaction(() => {
          runtime.database
            .prepare(
              'UPDATE users SET password_hash=?,revision=revision+1,updated_at_utc=? WHERE id=?',
            )
            .run(hashPassword(input.password), new Date().toISOString(), row.id);
          runtime.database.prepare('DELETE FROM auth_sessions').run();
          recordAudit(
            runtime.database,
            { ...row, role: 'ADMIN', active: Boolean(row.active), revision: row.revision + 1 },
            'auth.adminPrivateRecovery',
            row.id,
          );
        })
        .immediate();
      console.log('Acceso de administrador recuperado; sesiones revocadas.');
    } else if (command === 'backup:create')
      console.log(JSON.stringify(await runtime.backups.create()));
    else throw new Error('Comando desconocido.');
  } finally {
    runtime.close();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Operación fallida.');
  process.exitCode = 1;
});
