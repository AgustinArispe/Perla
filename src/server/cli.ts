import { readFileSync, statSync } from 'node:fs';
import { readServerConfig } from './config';
import { ServerRuntime } from './runtime';
import { AuthService } from '../worker/auth/service';
import { hashPassword } from '../worker/auth/password';
import { recordAudit } from '../worker/auth/audit';
import { recoverDatabaseFromBackup } from './backups/service';
import { BootstrapSchema } from '../shared/auth';
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
    } else if (command === 'owner:recover') {
      if (!args.includes('--password-stdin'))
        throw new Error('Ingresá la contraseña por entrada estándar.');
      const input = BootstrapSchema.parse({
        username: arg('--username'),
        name: 'Recuperación',
        password: readFileSync(0, 'utf8').trim(),
      });
      const row = runtime.database
        .prepare("SELECT id FROM users WHERE username=? AND role='OWNER' AND active=1")
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
