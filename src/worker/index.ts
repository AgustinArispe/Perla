import { parentPort, workerData } from 'node:worker_threads';
import { openDatabase } from './db/connection';

if (!parentPort) throw new Error('El proceso SQL debe iniciarse como worker.');
const data = workerData as { databasePath: string };
try {
  const database = openDatabase(data.databasePath);
  const schema = database
    .prepare('SELECT MAX(version) AS version FROM schema_migrations')
    .get() as { version: number };
  const sqlite = database.prepare('SELECT sqlite_version() AS version').get() as {
    version: string;
  };
  parentPort.postMessage({
    database: 'ready',
    schemaVersion: schema.version,
    sqliteVersion: sqlite.version,
  });
  // Keep the connection owned by this worker, not Electron's UI/main threads.
  parentPort.on('message', (message: unknown) => {
    if (message === 'close') {
      database.close();
      parentPort?.close();
    }
  });
} catch (error) {
  console.error('No se pudo iniciar SQLite:', error);
  throw error;
}
