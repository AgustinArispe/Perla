import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createServer } from '../../src/server/app';
import { WebWorkerClient } from '../../src/server/rpc';

it('un fallo inesperado devuelve 500 sin filtrar detalles internos', async () => {
  const app = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    {
      request: async () => {
        throw new Error('private-database-path-and-secret');
      },
    },
  );
  try {
    const response = await app.inject({ url: '/api/v1/products', headers: { host: 'pos.test' } });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL', retryable: true },
    });
    expect(response.body).not.toContain('private-database-path-and-secret');
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});

it('JSON inválido y tipo de contenido no admitido conservan errores de cliente', async () => {
  const app = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    {
      request: async () => {
        throw new Error('No debe ejecutarse');
      },
    },
  );
  try {
    for (const [contentType, payload, status] of [
      ['application/json', '{', 400],
      ['application/unknown', 'data', 415],
    ] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { host: 'pos.test', origin: 'http://pos.test', 'content-type': contentType },
        payload,
      });
      expect(response.statusCode).toBe(status);
      expect(response.json()).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION', retryable: false },
      });
    }
  } finally {
    await app.close();
  }
});

it('un worker que termina sin anunciar disponibilidad rechaza el arranque', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'perla-worker-exit-'));
  const script = join(directory, 'exit.cjs');
  writeFileSync(script, 'process.exit(0);');
  const client = new WebWorkerClient(script, {
    databasePath: join(directory, 'unused.sqlite'),
    backupDirectory: join(directory, 'backups'),
    backupKey: randomBytes(32),
    appVersion: 'test',
  });
  try {
    await expect(client.ready).rejects.toThrow('antes de completar el arranque');
    await expect(client.request('internal.health', null, null)).resolves.toMatchObject({
      ok: false,
      error: { code: 'DB_BUSY' },
    });
  } finally {
    await client.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
