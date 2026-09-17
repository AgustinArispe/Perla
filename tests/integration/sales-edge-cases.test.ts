import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
function fixture() {
  const db = openDatabase(':memory:');
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const drafts = new DraftRepository(db);
  const sales = new SalesService(db, catalog, stock, drafts);
  const product = catalog.save({
    sku: 'P',
    barcode: null,
    name: 'Producto',
    category: null,
    saleUnit: 'UNIT',
    priceCents: 100,
    active: true,
    trackStock: true,
    minStockBase: 1,
  });
  const line = {
    lineId: randomUUID(),
    productId: product.id,
    quantityBase: 1,
    expectedProductRevision: 1,
    expectedPriceCents: 100,
  };
  const input = {
    checkoutKey: randomUUID(),
    lines: [line],
    discount: { type: 'NONE' as const },
    payments: [{ method: 'DEBIT' as const, amountCents: 100 }],
  };
  return { db, catalog, stock, drafts, sales, product, input };
}
it('venta y ledger comparten fecha al cruzar medianoche; registra retroceso observable del reloj', () => {
  const f = fixture();
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-10-01T02:59:59.999Z'));
    const opening = f.stock.opening({
      productId: f.product.id,
      countedBase: 3,
      expectedRevision: 0,
      expectedProductRevision: 1,
      operationKey: randomUUID(),
      reason: 'Conteo',
    });
    const get = f.stock.get.bind(f.stock);
    vi.spyOn(f.stock, 'get').mockImplementation((id) => {
      vi.setSystemTime(new Date('2026-10-01T03:00:00.000Z'));
      return get(id);
    });
    const input = {
      ...f.input,
      lines: [{ ...f.input.lines[0]!, expectedProductRevision: opening.productRevision }],
    };
    const sale = f.sales.complete(input);
    expect(sale.businessDate).toBe('2026-09-30');
    expect(sale.localMonth).toBe('2026-09');
    expect(
      f.db
        .prepare("SELECT created_at_utc,business_date FROM stock_movements WHERE kind='SALE'")
        .get(),
    ).toEqual({ created_at_utc: sale.createdAt, business_date: sale.businessDate });
    vi.restoreAllMocks();
    vi.setSystemTime(new Date('2026-09-01T12:00:00Z'));
    const earlier = f.sales.complete({ ...input, checkoutKey: randomUUID() });
    expect(earlier.events[0]?.clockWarning).toContain('reloj');
    expect(f.sales.detail(earlier.id).events[0]?.clockWarning).toContain('reloj');
  } finally {
    vi.restoreAllMocks();
    vi.useRealTimers();
    f.db.close();
  }
});
it('stock desconocido sigue desconocido y una venta bonificada no necesita pagos', () => {
  const f = fixture();
  try {
    const sale = f.sales.complete({
      ...f.input,
      discount: { type: 'PERCENT', basisPoints: 10000 },
      payments: [],
    });
    expect(sale.totalCents).toBe(0);
    expect(f.stock.get(f.product.id).quantityBase).toBeNull();
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get()).toEqual({ n: 0 });
    f.sales.void({ saleId: sale.id, operationKey: randomUUID(), reason: 'Corrección' });
    expect(f.stock.get(f.product.id).quantityBase).toBeNull();
  } finally {
    f.db.close();
  }
});
it('rechaza cambios de precio y productos inactivos sin perder el borrador', () => {
  const f = fixture();
  try {
    const { payments: _, ...body } = f.input;
    void _;
    f.drafts.save({ body, expectedRevision: 0 });
    f.catalog.save({
      sku: f.product.sku,
      barcode: f.product.barcode,
      name: f.product.name,
      category: f.product.category,
      saleUnit: f.product.saleUnit,
      priceCents: 200,
      active: f.product.active,
      trackStock: f.product.trackStock,
      minStockBase: f.product.minStockBase,
      id: f.product.id,
      expectedRevision: 1,
    });
    expect(() => f.sales.complete({ ...f.input, expectedDraftRevision: 1 })).toThrow('precio');
    expect(f.drafts.get()?.revision).toBe(1);
    const current = f.catalog.get(f.product.id);
    f.catalog.setActive({
      productId: current.id,
      expectedRevision: current.revision,
      active: false,
    });
    expect(() => f.sales.complete({ ...f.input, expectedDraftRevision: 1 })).toThrow('inactivo');
  } finally {
    f.db.close();
  }
});
it('suma porciones del mismo producto y exige motivo para stock negativo', () => {
  const f = fixture();
  try {
    const opening = f.stock.opening({
      productId: f.product.id,
      countedBase: 1,
      expectedRevision: 0,
      expectedProductRevision: 1,
      operationKey: randomUUID(),
      reason: 'Conteo',
    });
    const line = { ...f.input.lines[0]!, expectedProductRevision: opening.productRevision };
    const input = {
      ...f.input,
      lines: [line, { ...line, lineId: randomUUID() }],
      payments: [{ method: 'CASH' as const, amountCents: 200 }],
    };
    expect(() => f.sales.complete(input)).toThrow();
    expect(f.stock.get(f.product.id).quantityBase).toBe(1);
    expect(f.sales.list({ limit: 20 }).total).toBe(0);
    const sale = f.sales.complete({
      ...input,
      negativeStockOverride: { reason: 'Stock pendiente de contar' },
    });
    expect(f.stock.get(f.product.id).quantityBase).toBe(-1);
    f.sales.void({ saleId: sale.id, operationKey: randomUUID(), reason: 'Corrección' });
    expect(f.stock.get(f.product.id).quantityBase).toBe(1);
  } finally {
    f.db.close();
  }
});
it('anulación fallida revierte reposición y estado; motivo distinto con misma key se rechaza', () => {
  const f = fixture();
  try {
    const opening = f.stock.opening({
      productId: f.product.id,
      countedBase: 2,
      expectedRevision: 0,
      expectedProductRevision: 1,
      operationKey: randomUUID(),
      reason: 'Conteo',
    });
    const sale = f.sales.complete({
      ...f.input,
      lines: [{ ...f.input.lines[0]!, expectedProductRevision: opening.productRevision }],
    });
    const input = { saleId: sale.id, operationKey: randomUUID(), reason: 'Corrección' };
    f.db.exec(
      "CREATE TRIGGER reject_void BEFORE INSERT ON sale_events WHEN NEW.kind='VOIDED' BEGIN SELECT RAISE(ABORT,'failure fixture'); END",
    );
    expect(() => f.sales.void(input)).toThrow();
    expect(f.stock.get(f.product.id).quantityBase).toBe(1);
    expect(f.sales.detail(sale.id).status).toBe('COMPLETED');
    f.db.exec('DROP TRIGGER reject_void');
    f.sales.void(input);
    expect(() => f.sales.void({ ...input, reason: 'Otro motivo' })).toThrow('identificador');
    expect(f.stock.get(f.product.id).quantityBase).toBe(2);
  } finally {
    f.db.close();
  }
});
it('pagina el histórico sin repetir y vincula cursor con filtros', () => {
  const f = fixture();
  try {
    for (let i = 0; i < 5; i++) f.sales.complete({ ...f.input, checkoutKey: randomUUID() });
    const first = f.sales.list({ limit: 2 });
    const second = f.sales.list({ limit: 2, cursor: first.nextCursor! });
    expect(first.total).toBe(5);
    expect(new Set([...first.items, ...second.items].map((s) => s.id)).size).toBe(4);
    expect(() => f.sales.list({ limit: 2, status: 'VOIDED', cursor: first.nextCursor! })).toThrow(
      'filtros',
    );
    expect(() =>
      f.sales.list({ limit: 2, fromDate: '2026-09-20', toDate: '2026-09-01' }),
    ).toThrow();
  } finally {
    f.db.close();
  }
});
