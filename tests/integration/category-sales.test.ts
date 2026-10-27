import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { ReturnService } from '../../src/worker/returns/service';
import { MonthlyReports } from '../../src/worker/reports/queries';
import { AuthService } from '../../src/worker/auth/service';
it('concilia categorías históricas, sin clasificación y devoluciones sin depender de costos', () => {
  const db = openDatabase(':memory:');
  try {
    const actor = new AuthService(db).bootstrap({
      username: 'jefe',
      name: 'Jefe',
      password: 'Prueba-Categorias-2026!',
    }).user;
    const catalog = new CatalogRepository(db),
      stock = new StockService(db, catalog),
      sales = new SalesService(db, catalog, stock, new DraftRepository(db));
    const product = catalog.save({
      sku: 'CAT-1',
      name: 'Artículo categoría',
      category: 'Original',
      barcode: null,
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    const sell = () => {
      const current = catalog.get(product.id);
      return sales.complete(
        {
          checkoutKey: randomUUID(),
          discount: { type: 'NONE' },
          lines: [
            {
              lineId: randomUUID(),
              productId: current.id,
              quantityBase: 1,
              expectedProductRevision: current.revision,
              expectedPriceCents: current.priceCents,
            },
          ],
          payments: [{ method: 'TRANSFER', amountCents: 1000 }],
        },
        actor,
      );
    };
    const first = sell();
    db.prepare("UPDATE products SET category='Nueva' WHERE id=?").run(product.id);
    sell();
    db.prepare('UPDATE products SET category=NULL WHERE id=?').run(product.id);
    sell();
    const reports = new MonthlyReports(db);
    expect(reports.month(first.localMonth).categorySales).toEqual([
      { name: 'Nueva', netCents: 1000 },
      { name: 'Original', netCents: 1000 },
      { name: 'Sin categoría', netCents: 1000 },
    ]);
    new ReturnService(db, stock, sales).confirm(
      {
        saleId: first.id,
        operationKey: randomUUID(),
        reason: 'Retorno del cliente',
        refundMethod: 'TRANSFER',
        items: [{ saleItemId: first.items[0]!.id, quantityBase: 1, disposition: 'NONE' }],
      },
      actor,
    );
    const report = reports.month(first.localMonth);
    expect(report.categorySales?.find((row) => row.name === 'Original')?.netCents).toBe(0);
    expect(report.categorySales?.reduce((sum, row) => sum + row.netCents, 0)).toBe(
      report.totals.netCents,
    );
    expect(report.totals.netCents).toBe(2000);
  } finally {
    db.close();
  }
});
