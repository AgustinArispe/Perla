import { join } from 'node:path';
import { readServerConfig } from './config';
import { WebWorkerClient } from './rpc';
import { createServer } from './app';
import { registerFrontend } from './frontend';
async function main() {
  const config = readServerConfig();
  const executor = new WebWorkerClient(join(__dirname, 'worker.cjs'), config);
  let app: Awaited<ReturnType<typeof createServer>>;
  try {
    await executor.ready;
    app = await createServer(config, executor);
    registerFrontend(app, join(__dirname, '..', 'web'));
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    await executor.close();
    throw error;
  }
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await app.close();
    await executor.close();
  };
  process.on('SIGTERM', () => {
    void stop();
  });
  process.on('SIGINT', () => {
    void stop();
  });
  void executor.failure.then(async () => {
    if (!stopping) {
      await stop();
      process.exitCode = 1;
    }
  });
}
main().catch(() => {
  console.error('No se pudo iniciar El Bocha. Revisá la configuración y la base de datos.');
  process.exitCode = 1;
});
