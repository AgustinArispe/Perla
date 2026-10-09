import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
const productInput = {
  sku: 'FIAM',
  barcode: '0123456789012',
  name: 'Jamón cocido',
  category: null,
  saleUnit: 'KG' as const,
  priceCents: 1200000,
  active: true,
  trackStock: true,
  minStockBase: 500,
};
function fixture() {
  const db = openDatabase(':memory:');
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const drafts = new DraftRepository(db);
  const sales = new SalesService(db, catalog, stock, drafts);
  const product = catalog.save(productInput);
  const opened = stock.opening({
    productId: product.id,
    countedBase: 1000,
    reason: 'Conteo',
    operationKey: randomUUID(),
    expectedRevision: 0,
    expectedProductRevision: 1,
  });
  const body = {
    checkoutKey: randomUUID(),
    lines: [
      {
        lineId: randomUUID(),
        productId: product.id,
        quantityBase: 250,
        expectedProductRevision: opened.productRevision,
        expectedPriceCents: product.priceCents,
      },
    ],
    discount: { type: 'NONE' as const },
  };
  drafts.save({ body, expectedRevision: 0 });
  const input = {
    ...body,
    expectedDraftRevision: 1,
    payments: [{ method: 'CASH' as const, amountCents: 300000, tenderedCents: 400000 }],
  };
  return { db, catalog, stock, drafts, sales, product, input };
}
it('guarda snapshots, stock, vuelto y borrador juntos; 100 reintentos no duplican', () => {
  const f = fixture();
  try {
    const result = f.sales.complete(f.input);
    for (let i = 0; i < 100; i++) expect(f.sales.complete(f.input).id).toBe(result.id);
    expect(result.totalCents).toBe(300000);
    expect(result.payments[0]?.changeCents).toBe(100000);
    expect(f.stock.get(f.product.id).quantityBase).toBe(750);
    expect(f.drafts.get()).toBeNull();
    expect(() =>
      f.sales.complete({ ...f.input, payments: [{ method: 'DEBIT', amountCents: 300000 }] }),
    ).toThrow('identificador');
    const current = f.catalog.get(f.product.id);
    f.catalog.save({
      ...productInput,
      id: current.id,
      expectedRevision: current.revision,
      name: 'Otro nombre',
      priceCents: 1500000,
    });
    expect(f.sales.detail(result.id).items[0]?.name).toBe('Jamón cocido');
    expect(f.sales.detail(result.id).items[0]?.unitPriceCents).toBe(1200000);
    expect(f.sales.findByCheckoutKey(f.input.checkoutKey)?.id).toBe(result.id);
  } finally {
    f.db.close();
  }
});
it('confirma una venta rápida sin esperar el autosave del borrador y lo elimina en la misma transacción', () => {
  const f = fixture();
  try {
    const input = { ...f.input, expectedDraftRevision: undefined };
    const sale = f.sales.complete(input);
    expect(sale.totalCents).toBe(300000);
    expect(f.drafts.get()).toBeNull();
    expect(f.stock.get(f.product.id).quantityBase).toBe(750);
  } finally {
    f.db.close();
  }
});
it('fallo después de descontar stock revierte toda la venta y conserva el borrador', () => {
  const f = fixture();
  try {
    f.db.exec(
      "CREATE TRIGGER reject_complete BEFORE INSERT ON sale_events BEGIN SELECT RAISE(ABORT,'failure fixture'); END",
    );
    expect(() => f.sales.complete(f.input)).toThrow();
    for (const table of ['sales', 'sale_items', 'sale_payments'])
      expect(f.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({ count: 0 });
    expect(f.stock.get(f.product.id).quantityBase).toBe(1000);
    expect(f.stock.movements({ productId: f.product.id, limit: 20 }).total).toBe(1);
    expect(f.drafts.get()?.revision).toBe(1);
    f.db.exec('DROP TRIGGER reject_complete');
    expect(f.sales.complete(f.input).number).toBe(1);
  } finally {
    f.db.close();
  }
});
it('anula por movimientos originales aunque cambie tracking y sólo repone una vez', () => {
  const f = fixture();
  try {
    const sale = f.sales.complete(f.input);
    const current = f.catalog.get(f.product.id);
    f.catalog.save({
      ...productInput,
      id: current.id,
      expectedRevision: current.revision,
      active: false,
      trackStock: false,
    });
    const voidInput = { saleId: sale.id, operationKey: randomUUID(), reason: 'Venta equivocada' };
    expect(f.sales.void(voidInput).status).toBe('VOIDED');
    expect(f.sales.void(voidInput).status).toBe('VOIDED');
    expect(f.db.prepare('SELECT quantity_base FROM inventory_balances').get()).toEqual({
      quantity_base: 1000,
    });
    expect(
      f.db.prepare("SELECT COUNT(*) AS count FROM stock_movements WHERE kind='VOID'").get(),
    ).toEqual({ count: 1 });
    expect(
      f.sales.list({
        fromDate: sale.businessDate,
        toDate: sale.businessDate,
        status: 'COMPLETED',
        limit: 20,
      }).total,
    ).toBe(0);
  } finally {
    f.db.close();
  }
});
it('revalida precio, borrador y stock; advierte conteo posterior antes de anular', () => {
  const f = fixture();
  try {
    expect(() =>
      f.sales.complete({
        ...f.input,
        lines: [{ ...f.input.lines[0]!, quantityBase: 2000 }],
        payments: [{ method: 'CASH', amountCents: 2400000 }],
      }),
    ).toThrow();
    const sale = f.sales.complete(f.input);
    const balance = f.stock.get(f.product.id);
    f.stock.count({
      productId: f.product.id,
      countedBase: 700,
      reason: 'Conteo físico',
      operationKey: randomUUID(),
      expectedRevision: balance.revision,
      expectedProductRevision: balance.productRevision,
    });
    const input = { saleId: sale.id, operationKey: randomUUID(), reason: 'Error de venta' };
    expect(f.sales.previewVoid(sale.id).countedAfterSale).toHaveLength(1);
    expect(() => f.sales.void(input)).toThrow('conteo');
    expect(f.sales.void({ ...input, acknowledgeRecount: true }).status).toBe('VOIDED');
    expect(f.stock.get(f.product.id).quantityBase).toBe(950);
  } finally {
    f.db.close();
  }
});
