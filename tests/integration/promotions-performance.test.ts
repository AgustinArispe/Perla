import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { PromotionService } from '../../src/worker/promotions/service';

it('cotiza sobre 4.000 productos y 100 promociones sin recorrer el catálogo completo', () => {
  const db = openDatabase(':memory:');
  try {
    const actor = new AuthService(db).bootstrap({
      name: 'Dueña', username: 'jefe', password: 'Prueba-Perla-2026!',
    }).user;
    const catalog = new CatalogRepository(db);
    const selected = catalog.save({ sku: 'PERF-0', barcode: null, name: 'Producto 0', category: 'Prueba', saleUnit: 'UNIT', priceCents: 10000, active: true, trackStock: false, minStockBase: 0 });
    for (let index = 1; index < 4000; index++)
      catalog.save({ sku: `PERF-${index}`, barcode: null, name: `Producto ${index}`, category: 'Prueba', saleUnit: 'UNIT', priceCents: 10000 + index, active: true, trackStock: false, minStockBase: 0 });
    const promotions = new PromotionService(db);
    for (let index = 0; index < 100; index++)
      promotions.save({ name: `Oferta ${index}`, type: 'PERCENT', status: 'ACTIVE', priority: index % 10, startsAt: null, endsAt: null, productIds: [selected.id], categoryIds: [], brandIds: [], basisPoints: 100 + index }, actor);
    const sales = new SalesService(db, catalog, new StockService(db, catalog), new DraftRepository(db), () => false, undefined, () => false, promotions, () => true);
    const start = performance.now();
    const quote = sales.quote({ checkoutKey: randomUUID(), lines: [{ lineId: randomUUID(), productId: selected.id, quantityBase: 2, expectedProductRevision: selected.revision, expectedPriceCents: selected.priceCents }], discount: { type: 'NONE' } });
    const elapsed = performance.now() - start;
    expect(quote.totalCents).toBeLessThan(quote.subtotalCents);
    expect(elapsed).toBeLessThan(1000);
  } finally {
    db.close();
  }
});
