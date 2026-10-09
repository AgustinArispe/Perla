import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const executable = resolve('release/win-unpacked/Perla Negra POS.exe');
if (process.platform !== 'win32' || !existsSync(executable)) {
  console.error('Primero ejecutá npm run pack:win en Windows.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
  stdio: 'inherit',
  env: { ...process.env, BOCHA_E2E_EXECUTABLE: executable },
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
