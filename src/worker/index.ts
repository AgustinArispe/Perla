import { parentPort, workerData } from 'node:worker_threads';
import { z } from 'zod';
import { openDatabase } from './db/connection';
import { AuthService } from './auth/service';
import { Application } from './application';
import { failure } from '../shared/errors';
const port = parentPort;
if (!port) throw new Error('El proceso SQL debe iniciarse como worker.');
const data = z.strictObject({ databasePath: z.string() }).parse(workerData);
try {
  const database = openDatabase(data.databasePath);
  const app = new Application(database, new AuthService(database));
  const schema = database
    .prepare('SELECT MAX(version) AS version FROM schema_migrations')
    .get() as { version: number };
  const sqlite = database.prepare('SELECT sqlite_version() AS version').get() as {
    version: string;
  };
  port.postMessage({
    type: 'ready',
    result: {
      ok: true,
      value: { database: 'ready', schemaVersion: schema.version, sqliteVersion: sqlite.version },
    },
  });
  port.on('message', (message: unknown) => {
    if (message === 'close') {
      database.close();
      port.close();
      return;
    }
    let id: string | undefined;
    try {
      const envelope = z
        .strictObject({
          id: z.uuid(),
          sessionToken: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .nullable(),
          request: z.strictObject({ operation: z.string(), payload: z.unknown() }),
        })
        .parse(message);
      id = envelope.id;
      const value = app.dispatch(
        envelope.request.operation,
        envelope.request.payload,
        envelope.sessionToken,
      );
      port.postMessage({ type: 'response', id, result: { ok: true, value } });
    } catch (error) {
      if (id) port.postMessage({ type: 'response', id, result: failure(error) });
    }
  });
} catch (error) {
  console.error('No se pudo iniciar SQLite:', error);
  port.postMessage({ type: 'ready', result: failure(error) });
  port.close();
}
