import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { CatalogImporter } from '../../src/worker/products/import';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { StockService } from '../../src/worker/stock/service';

const input = {
  sku: 'FIAM-01',
  barcode: '0123456789012',
  name: 'Jamón cocido',
  category: 'Fiambres',
  priceCents: 1200000,
  saleUnit: 'KG' as const,
  active: true,
  trackStock: true,
  minStockBase: 250,
};
const header = 'sku;barcode;nombre;precio_ars;unidad;activo;categoria;stock_inicial;stock_minimo\n';

describe('catálogo e importación atómica', () => {
  it('migra categorías existentes y conserva categoría y marca al buscar productos', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new CatalogRepository(db);
      const product = repo.save({ ...input, category: 'Fiambres', brandId: undefined });
      const category = db
        .prepare('SELECT id,name,active FROM product_categories WHERE name=?')
        .get('Fiambres') as { id: string; name: string; active: number };
      expect(category).toMatchObject({ name: 'Fiambres', active: 1 });
      const brand = db
        .prepare(
          "INSERT INTO product_brands (id,name,search_name,active,revision,created_at_utc,updated_at_utc) VALUES ('11111111-1111-4111-8111-111111111111','Arcor','arcor',1,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z') RETURNING id,name",
        )
        .get() as { id: string; name: string };
      const updated = repo.save({
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        brand: product.brand,
        saleUnit: product.saleUnit,
        priceCents: product.priceCents,
        active: product.active,
        trackStock: product.trackStock,
        minStockBase: product.minStockBase,
        id: product.id,
        categoryId: category.id,
        brandId: brand.id,
        expectedRevision: product.revision,
      });
      expect(updated).toMatchObject({ category: 'Fiambres', categoryId: category.id, brand: 'Arcor', brandId: brand.id });
      expect(repo.search({ query: '', activeOnly: false, limit: 20, categoryId: category.id, brandId: brand.id }).total).toBe(1);
    } finally {
      db.close();
    }
  });

  it('encuentra códigos Unicode con tildes y mayúsculas', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new CatalogRepository(db);
      const product = repo.save({ ...input, sku: 'AÑO-01', barcode: 'Ñ0123' });
      expect(repo.search({ query: 'AÑO-01', activeOnly: true, limit: 20 }).items[0]?.id).toBe(
        product.id,
      );
      expect(repo.search({ query: 'ñ0123', activeOnly: true, limit: 20 }).items[0]?.id).toBe(
        product.id,
      );
    } finally {
      db.close();
    }
  });

  it('guarda, busca sin tildes, mantiene ceros y rechaza edición vieja/duplicados', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new CatalogRepository(db);
      const product = repo.save(input);
      expect(repo.search({ query: 'JAMON', activeOnly: true, limit: 20 }).items[0]).toMatchObject({
        id: product.id,
        barcode: input.barcode,
      });
      expect(() => repo.save({ ...input, sku: 'OTHER' })).toThrow();
      const updated = repo.save({
        ...input,
        id: product.id,
        expectedRevision: product.revision,
        priceCents: 1300000,
      });
      expect(updated.revision).toBe(2);
      expect(() => repo.save({ ...input, id: product.id, expectedRevision: 1 })).toThrow();
      repo.setActive({ productId: product.id, active: false, expectedRevision: 2 });
      expect(repo.search({ query: '', activeOnly: true, limit: 20 }).items).toHaveLength(0);
      expect(() => repo.findByBarcode(input.barcode)).toThrow();
      expect(repo.search({ query: '%', activeOnly: false, limit: 20 }).items).toHaveLength(0);
    } finally {
      db.close();
    }
  });
  it('muestra fila inválida 1500 y no aplica nada; repetir un hash válido no duplica', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new CatalogRepository(db);
      const importer = new CatalogImporter(db, repo);
      const rows = Array.from(
        { length: 2000 },
        (_, i) =>
          `SKU-${i};0${String(i).padStart(12, '0')};Producto ${i};12.000,50;UNIT;si;Almacén;;5`,
      );
      const invalid = [...rows];
      invalid[1498] = invalid[1498]!.replace('01498', '00000');
      // Set barcode at physical line 1500 to duplicate the first row.
      const fields = invalid[1498]!.split(';');
      fields[1] = rows[0]!.split(';')[1]!;
      invalid[1498] = fields.join(';');
      const bad = importer.preview(header + invalid.join('\n'), 'bad.csv');
      expect(bad.errors.some((error) => error.row === 1500)).toBe(true);
      expect(() =>
        importer.apply({
          previewToken: bad.previewToken,
          operationKey: randomUUID(),
          confirmPriceChanges: false,
        }),
      ).toThrow();
      expect(repo.search({ query: '', activeOnly: false, limit: 20 }).total).toBe(0);
      const good = importer.preview(header + rows.join('\n'), 'good.csv');
      const key = randomUUID();
      const result = importer.apply({
        previewToken: good.previewToken,
        operationKey: key,
        confirmPriceChanges: false,
      });
      const again = importer.preview(header + rows.join('\n'), 'same.csv');
      expect(
        importer.apply({
          previewToken: again.previewToken,
          operationKey: randomUUID(),
          confirmPriceChanges: true,
        }).batchId,
      ).toBe(result.batchId);
      expect(repo.search({ query: '', activeOnly: false, limit: 20 }).total).toBe(2000);
      expect(repo.findByBarcode(rows[0]!.split(';')[1]!)).toMatchObject({
        priceCents: 1200050,
        stockInitialized: false,
      });
      const timings = Array.from({ length: 100 }, (_, i) => {
        const start = performance.now();
        repo.search({ query: `Producto ${i}`, activeOnly: true, limit: 20 });
        return performance.now() - start;
      }).sort((a, b) => a - b);
      console.log(
        `Búsqueda SQL: 2.000 productos, p95=${timings[94]!.toFixed(2)}ms (PC de desarrollo).`,
      );
    } finally {
      db.close();
    }
  }, 15_000);
  it('exige confirmar precios, detecta cambios desde preview y revierte todo el lote', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new CatalogRepository(db);
      const importer = new CatalogImporter(db, repo);
      const product = repo.save(input);
      const csv =
        header +
        'FIAM-01;0123456789012;Jamón cocido;13.000;KG;si;Fiambres;;0,25\nNEW;;Nuevo;500;UNIT;si;;;0';
      const preview = importer.preview(csv, 'prices.csv');
      expect(preview.priceChanges).toBe(1);
      expect(preview.rows[0]?.previousPriceCents).toBe(product.priceCents);
      expect(() =>
        importer.apply({
          previewToken: preview.previewToken,
          operationKey: randomUUID(),
          confirmPriceChanges: false,
        }),
      ).toThrow();
      repo.save({ ...input, id: product.id, expectedRevision: 1, name: 'Jamón nuevo' });
      expect(() =>
        importer.apply({
          previewToken: preview.previewToken,
          operationKey: randomUUID(),
          confirmPriceChanges: true,
        }),
      ).toThrow();
      expect(repo.search({ query: '', activeOnly: false, limit: 20 }).total).toBe(1);
      expect(
        importer.preview(header + 'STOCK;;Stock;500;UNIT;si;;10;1', 'stock.csv').errors[0]?.message,
      ).toContain('stock');
    } finally {
      db.close();
    }
  });
  it('pagina sin repetir filas y bloquea cambios de unidad con uso histórico', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new CatalogRepository(db);
      const products = Array.from({ length: 5 }, (_, i) =>
        repo.save({ ...input, sku: `P-${i}`, barcode: null }),
      );
      const first = repo.search({ query: '', activeOnly: false, limit: 2 });
      const second = repo.search({
        query: '',
        activeOnly: false,
        limit: 2,
        cursor: first.nextCursor!,
      });
      expect(new Set([...first.items, ...second.items].map((product) => product.id)).size).toBe(4);
      const sales = new SalesService(db, repo, new StockService(db, repo), new DraftRepository(db));
      sales.complete({
        checkoutKey: randomUUID(),
        lines: [
          {
            lineId: randomUUID(),
            productId: products[0]!.id,
            quantityBase: 1000,
            expectedProductRevision: 1,
            expectedPriceCents: input.priceCents,
          },
        ],
        discount: { type: 'NONE' },
        payments: [{ method: 'DEBIT', amountCents: input.priceCents }],
      });
      expect(() =>
        repo.save({
          ...input,
          sku: 'P-0',
          barcode: null,
          id: products[0]!.id,
          expectedRevision: 1,
          saleUnit: 'UNIT',
        }),
      ).toThrow();
    } finally {
      db.close();
    }
  });
  it('conserva el último borrador y evita sobrescribir una revisión más nueva', () => {
    const db = openDatabase(':memory:');
    try {
      const repo = new DraftRepository(db);
      const body = { checkoutKey: randomUUID(), lines: [], discount: { type: 'NONE' as const } };
      const saved = repo.save({ body, expectedRevision: 0 });
      expect(repo.get()).toEqual(saved);
      expect(() => repo.save({ body, expectedRevision: 0 })).toThrow();
      expect(repo.get()?.revision).toBe(1);
    } finally {
      db.close();
    }
  });
});
it('filtra los productos por kilo antes de paginar y ata el cursor al filtro', () => {
  const db = openDatabase(':memory:');
  try {
    const repo = new CatalogRepository(db);
    for (let i = 0; i < 25; i++)
      repo.save({
        ...input,
        sku: `U${i}`,
        barcode: null,
        name: `A producto ${i}`,
        saleUnit: 'UNIT',
      });
    for (let i = 0; i < 2; i++)
      repo.save({ ...input, sku: `K${i}`, barcode: null, name: `Z fiambre ${i}` });
    const page = repo.search({ query: '', activeOnly: true, limit: 1, saleUnit: 'KG' });
    expect(page.total).toBe(2);
    expect(page.items[0]?.saleUnit).toBe('KG');
    expect(() =>
      repo.search({
        query: '',
        activeOnly: true,
        limit: 1,
        cursor: page.nextCursor!,
        saleUnit: 'UNIT',
      }),
    ).toThrow('búsqueda cambió');
  } finally {
    db.close();
  }
});
