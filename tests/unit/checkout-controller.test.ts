import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CheckoutController } from '../../src/renderer/features/checkout/controller';
import type { BochaApi } from '../../src/shared/contracts';
import type { Product, DraftRecord } from '../../src/shared/catalog';
it('rechaza cambio de unidad al actualizar un carrito por peso', async () => {
  const p: Product = {
    id: randomUUID(),
    sku: 'K',
    barcode: '001',
    name: 'Jamón',
    priceCents: 1000,
    saleUnit: 'KG',
    category: null,
    active: true,
    trackStock: false,
    minStockBase: 0,
    revision: 1,
    stockInitialized: false,
    createdAt: 'now',
    updatedAt: 'now',
  };
  const draft: DraftRecord = {
    revision: 1,
    updatedAt: 'now',
    body: {
      checkoutKey: randomUUID(),
      discount: { type: 'NONE' },
      lines: [
        {
          lineId: randomUUID(),
          productId: p.id,
          quantityBase: 500,
          expectedProductRevision: 1,
          expectedPriceCents: 1000,
          nameSnapshot: p.name,
          unitSnapshot: 'KG',
        },
      ],
    },
  };
  let current = p;
  const backend = {
    products: { get: async () => ({ ok: true, value: current }) },
    checkout: { getDraft: async () => ({ ok: true, value: draft }) },
  } as unknown as BochaApi;
  const controller = new CheckoutController(backend, randomUUID(), {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
  await controller.initialize();
  await controller.recover();
  current = { ...p, saleUnit: 'UNIT', revision: 2 };
  await expect(controller.refreshPrices()).rejects.toThrow('cambió de unidad');
  expect(controller.getSnapshot().body.lines[0]).toMatchObject({
    quantityBase: 500,
    unitSnapshot: 'KG',
  });
  controller.dispose();
});
it('consulta un cobro sin acuse antes de habilitar otra venta', async () => {
  const p: Product = {
    id: randomUUID(),
    sku: 'U',
    barcode: '001',
    name: 'Leche',
    priceCents: 1000,
    saleUnit: 'UNIT',
    category: null,
    active: true,
    trackStock: false,
    minStockBase: 0,
    revision: 1,
    stockInitialized: false,
    createdAt: 'now',
    updatedAt: 'now',
  };
  const draft: DraftRecord = {
    revision: 1,
    updatedAt: 'now',
    body: {
      checkoutKey: randomUUID(),
      discount: { type: 'NONE' },
      lines: [
        {
          lineId: randomUUID(),
          productId: p.id,
          quantityBase: 1,
          expectedProductRevision: 1,
          expectedPriceCents: 1000,
          nameSnapshot: p.name,
          unitSnapshot: 'UNIT',
        },
      ],
    },
  };
  let stored: string | null = null;
  let calls = 0;
  const sale = {
    id: randomUUID(),
    number: 1,
    totalCents: 1000,
  } as import('../../src/shared/sales').SaleDetail;
  const backend = {
    products: { get: async () => ({ ok: true, value: p }) },
    checkout: { getDraft: async () => ({ ok: true, value: draft }) },
    sales: {
      complete: async () => {
        expect(stored).not.toBeNull();
        calls++;
        return { ok: false, error: { code: 'INTERNAL', message: 'Sin acuse', retryable: true } };
      },
      findByCheckoutKey: async () => ({ ok: true, value: sale }),
    },
  } as unknown as BochaApi;
  const controller = new CheckoutController(backend, randomUUID(), {
    getItem: () => stored,
    setItem: (_key, value) => {
      stored = value;
    },
    removeItem: () => {
      stored = null;
    },
  });
  await controller.initialize();
  await controller.recover();
  await controller.openPayment();
  await controller.pay([{ method: 'CASH', amountCents: 1000, tenderedCents: 1000 }]);
  expect(controller.getSnapshot().mode).toBe('UNCERTAIN');
  await expect(controller.beforeLeave()).rejects.toThrow();
  await controller.checkPending();
  expect(controller.getSnapshot()).toMatchObject({
    mode: 'SCAN',
    lastSale: sale,
    pendingSale: null,
  });
  expect(stored).toBeNull();
  expect(calls).toBe(1);
  controller.dispose();
});
it('bloquea captura y consultas superpuestas al recuperar un cobro pendiente', async () => {
  const p: Product = {
    id: randomUUID(),
    sku: 'U',
    barcode: '001',
    name: 'Leche',
    priceCents: 1000,
    saleUnit: 'UNIT',
    category: null,
    active: true,
    trackStock: false,
    minStockBase: 0,
    revision: 1,
    stockInitialized: false,
    createdAt: 'now',
    updatedAt: 'now',
  };
  const draft: DraftRecord = {
    revision: 1,
    updatedAt: 'now',
    body: {
      checkoutKey: randomUUID(),
      discount: { type: 'NONE' },
      lines: [
        {
          lineId: randomUUID(),
          productId: p.id,
          quantityBase: 1,
          expectedProductRevision: 1,
          expectedPriceCents: 1000,
          nameSnapshot: p.name,
          unitSnapshot: 'UNIT',
        },
      ],
    },
  };
  let stored: string | null = JSON.stringify({
    ...draft.body,
    payments: [{ method: 'CASH', amountCents: 1000, tenderedCents: 1000 }],
    expectedDraftRevision: 1,
  });
  let lookup = 0;
  let wait = false;
  let release!: () => void;
  const backend = {
    products: {
      get: async () => {
        if (wait) await new Promise<void>((resolve) => (release = resolve));
        return { ok: true, value: p };
      },
    },
    checkout: { getDraft: async () => ({ ok: true, value: draft }) },
    sales: {
      findByCheckoutKey: async () => {
        lookup++;
        return { ok: true, value: null };
      },
    },
  } as unknown as BochaApi;
  const controller = new CheckoutController(backend, randomUUID(), {
    getItem: () => stored,
    setItem: (_key, value) => {
      stored = value;
    },
    removeItem: () => {
      stored = null;
    },
  });
  await controller.initialize();
  wait = true;
  const resume = controller.resumePending();
  await Promise.resolve();
  await Promise.resolve();
  expect(controller.getSnapshot().mode).toBe('BUSY');
  controller.scan('001');
  await controller.checkPending();
  expect(lookup).toBe(2);
  release();
  await resume;
  expect(controller.getSnapshot()).toMatchObject({ mode: 'SCAN', pendingScans: 0 });
  expect(controller.getSnapshot().body.lines).toHaveLength(1);
  controller.dispose();
});
