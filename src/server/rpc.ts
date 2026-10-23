import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import type { Executor, RuntimeOptions } from './runtime';
import type { Result } from '../shared/contracts';
export class WebWorkerClient implements Executor {
  private worker: Worker;
  private pending = new Map<
    string,
    { resolve: (r: Result<unknown>) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private healthy = false;
  private resolveFailure!: () => void;
  readonly failure = new Promise<void>((resolve) => {
    this.resolveFailure = resolve;
  });
  readonly ready: Promise<void>;
  constructor(path: string, options: RuntimeOptions) {
    this.worker = new Worker(path, {
      workerData: { ...options, backupKey: options.backupKey.toString('hex') },
    });
    this.ready = new Promise((resolve, reject) => {
      this.worker.on('message', (m) => {
        if (m.ready) {
          this.healthy = true;
          resolve();
          return;
        }
        const entry = this.pending.get(m.id);
        if (entry) {
          clearTimeout(entry.timer);
          this.pending.delete(m.id);
          if (m.result?.ok && m.result.value instanceof Uint8Array)
            m.result.value = Buffer.from(m.result.value);
          entry.resolve(m.result);
        }
      });
      this.worker.on('error', (error) => {
        console.error('Falló el worker de datos durante el arranque:', error);
        this.fail();
        reject(new Error('No se pudo iniciar la base de datos.'));
      });
      this.worker.on('exit', () => {
        this.fail();
        reject(new Error('El servicio de datos se cerró antes de completar el arranque.'));
      });
    });
  }
  private fail() {
    this.healthy = false;
    this.resolveFailure();
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.resolve({
        ok: false,
        error: {
          code: 'DB_BUSY',
          message:
            'El servicio de datos no está disponible. Verificá el estado de la operación antes de reintentar.',
          retryable: true,
        },
      });
    }
    this.pending.clear();
  }
  request(operation: string, payload: unknown, token: string | null): Promise<Result<unknown>> {
    if (!this.healthy || this.pending.size >= 64)
      return Promise.resolve({
        ok: false,
        error: {
          code: 'DB_BUSY',
          message: 'El servicio está ocupado. Volvé a intentar.',
          retryable: true,
        },
      });
    return new Promise((resolve) => {
      const id = randomUUID();
      const timer = setTimeout(() => {
        // Keep the slot until the worker replies: a timeout does not cancel a SQL operation.
        resolve({
          ok: false,
          error: {
            code: 'DB_BUSY',
            message:
              'No se recibió la confirmación. Consultá la operación por su clave antes de reintentar.',
            retryable: true,
          },
        });
      }, 60000);
      this.pending.set(id, { resolve, timer });
      this.worker.postMessage({
        id,
        operation,
        payload: Buffer.isBuffer(payload) ? Buffer.from(payload) : payload,
        token,
      });
    });
  }
  async close() {
    if (this.healthy) await this.request('internal.shutdown', null, null);
    await this.worker.terminate();
    this.fail();
  }
}
