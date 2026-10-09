import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
import { WebWorkerClient } from '../../src/server/rpc';
import { createServer } from '../../src/server/app';
it('worker real: caja, kilos, venta concurrente idempotente, arqueo y restauración web', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-web-flow-')),
    options = {
      databasePath: join(directory, 'pos.sqlite'),
      backupDirectory: join(directory, 'backups'),
      backupKey: randomBytes(32),
      appVersion: '0.1.0',
    };
  const runtime = new ServerRuntime(options),
    password = 'Prueba-Web-Bocha-2026!';
  new AuthService(runtime.database).bootstrap({ username: 'jefe', name: 'Jefe', password });
  runtime.close();
  const rpc = new WebWorkerClient(resolve('dist/api/worker.cjs'), options);
  await rpc.ready;
  const app = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    rpc,
  );
  try {
    const base = { host: 'pos.test', origin: 'http://pos.test' },
      login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: base,
        payload: { username: 'jefe', password },
      });
    expect(login.statusCode).toBe(200);
    const headers = {
      ...base,
      cookie: (login.headers['set-cookie'] as string).split(';')[0]!,
      'x-csrf-token': login.json().value.csrfToken,
    };
    const call = async (method: 'POST' | 'PUT' | 'GET', url: string, payload?: unknown) => {
      const r = await app.inject({
        method,
        url: '/api/v1/' + url,
        headers,
        ...(payload === undefined ? {} : { payload: payload as object }),
      });
      expect(r.statusCode, r.body).toBe(200);
      return r.json().value;
    };
    const terminal = await call('POST', 'terminals', { name: 'Caja 1', active: true });
    await call('POST', 'auth/terminal', { terminalId: terminal.id });
    expect((await call('GET', 'auth/session')).terminalId).toBe(terminal.id);
    const shift = await call('POST', 'cash/open', {
      terminalId: terminal.id,
      openingCashCents: 1000,
      operationKey: randomUUID(),
    });
    const product = await call('POST', 'products', {
      sku: 'JAM',
      barcode: '00123456789',
      name: 'Jamón cocido',
      category: null,
      saleUnit: 'KG',
      priceCents: 1200000,
      active: true,
      trackStock: true,
      minStockBase: 500,
    });
    const stock = await call('POST', 'stock/opening', {
      productId: product.id,
      countedBase: 1000,
      reason: 'Carga inicial',
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: 1,
    });
    expect((await call('GET', 'barcodes/00123456789')).id).toBe(product.id);
    expect(
      await call('POST', 'checkout/calculate-weight', {
        productId: product.id,
        weight: '0,250',
        unit: 'KG',
      }),
    ).toMatchObject({ quantityBase: 250, totalCents: 300000 });
    const body = {
      checkoutKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 250,
          expectedProductRevision: stock.productRevision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
    };
    await call('PUT', 'checkout/draft', { body, expectedRevision: 0 });
    const input = {
      ...body,
      expectedDraftRevision: 1,
      payments: [{ method: 'CASH', amountCents: 300000, tenderedCents: 400000 }],
    };
    const replies = await Promise.all(
      Array.from({ length: 10 }, () => call('POST', 'sales', input)),
    );
    expect(new Set(replies.map((v) => v.id)).size).toBe(1);
    expect(replies[0]).toMatchObject({ terminalId: terminal.id, registerShiftId: shift.id });
    expect((await call('GET', 'stock/' + product.id)).quantityBase).toBe(750);
    const closed = await call('POST', 'cash/close', {
      shiftId: shift.id,
      countedCashCents: 301000,
      operationKey: randomUUID(),
    });
    expect(closed.expectedCashCents).toBe(301000);
    expect(closed.differenceCents).toBe(0);
    expect((await call('POST', 'sales', input)).id).toBe(replies[0].id);
    const refundShift = await call('POST', 'cash/open', {
      terminalId: terminal.id,
      openingCashCents: 400000,
      operationKey: randomUUID(),
    });
    const voidInput = {
      saleId: replies[0].id,
      operationKey: randomUUID(),
      reason: 'Reintegro de prueba',
    };
    await call('POST', 'sales/void', voidInput);
    await call('POST', 'sales/void', voidInput);
    expect((await call('GET', 'stock/' + product.id)).quantityBase).toBe(1000);
    const returnSale = await call('POST', 'sales', {
      checkoutKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 250,
          expectedProductRevision: stock.productRevision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'CASH', amountCents: 300000 }],
    });
    const returnPreview = await call('GET', `sales/${returnSale.id}/return-preview`);
    const returnInput = {
      saleId: returnSale.id,
      operationKey: randomUUID(),
      reason: 'Devolución parcial de prueba',
      refundMethod: 'CASH',
      items: [
        {
          saleItemId: returnPreview.items[0].saleItemId,
          quantityBase: 100,
          disposition: 'RESTOCK',
        },
      ],
    };
    const partial = await call('POST', 'sales/returns', returnInput);
    expect(partial.totalCents).toBe(120000);
    expect((await call('POST', 'sales/returns', returnInput)).id).toBe(partial.id);
    expect((await call('GET', `sales/${returnSale.id}/returns`))).toHaveLength(1);
    expect((await call('GET', 'stock/' + product.id)).quantityBase).toBe(850);
    const refundClosed = await call('POST', 'cash/close', {
      shiftId: refundShift.id,
      countedCashCents: 280000,
      operationKey: randomUUID(),
    });
    expect(refundClosed.expectedCashCents).toBe(280000);
    const backup = await call('POST', 'backups', {});
    const download = await app.inject({ url: `/api/v1/backups/${backup.id}/download`, headers });
    expect(download.statusCode).toBe(200);
    expect(download.rawPayload.subarray(0, 8).toString()).toBe('BOCHABK1');
    const uploaded = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/upload',
      headers: { ...headers, 'content-type': 'application/octet-stream' },
      payload: download.rawPayload,
    });
    expect(uploaded.statusCode, uploaded.body).toBe(200);
    const preview = await call('POST', `backups/${backup.id}/preview`, {});
    await call('POST', 'backups/restore', {
      previewToken: preview.previewToken,
      currentPassword: password,
    });
    expect((await app.inject({ url: '/api/v1/products', headers })).statusCode).toBe(401);
  } finally {
    await app.close();
    await rpc.close();
    rmSync(directory, { recursive: true, force: true });
  }
}, 20000);
it('sesiones web refrescan actividad, vencen inactivas y revocan otro ingreso', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-session-')),
    runtime = new ServerRuntime({
      databasePath: join(directory, 'db.sqlite'),
      backupDirectory: join(directory, 'bk'),
      backupKey: randomBytes(32),
      appVersion: 'test',
    });
  try {
    const auth = new AuthService(runtime.database, { idleTimeoutMs: 1800000, singleSession: true }),
      credentials = { username: 'owner', password: 'Prueba-Web-Bocha-2026!' },
      grant = auth.bootstrap({ ...credentials, name: 'Owner' }),
      hash = createHash('sha256').update(grant.sessionToken).digest('hex');
    runtime.database
      .prepare('UPDATE auth_sessions SET last_seen_ms=? WHERE token_hash=?')
      .run(Date.now() - 1200000, hash);
    auth.requireUser(grant.sessionToken);
    expect(
      (
        runtime.database.prepare('SELECT last_seen_ms FROM auth_sessions').get() as {
          last_seen_ms: number;
        }
      ).last_seen_ms,
    ).toBeGreaterThan(Date.now() - 1000);
    runtime.database.prepare('UPDATE auth_sessions SET last_seen_ms=?').run(Date.now() - 1800001);
    expect(() => auth.requireUser(grant.sessionToken)).toThrow('venció');
    expect(runtime.database.prepare('SELECT 1 FROM auth_sessions').get()).toBeUndefined();
    const first = auth.login(credentials),
      second = auth.login(credentials);
    expect(() => auth.requireUser(first.sessionToken)).toThrow();
    expect(auth.requireUser(second.sessionToken).id).toBe(first.user.id);
  } finally {
    runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
