import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { PriceChangeService } from '../../src/worker/pricing/service';

function fixture() {
  const db = openDatabase(':memory:');
  const actor = new AuthService(db).bootstrap({ name: 'Dueña', username: 'jefe', password: 'Prueba-Perla-2026!' }).user;
  const catalog = new CatalogRepository(db);
  const products = [100000, 250000].map((priceCents, index) => catalog.save({
    sku: `PRECIO-${index + 1}`, barcode: null, name: `Producto ${index + 1}`, category: 'Pescados',
    saleUnit: 'UNIT', priceCents, active: true, trackStock: false, minStockBase: 0,
  }));
  return { db, actor, catalog, products, pricing: new PriceChangeService(db, catalog) };
}

describe('actualización masiva de precios', () => {
  it('previsualiza, confirma todo el lote y reintenta sin duplicar', () => {
    const f = fixture();
    try {
      const preview = f.pricing.preview({ productIds: f.products.map((p) => p.id), change: { type: 'PERCENT', basisPoints: 1000 } });
      expect(preview.items.map((i) => [i.beforeCents, i.afterCents])).toEqual([[100000, 110000], [250000, 275000]]);
      const input = { previewToken: preview.previewToken, operationKey: randomUUID() };
      const first = f.pricing.confirm(input, f.actor);
      const second = f.pricing.confirm(input, f.actor);
      expect(second).toEqual(first);
      expect(f.catalog.get(f.products[0]!.id).priceCents).toBe(110000);
      expect(
        f.db.prepare('SELECT COUNT(*) n FROM price_change_applications').get(),
      ).toEqual({ n: 1 });
    } finally { f.db.close(); }
  });

  it('rechaza el lote completo si un producto cambió después del preview', () => {
    const f = fixture();
    try {
      const preview = f.pricing.preview({ productIds: f.products.map((p) => p.id), change: { type: 'FIXED', priceCents: 99900 } });
      const changed = f.catalog.get(f.products[1]!.id);
      f.catalog.save({
        id: changed.id,
        expectedRevision: changed.revision,
        sku: changed.sku,
        barcode: changed.barcode,
        internalBarcode: changed.internalBarcode,
        name: changed.name,
        category: changed.category,
        categoryId: changed.categoryId,
        brand: changed.brand,
        brandId: changed.brandId,
        saleUnit: changed.saleUnit,
        priceCents: 300000,
        active: changed.active,
        trackStock: changed.trackStock,
        minStockBase: changed.minStockBase,
      });
      expect(() => f.pricing.confirm({ previewToken: preview.previewToken, operationKey: randomUUID() }, f.actor)).toThrow('cambió');
      expect(f.catalog.get(f.products[0]!.id).priceCents).toBe(100000);
    } finally { f.db.close(); }
  });
});
