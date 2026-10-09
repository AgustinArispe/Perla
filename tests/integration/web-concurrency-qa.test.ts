import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createServer } from '../../src/server/app';
import { ServerRuntime } from '../../src/server/runtime';
import { WebWorkerClient } from '../../src/server/rpc';
import { AuthService } from '../../src/worker/auth/service';
import type { Product } from '../../src/shared/catalog';

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'perla-concurrency-qa-'));
  const options = {
    databasePath: join(directory, 'pos.sqlite'),
    backupDirectory: join(directory, 'backups'),
    backupKey: randomBytes(32),
    appVersion: 'test',
  };
  const runtime = new ServerRuntime(options);
  new AuthService(runtime.database).bootstrap({
    username: 'jefe',
    name: 'Dueña',
    password: 'Prueba-Perla-2026!',
  });
  runtime.close();
  const rpc = new WebWorkerClient(resolve('dist/api/worker.cjs'), options);
  await rpc.ready;
  const app = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    rpc,
  );
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    headers: { host: 'pos.test', origin: 'http://pos.test' },
    payload: { username: 'jefe', password: 'Prueba-Perla-2026!' },
  });
  expect(login.statusCode).toBe(200);
  const headers = {
    host: 'pos.test',
    origin: 'http://pos.test',
    cookie: (login.headers['set-cookie'] as string).split(';')[0]!,
    'x-csrf-token': login.json().value.csrfToken as string,
  };
  const request = (url: string, payload?: object, method: 'GET' | 'POST' | 'PUT' = 'POST') =>
    app.inject({ method, url: '/api/v1/' + url, headers, ...(payload ? { payload } : {}) });
  const call = async (url: string, payload?: object, method: 'GET' | 'POST' | 'PUT' = 'POST') => {
    const response = await request(url, payload, method);
    expect(response.statusCode, response.body).toBe(200);
    return response.json().value;
  };
  const terminal = await call('terminals', { name: 'Caja QA', active: true });
  await call('auth/terminal', { terminalId: terminal.id });
  const shift = await call('cash/open', {
    terminalId: terminal.id,
    openingCashCents: 10000,
    operationKey: randomUUID(),
  });
  const flags = await call('settings/features', undefined, 'GET');
  await call(
    'settings/features',
    {
      expectedRevision: flags.revision,
      enabled: { STOCK_CONTROL: true, RETURNS: true },
    },
    'PUT',
  );
  const product: Product = await call('products', {
    sku: 'QA',
    barcode: '000123456789',
    name: 'Última unidad',
    category: null,
    saleUnit: 'UNIT',
    priceCents: 1000,
    active: true,
    trackStock: true,
    minStockBase: 0,
  });
  const stock = await call('stock/opening', {
    productId: product.id,
    countedBase: 1,
    expectedRevision: 0,
    expectedProductRevision: product.revision,
    reason: 'Última unidad',
    operationKey: randomUUID(),
  });
  const body = () => ({
    checkoutKey: randomUUID(),
    lines: [
      {
        lineId: randomUUID(),
        productId: product.id,
        quantityBase: 1,
        expectedProductRevision: stock.productRevision,
        expectedPriceCents: 1000,
      },
    ],
    discount: { type: 'NONE' },
  });
  return {
    call,
    request,
    product,
    shift,
    body,
    async close() {
      await app.close();
      await rpc.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

it('HTTP concurrente: dos ventas distintas de la última unidad guardan solo una y un ingreso', async () => {
  const f = await fixture();
  try {
    const inputs = [f.body(), f.body()].map((body) => ({
      ...body,
      payments: [{ method: 'CASH', amountCents: 1000 }],
    }));
    const responses = await Promise.all(inputs.map((input) => f.request('sales', input)));
    expect(responses.filter((response) => response.statusCode === 200)).toHaveLength(1);
    expect(responses.filter((response) => !response.json().ok)).toHaveLength(1);
    expect((await f.call('stock/' + f.product.id, undefined, 'GET')).quantityBase).toBe(0);
    const stored = await Promise.all(
      inputs.map((input) => f.call('sales/by-key/' + input.checkoutKey, undefined, 'GET')),
    );
    expect(stored.filter(Boolean)).toHaveLength(1);
    const closed = await f.call('cash/close', {
      shiftId: f.shift.id,
      countedCashCents: 11000,
      operationKey: randomUUID(),
    });
    expect(closed).toMatchObject({ expectedCashCents: 11000, differenceCents: 0 });
  } finally {
    await f.close();
  }
});

it('HTTP concurrente: editar el mismo producto con una revisión no sobreescribe la primera edición', async () => {
  const f = await fixture();
  try {
    const current: Product = await f.call('products/' + f.product.id, undefined, 'GET');
    const changes = [2000, 3000].map((priceCents) => ({
      id: current.id,
      expectedRevision: current.revision,
      sku: current.sku,
      barcode: current.barcode,
      name: current.name,
      category: current.category,
      saleUnit: current.saleUnit,
      active: true,
      trackStock: true,
      minStockBase: 0,
      priceCents,
    }));
    const responses = await Promise.all(changes.map((change) => f.request('products', change)));
    const winner = responses.find((response) => response.json().ok)!;
    expect(responses.filter((response) => response.json().ok)).toHaveLength(1);
    expect(responses.find((response) => !response.json().ok)!.json().error.code).toBe(
      'REVISION_CONFLICT',
    );
    expect(await f.call('products/' + current.id, undefined, 'GET')).toMatchObject({
      priceCents: winner.json().value.priceCents,
      revision: current.revision + 1,
    });
  } finally {
    await f.close();
  }
});

it('HTTP concurrente: dos guardados de borrador con revisión cero conservan un único carrito', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all(
      [f.body(), f.body()].map((body) =>
        f.request('checkout/draft', { body, expectedRevision: 0 }, 'PUT'),
      ),
    );
    expect(responses.filter((response) => response.json().ok)).toHaveLength(1);
    expect(responses.find((response) => !response.json().ok)!.json().error.code).toBe(
      'REVISION_CONFLICT',
    );
    const winner = responses.find((response) => response.json().ok)!.json().value;
    expect(await f.call('checkout/draft', undefined, 'GET')).toEqual(winner);
    expect((await f.call('stock/' + f.product.id, undefined, 'GET')).quantityBase).toBe(1);
  } finally {
    await f.close();
  }
});

it('HTTP concurrente: dos devoluciones diferentes de la misma unidad reintegran una sola vez', async () => {
  const f = await fixture();
  try {
    const sale = await f.call('sales', {
      ...f.body(),
      payments: [{ method: 'CASH', amountCents: 1000 }],
    });
    const inputs = [randomUUID(), randomUUID()].map((operationKey) => ({
      saleId: sale.id,
      operationKey,
      reason: 'Devolución de la única unidad',
      refundMethod: 'CASH',
      items: [{ saleItemId: sale.items[0].id, quantityBase: 1, disposition: 'RESTOCK' }],
    }));
    const responses = await Promise.all(inputs.map((input) => f.request('sales/returns', input)));
    expect(responses.filter((response) => response.json().ok)).toHaveLength(1);
    expect(await f.call('sales/' + sale.id + '/returns', undefined, 'GET')).toHaveLength(1);
    expect((await f.call('stock/' + f.product.id, undefined, 'GET')).quantityBase).toBe(1);
    expect(
      await f.call('cash/close', {
        shiftId: f.shift.id,
        countedCashCents: 10000,
        operationKey: randomUUID(),
      }),
    ).toMatchObject({ expectedCashCents: 10000, differenceCents: 0 });
  } finally {
    await f.close();
  }
});

it('HTTP concurrente: un código de barras no puede identificar dos productos nuevos', async () => {
  const f = await fixture();
  try {
    const inputs = ['A', 'B'].map((suffix) => ({
      sku: 'NUEVO-' + suffix,
      barcode: '000999888777',
      name: 'Nuevo ' + suffix,
      category: null,
      saleUnit: 'UNIT',
      priceCents: 2000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    }));
    const responses = await Promise.all(inputs.map((input) => f.request('products', input)));
    expect(responses.filter((response) => response.json().ok)).toHaveLength(1);
    expect(responses.find((response) => !response.json().ok)!.json().error.code).toBe('VALIDATION');
    const winner = responses.find((response) => response.json().ok)!.json().value;
    expect(await f.call('barcodes/000999888777', undefined, 'GET')).toMatchObject({
      id: winner.id,
    });
    const list = await f.call('products?query=Nuevo&limit=30', undefined, 'GET');
    expect(list.items).toHaveLength(1);
    expect(list.items[0].id).toBe(winner.id);
  } finally {
    await f.close();
  }
});

it.each(['venta primero', 'cierre primero'])(
  'HTTP concurrente: venta y cierre simultáneos mantienen arqueo y stock coherentes (%s)',
  async (order) => {
    const f = await fixture();
    try {
      const input = { ...f.body(), payments: [{ method: 'CASH', amountCents: 1000 }] };
      const sell = () => f.request('sales', input);
      const close = () =>
        f.request('cash/close', {
          shiftId: f.shift.id,
          countedCashCents: 10000,
          operationKey: randomUUID(),
        });
      const replies = await Promise.all(
        order === 'venta primero' ? [sell(), close()] : [close(), sell()],
      );
      const [saleResponse, closeResponse] =
        order === 'venta primero' ? replies : [replies[1]!, replies[0]!];
      expect(closeResponse!.statusCode, closeResponse!.body).toBe(200);
      const stored = await f.call('sales/by-key/' + input.checkoutKey, undefined, 'GET');
      const stock = await f.call('stock/' + f.product.id, undefined, 'GET');
      if (saleResponse!.json().ok) {
        expect(stored.id).toBe(saleResponse!.json().value.id);
        expect(stock.quantityBase).toBe(0);
        expect(closeResponse!.json().value).toMatchObject({
          expectedCashCents: 11000,
          differenceCents: -1000,
        });
      } else {
        expect(stored).toBeNull();
        expect(stock.quantityBase).toBe(1);
        expect(closeResponse!.json().value).toMatchObject({
          expectedCashCents: 10000,
          differenceCents: 0,
        });
      }
      const afterClosure = await f.request('sales', { ...input, checkoutKey: randomUUID() });
      expect(afterClosure.json().ok).toBe(false);
      expect((await f.call('stock/' + f.product.id, undefined, 'GET')).quantityBase).toBe(
        stock.quantityBase,
      );
    } finally {
      await f.close();
    }
  },
);
