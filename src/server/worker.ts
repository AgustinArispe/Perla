import { parentPort, workerData } from 'node:worker_threads';
import { ServerRuntime, type RuntimeOptions } from './runtime';
const runtime = new ServerRuntime({
  ...(workerData as RuntimeOptions),
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
  chain = chain.then(async () => {
    try {
      await runtime.backups.ensureDaily();
    } catch {
      console.error('No se pudo completar el backup diario.');
    }
  });
}, 3600000);
chain = chain.then(async () => {
  await runtime.backups.ensureDaily();
  parentPort!.postMessage({ ready: true });
});
