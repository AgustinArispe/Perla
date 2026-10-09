import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { createServer } from '../../src/server/app';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';

const password = 'Prueba-Perla-2026!';

test('API web expone proveedores y recepción sólo con función y rol autorizados', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'perla-purchases-api-'));
  const runtime = new ServerRuntime({
    databasePath: join(directory, 'perla.sqlite'),
    backupDirectory: join(directory, 'backups'),
    backupKey: randomBytes(32),
    appVersion: '0.1.0',
  });
  new AuthService(runtime.database).bootstrap({ username: 'jefe', name: 'Dueña', password });
  const app = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    runtime,
  );
  const base = { host: 'pos.test', origin: 'http://pos.test' };
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: base,
      payload: { username: 'jefe', password },
    });
    const headers = {
      ...base,
      cookie: (login.headers['set-cookie'] as string).split(';')[0]!,
      'x-csrf-token': login.json().value.csrfToken as string,
    };
    expect((await app.inject({ url: '/api/v1/suppliers?limit=20', headers })).statusCode).toBe(403);
    const features = await app.inject({ url: '/api/v1/settings/features', headers });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/features',
      headers,
      payload: {
        expectedRevision: features.json().value.revision,
        enabled: {
          SUPPLIERS_PURCHASES: true,
          SUPPLIER_ACCOUNTS: true,
          STOCK_CONTROL: false,
        },
      },
    });
    const supplierResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      headers,
      payload: { name: 'Puerto Fresco' },
    });
    expect(supplierResponse.statusCode).toBe(200);
    const supplier = supplierResponse.json().value as { id: string };
    expect(
      (await app.inject({ url: '/api/v1/suppliers?limit=20', headers })).json().value.total,
    ).toBe(1);
    const productResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers,
      payload: {
        sku: 'API-ATUN',
        barcode: null,
        name: 'Atún',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 20000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
    });
    const product = productResponse.json().value as { id: string; revision: number };
    const receiptKey = randomUUID();
    const received = await app.inject({
      method: 'POST',
      url: '/api/v1/purchases',
      headers,
      payload: {
        receiptKey,
        supplierId: supplier.id,
        businessDate: '2026-10-02',
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: 2,
            unitCostCents: 10000,
            expectedProductRevision: product.revision,
          },
        ],
      },
    });
    expect(received.statusCode).toBe(200);
    expect(received.json().value).toMatchObject({
      supplierName: 'Puerto Fresco',
      totalCents: 20000,
    });
    expect(
      (await app.inject({ url: `/api/v1/purchases/by-key/${receiptKey}`, headers })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ url: '/api/v1/purchases?limit=20', headers })).json().value.total,
    ).toBe(1);
    expect(
      (await app.inject({ url: `/api/v1/suppliers/${supplier.id}/account`, headers })).json().value
        .balanceCents,
    ).toBe(20000);
    const payment = await app.inject({
      method: 'POST',
      url: '/api/v1/supplier-payments',
      headers,
      payload: {
        operationKey: randomUUID(),
        supplierId: supplier.id,
        amountCents: 5000,
        businessDate: '2026-10-03',
        method: 'TRANSFER',
      },
    });
    expect(payment.statusCode).toBe(200);
    expect(
      (await app.inject({ url: `/api/v1/suppliers/${supplier.id}/account`, headers })).json().value
        .balanceCents,
    ).toBe(15000);
  } finally {
    await app.close();
    runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
