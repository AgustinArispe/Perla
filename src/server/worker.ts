import { parentPort, workerData } from 'node:worker_threads';
import { ServerRuntime, type RuntimeOptions } from './runtime';
import type { ScheduledBackupPolicy } from './backups/service';
const options = workerData as RuntimeOptions & { autoBackup?: ScheduledBackupPolicy };
const runtime = new ServerRuntime({
  ...options,
  backupKey: Buffer.from(workerData.backupKey as string, 'hex'),
});
let chain = Promise.resolve();
parentPort!.on(
  'message',
  (m: { id: string; operation: string; payload: unknown; token: string | null }) => {
    chain = chain.then(async () => {
      if (m.operation === 'internal.shutdown') {
        runtime.close();
        parentPort!.postMessage({ id: m.id, result: { ok: true, value: null } });
        clearInterval(timer);
        parentPort!.close();
        return;
      }
      const result = await runtime.request(m.operation, m.payload, m.token);
      parentPort!.postMessage({ id: m.id, result });
    });
  },
);
const timer = setInterval(() => {
  chain = chain.then(ensureScheduled);
}, 60000);
async function ensureScheduled() {
  try {
    await runtime.backups.ensureScheduled(options.autoBackup);
  } catch {
    console.error('No se pudo completar el backup semanal.');
  }
}
chain = chain.then(async () => {
  await ensureScheduled();
  parentPort!.postMessage({ ready: true });
});
