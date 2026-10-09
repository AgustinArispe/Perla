import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createServer } from '../../src/server/app';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';

it('la web ignora una ubicación manipulada y usa la asignada a la terminal', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'perla-location-web-'));
  const runtime = new ServerRuntime({
    databasePath: join(directory, 'pos.sqlite'),
    backupDirectory: join(directory, 'backups'),
    backupKey: randomBytes(32),
    appVersion: '0.1.0',
  });
  const password = 'Prueba-Ubicaciones-2026!';
  new AuthService(runtime.database).bootstrap({ username: 'jefe', name: 'Dueña', password });
  runtime.database
    .prepare(
      "UPDATE business_features SET enabled=1 WHERE feature_key IN ('STOCK_CONTROL','LOCATIONS_TRANSFERS')",
    )
    .run();
  const app = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    runtime,
  );

  try {
    const base = { host: 'pos.test', origin: 'http://pos.test' };
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: base,
      payload: { username: 'jefe', password },
    });
    expect(login.statusCode).toBe(200);
    const headers = {
      ...base,
      cookie: (login.headers['set-cookie'] as string).split(';')[0]!,
      'x-csrf-token': login.json().value.csrfToken as string,
    };
    const call = async (method: 'GET' | 'POST', url: string, payload?: object) => {
      const response = await app.inject({
        method,
        url: `/api/v1/${url}`,
        headers,
        ...(payload ? { payload } : {}),
      });
      expect(response.statusCode, response.body).toBe(200);
      return response.json().value;
    };

    const [main] = (await call('GET', 'locations')) as Array<{ id: string }>;
    const inventory = await call('GET', `locations/inventory?locationId=${main!.id}&query=&limit=20&offset=0`);
    expect(inventory.total).toBe(0);
    const branch = await call('POST', 'locations', {
      name: 'Puesto puerto',
      code: 'PUERTO',
      active: true,
    });
    const terminal = await call('POST', 'terminals', { name: 'Caja puerto', active: true });
    await call('POST', 'locations/terminal', {
      terminalId: terminal.id,
      locationId: branch.id,
    });
    await call('POST', 'auth/terminal', { terminalId: terminal.id });
    await call('POST', 'cash/open', {
      terminalId: terminal.id,
      openingCashCents: 0,
      operationKey: randomUUID(),
    });
    const product = await call('POST', 'products', {
      sku: 'AISLADO-01',
      barcode: '7790000000094',
      name: 'Filet de prueba',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 15_000,
      active: true,
      trackStock: true,
      minStockBase: 1,
    });
    const opening = await call('POST', 'stock/opening', {
      productId: product.id,
      countedBase: 10,
      reason: 'Carga inicial',
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: product.revision,
    });
    const transfer = await call('POST', 'transfers', {
      operationKey: randomUUID(),
      fromLocationId: main!.id,
      toLocationId: branch.id,
      note: '',
      items: [{ productId: product.id, quantityBase: 4 }],
    });
    await call('POST', 'transfers/receive', {
      transferId: transfer.id,
      operationKey: randomUUID(),
      items: [{ productId: product.id, receivedBase: 4 }],
    });

    const sale = await call('POST', 'sales', {
      checkoutKey: randomUUID(),
      locationId: main!.id,
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 1,
          expectedProductRevision: opening.productRevision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'CASH', amountCents: product.priceCents }],
    });

    expect(
      runtime.database.prepare('SELECT location_id AS locationId FROM sales WHERE id=?').get(sale.id),
    ).toEqual({ locationId: branch.id });
    expect(
      runtime.database
        .prepare(
          'SELECT location_id AS locationId,quantity_base AS quantity FROM location_inventory_balances WHERE product_id=? ORDER BY location_id',
        )
        .all(product.id),
    ).toEqual(
      expect.arrayContaining([
        { locationId: main!.id, quantity: 6 },
        { locationId: branch.id, quantity: 3 },
      ]),
    );
  } finally {
    await app.close();
    runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
