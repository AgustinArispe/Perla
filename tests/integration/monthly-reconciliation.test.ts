import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { MonthlyReports } from '../../src/worker/reports/queries';
it('concilia descuentos, aplicado sin vuelto, KG separado y anulaciones del mes original', () => {
  const db = openDatabase(':memory:');
  try {
    const catalog = new CatalogRepository(db),
      stock = new StockService(db, catalog),
      sales = new SalesService(db, catalog, stock, new DraftRepository(db));
    const p = catalog.save({
      sku: 'U',
      barcode: '001',
      name: 'Leche',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: true,
      minStockBase: 10,
    });
    const k = catalog.save({
      sku: 'K',
      barcode: '002',
      name: 'Jamón',
      category: null,
      saleUnit: 'KG',
      priceCents: 1200000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    stock.opening({
      productId: p.id,
      countedBase: 10,
      expectedRevision: 0,
      expectedProductRevision: 1,
      reason: 'Conteo',
      operationKey: randomUUID(),
    });
    const line = (product: typeof p, qty: number) => ({
      lineId: randomUUID(),
      productId: product.id,
      expectedPriceCents: product.priceCents,
      expectedProductRevision: product.revision,
      quantityBase: qty,
    });
    const sale = sales.complete({
      checkoutKey: randomUUID(),
      lines: [line(catalog.get(p.id), 2), line(k, 250)],
      discount: { type: 'PERCENT', basisPoints: 1000 },
      payments: [
        { method: 'CASH', amountCents: 171800, tenderedCents: 200000 },
        { method: 'DEBIT', amountCents: 100000 },
      ],
    });
    const reports = new MonthlyReports(db);
    const report = reports.month(sale.localMonth);
    expect(report.totals).toMatchObject({
      grossCents: 302000,
      discountCents: 30200,
      netCents: 271800,
      saleCount: 1,
    });
    expect(report.payments.reduce((sum, p) => sum + p.amountCents, 0)).toBe(report.totals.netCents);
    expect(report.cardCents).toBe(100000);
    expect(report.rankings.revenue.reduce((sum, p) => sum + p.netCents, 0)).toBe(271800);
    expect(report.rankings.units[0]).toMatchObject({ productId: p.id, quantityBase: 2 });
    expect(report.rankings.kilos[0]).toMatchObject({ productId: k.id, quantityBase: 250 });
    expect(report.lowStock[0]).toMatchObject({
      productId: p.id,
      quantityBase: 8,
      minStockBase: 10,
      soldBase: 2,
    });
    catalog.setActive({
      productId: p.id,
      active: false,
      expectedRevision: catalog.get(p.id).revision,
    });
    expect(reports.month(sale.localMonth).lowStock).toHaveLength(0);
    expect(reports.month(sale.localMonth).rankings.units[0]?.name).toBe('Leche');
    sales.void({ saleId: sale.id, reason: 'Operación equivocada', operationKey: randomUUID() });
    const voided = reports.month(sale.localMonth);
    expect(voided.totals).toMatchObject({
      netCents: 0,
      saleCount: 0,
      voidedCents: 271800,
      voidedCount: 1,
    });
    expect(voided.payments.every((p) => p.amountCents === 0)).toBe(true);
    expect(reports.month('2000-01').comparison.changeBasisPoints).toBeNull();
  } finally {
    db.close();
  }
});
