import { spawnSync } from 'node:child_process';
const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    ...process.argv.slice(2),
    ...(process.argv.includes('--watch') ? [] : ['run']),
  ],
  {
    stdio: 'inherit',
    env: process.env,
  },
);
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
