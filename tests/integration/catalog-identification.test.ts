import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';

describe('identificación interna del catálogo', () => {
  it('genera un código interno único y una etiqueta pendiente al crear un producto sin código de fábrica', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new CatalogRepository(db);
      const product = repo.save({
        sku: 'TORN-6X40',
        barcode: null,
        generateInternalBarcode: true,
        name: 'Tornillo 6 x 40',
        category: 'Tornillería',
        saleUnit: 'UNIT',
        priceCents: 1200,
        active: true,
        trackStock: true,
        minStockBase: 10,
      });
      expect(product.internalBarcode).toMatch(/^200\d{10}$/);
      expect(repo.findByBarcode(product.internalBarcode!)).toMatchObject({ id: product.id });
      expect(repo.labels({ status: 'PENDING' }).items).toMatchObject([
        { productId: product.id, barcode: product.internalBarcode, status: 'PENDING' },
      ]);
    } finally {
      db.close();
    }
  });
});
