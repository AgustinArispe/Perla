import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { z } from 'zod';
import { UserSchema } from '../shared/auth';
import { AppErrorSchema } from '../shared/contracts';
import type { Result, SystemStatus } from '../shared/contracts';
import { DomainError, failure } from '../shared/errors';

const StatusSchema = z.object({
  database: z.literal('ready'),
  schemaVersion: z.number().int(),
  sqliteVersion: z.string(),
});
type DatabaseStatus = z.infer<typeof StatusSchema>;
const ResponseSchema = z.object({
  type: z.enum(['ready', 'response']),
  id: z.uuid().optional(),
  result: z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value: z.unknown() }),
    z.object({ ok: z.literal(false), error: AppErrorSchema }),
  ]),
});
interface Pending {
  resolve: (result: Result<unknown>) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WorkerClient {
  private authChanging = false;
  private sessionToken: string | null = null;
  private worker: Worker | undefined;
  private status: DatabaseStatus | undefined;
  private starting: Promise<DatabaseStatus> | undefined;
  private reconnecting: Promise<Result<SystemStatus>> | undefined;
  private lastError: unknown = new DomainError(
    'INTERNAL',
    'La conexión con los datos no está disponible.',
    true,
  );
  private readonly pending = new Map<string, Pending>();
  constructor(
    private readonly script: string,
    private readonly databasePath: string,
    private readonly applicationVersion: string,
    private readonly environment: SystemStatus['environment'],
  ) {}
  start(): Promise<DatabaseStatus> {
    if (this.starting) return this.starting;
    this.status = undefined;
    this.starting = new Promise((resolve, reject) => {
      const worker = new Worker(this.script, { workerData: { databasePath: this.databasePath } });
      this.worker = worker;
      const timer = setTimeout(() => {
        reject(
          new DomainError(
            'INTERNAL',
            'Los datos no respondieron al iniciar. Podés reintentar la conexión.',
            true,
          ),
        );
      }, 15000);
      const fail = (error: unknown) => {
        if (this.worker !== worker) return;
        clearTimeout(timer);
        this.status = undefined;
        this.lastError = error;
        for (const request of this.pending.values()) {
          clearTimeout(request.timer);
          request.resolve(failure(error));
        }
        this.pending.clear();
        reject(error);
      };
      worker.on('error', fail);
      worker.on('exit', () =>
        fail(
          new DomainError(
            'INTERNAL',
            'Se interrumpió la conexión con los datos. Reintentá la conexión; no se confirmó la operación pendiente.',
            true,
          ),
        ),
      );
      worker.on('message', (message: unknown) => {
        try {
          const response = ResponseSchema.parse(message);
          if (response.type === 'ready') {
            clearTimeout(timer);
            if (!response.result.ok) {
              fail(
                new DomainError(
                  response.result.error.code,
                  response.result.error.message,
                  response.result.error.retryable,
                ),
              );
              return;
            }
            this.status = StatusSchema.parse(response.result.value);
            resolve(this.status);
          } else if (response.id) {
            const request = this.pending.get(response.id);
            if (request) {
              clearTimeout(request.timer);
              this.pending.delete(response.id);
              request.resolve(response.result);
            }
          }
        } catch (error) {
          fail(error);
        }
      });
    });
    void this.starting.catch((error: unknown) => {
      this.lastError = error;
    });
    return this.starting;
  }
  async health(): Promise<Result<SystemStatus>> {
    try {
      if (this.starting && !this.status) await this.starting;
      if (!this.status) throw this.lastError;
      return {
        ok: true,
        value: {
          ...this.status,
          applicationVersion: this.applicationVersion,
          environment: this.environment,
        },
      };
    } catch (error) {
      return failure(error);
    }
  }
  async call(operation: string, payload: unknown): Promise<Result<unknown>> {
    if (this.authChanging && operation !== 'auth.status')
      return failure(
        new DomainError('DB_BUSY', 'Se está cambiando la sesión. Esperá un momento.', true),
      );
    const changing = [
      'auth.login',
      'auth.bootstrap',
      'auth.logout',
      'auth.changePassword',
    ].includes(operation);
    if (!changing) return this.send(operation, payload);
    this.authChanging = true;
    try {
      return await this.send(operation, payload);
    } finally {
      this.authChanging = false;
    }
  }
  private async send(operation: string, payload: unknown): Promise<Result<unknown>> {
    if (this.reconnecting)
      return failure(
        new DomainError('DB_BUSY', 'Se está reconectando la base. Reintentá en un momento.', true),
      );
    const health = await this.health();
    if (!health.ok) return health;
    const id = randomUUID();
    const sentToken = this.sessionToken;
    const result = await new Promise<Result<unknown>>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(
          failure(
            new DomainError(
              'INTERNAL',
              'No se recibió confirmación. Conservá los datos y reintentá la operación; no asumas que se guardó.',
              true,
            ),
          ),
        );
      }, 15000);
      this.pending.set(id, { resolve, timer });
      try {
        this.worker!.postMessage({
          id,
          sessionToken: sentToken,
          request: { operation, payload },
        });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve(failure(error));
      }
    });
    if (result.ok && (operation === 'auth.login' || operation === 'auth.bootstrap')) {
      try {
        const grant = z
          .strictObject({ user: UserSchema, sessionToken: z.string().regex(/^[a-f0-9]{64}$/) })
          .parse(result.value);
        this.sessionToken = grant.sessionToken;
        return { ok: true, value: grant.user };
      } catch (error) {
        return failure(error);
      }
    }
    if (
      (result.ok && (operation === 'auth.logout' || operation === 'auth.changePassword')) ||
      (!result.ok &&
        result.error.code === 'UNAUTHENTICATED' &&
        !['auth.login', 'auth.bootstrap', 'auth.changePassword'].includes(operation))
    )
      if (this.sessionToken === sentToken) this.sessionToken = null;
    return result;
  }
  reconnect(): Promise<Result<SystemStatus>> {
    if (this.reconnecting) return this.reconnecting;
    if (this.pending.size)
      return Promise.resolve(
        failure(
          new DomainError(
            'DB_BUSY',
            'Hay una operación en curso. Esperá antes de reconectar.',
            true,
          ),
        ),
      );
    this.reconnecting = (async () => {
      await this.stop();
      this.starting = undefined;
      void this.start();
      return this.health();
    })().finally(() => {
      this.reconnecting = undefined;
    });
    return this.reconnecting;
  }
  async stop(): Promise<void> {
    const worker = this.worker;
    if (!worker) return;
    this.worker = undefined;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        void worker.terminate().then(() => resolve());
      }, 1500);
      worker.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      try {
        worker.postMessage('close');
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
    this.status = undefined;
  }
}
