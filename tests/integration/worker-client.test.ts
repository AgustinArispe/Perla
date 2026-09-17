import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';
import { WorkerClient } from '../../src/main/worker-client';

it('agrupa reconexiones concurrentes en un único worker y rechaza operaciones durante el cambio', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-worker-client-'));
  const script = join(directory, 'worker.cjs');
  const log = join(directory, 'starts.txt');
  writeFileSync(
    script,
    `
    const { parentPort, workerData } = require('node:worker_threads');
    require('node:fs').appendFileSync(workerData.databasePath, 'start\\n');
    setTimeout(() => parentPort.postMessage({ type: 'ready', result: { ok: true, value: { database: 'ready', schemaVersion: 2, sqliteVersion: 'test' } } }), 30);
    parentPort.on('message', message => {
      if (message === 'close') { setTimeout(() => parentPort.close(), 30); return; }
      parentPort.postMessage({ type: 'response', id: message.id, result: { ok: true, value: 'answered' } });
    });
  `,
  );
  const client = new WorkerClient(script, log, 'test', 'test');
  try {
    await client.start();
    const first = client.reconnect();
    const second = client.reconnect();
    expect(second).toBe(first);
    const blocked = await client.call('system.health', null);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('DB_BUSY');
    expect((await Promise.all([first, second])).every((result) => result.ok)).toBe(true);
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(2);
    expect(await client.call('system.health', null)).toEqual({ ok: true, value: 'answered' });
  } finally {
    await client.stop();
    rmSync(directory, { recursive: true, force: true });
  }
});
