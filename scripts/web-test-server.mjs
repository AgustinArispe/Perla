import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const directory = mkdtempSync(join(tmpdir(), 'bocha-web-ui-'));
const port = process.env.BOCHA_WEB_TEST_PORT ?? '3087';
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
  throw new Error('Puerto de prueba inválido.');
const env = {
  ...process.env,
  NODE_ENV: 'test',
  BOCHA_PUBLIC_ORIGIN: `http://localhost:${port}`,
  BOCHA_HOST: '127.0.0.1',
  BOCHA_PORT: port,
  BOCHA_DATABASE_PATH: join(directory, 'bocha.sqlite'),
  BOCHA_BACKUP_DIRECTORY: join(directory, 'backups'),
  BOCHA_BACKUP_KEY: randomBytes(32).toString('hex'),
};
const cli = spawn(
  process.execPath,
  [
    'dist/api/cli.cjs',
    'owner:create',
    '--username',
    'jefe',
    '--name',
    'Perla Negra',
    '--password-stdin',
  ],
  { env, stdio: ['pipe', 'ignore', 'inherit'] },
);
cli.stdin.end('Prueba-Web-Bocha-2026!\n');
await new Promise((resolve, reject) =>
  cli.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('Fixture no inicializada')))),
);
const server = spawn(process.execPath, ['dist/api/index.cjs'], {
  env,
  stdio: ['ignore', 'ignore', 'inherit'],
});
const stop = () => server.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
