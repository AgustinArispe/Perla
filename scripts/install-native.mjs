import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';

const db = new Database(':memory:');
const version = db.prepare('SELECT sqlite_version() AS version').get();
db.close();
console.log('SQLite comprobado en Node:', version);

// better-sqlite3 >=13 ships Node-API binaries shared by Node and Electron.
// Do not rebuild these with older ABI-based tooling.
if (process.env.BOCHA_SKIP_ELECTRON_CHECK !== '1') {
  const require = createRequire(import.meta.url);
  const result = spawnSync(
    require('electron'),
    [
      '-e',
      "const DB=require('better-sqlite3');const d=new DB(':memory:');console.log('SQLite comprobado en Electron:',d.prepare('SELECT sqlite_version() AS version').get());d.close()",
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
