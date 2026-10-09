import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const config = JSON.parse(await readFile(resolve('.data/market-demo.json'), 'utf8'));
const server = spawn(process.execPath, ['dist/api/index.cjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    BOCHA_PUBLIC_ORIGIN: 'http://localhost:3087',
    BOCHA_HOST: '127.0.0.1',
    BOCHA_PORT: '3087',
    BOCHA_DATABASE_PATH: config.databasePath,
    BOCHA_BACKUP_DIRECTORY: config.backupDirectory,
    BOCHA_BACKUP_KEY: config.backupKey,
  },
});
console.log('Mercado de prueba: http://localhost:3087');
const stop = () => server.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
