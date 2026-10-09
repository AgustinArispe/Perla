import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { FeatureService } from '../../src/worker/features/service';
import { AuthService } from '../../src/worker/auth/service';

const percentile95 = (samples: number[]) =>
  samples.sort((a, b) => a - b)[Math.floor(samples.length * 0.95)]!;

it('mantiene rápido el camino crítico de caja con búsqueda de código y confirmación local', () => {
  const db = openDatabase(':memory:');
  try {
    const catalog = new CatalogRepository(db),
      stock = new StockService(db, catalog),
      sales = new SalesService(db, catalog, stock, new DraftRepository(db));
    const product = catalog.save({
      sku: 'CAJA-RAPIDA',
      barcode: '779000000001',
      name: 'Producto de caja rápida',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: true,
      minStockBase: 10,
    });
    const insertExtras = db.prepare(
      'INSERT INTO products (id,sku,barcode,name,search_name,category,sale_unit,price_cents,active,track_stock,stock_initialized,min_stock_base,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)',
    );
    const now = new Date().toISOString();
    db.transaction(() => {
      for (let i = 0; i < 3_999; i++)
        insertExtras.run(
          randomUUID(),
          `RAPIDO-${i}`,
          `7799${String(i).padStart(9, '0')}`,
          `Producto adicional ${i}`,
          `producto adicional ${i}`,
          null,
          'UNIT',
          1000,
          1,
          0,
          0,
          0,
          now,
          now,
        );
    })();
    const opened = stock.opening({
      productId: product.id,
      countedBase: 500,
      reason: 'Benchmark local',
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: product.revision,
    });
    const lookupSamples = Array.from({ length: 100 }, () => {
      const start = performance.now();
      catalog.findByBarcode(product.barcode!);
      return performance.now() - start;
    });
    const saleSamples = Array.from({ length: 100 }, () => {
      const start = performance.now();
      sales.complete({
        checkoutKey: randomUUID(),
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: 1,
            expectedProductRevision: opened.productRevision,
            expectedPriceCents: product.priceCents,
          },
        ],
        discount: { type: 'NONE' },
        payments: [
          { method: 'CASH', amountCents: product.priceCents, tenderedCents: product.priceCents },
        ],
      });
      return performance.now() - start;
    });
    const lookupP95 = percentile95(lookupSamples),
      saleP95 = percentile95(saleSamples);
    console.log(
      `Caja local con 4.000 productos: búsqueda por código p95=${lookupP95.toFixed(2)}ms; venta+stock p95=${saleP95.toFixed(2)}ms.`,
    );
    expect(lookupP95).toBeLessThan(10);
    expect(saleP95).toBeLessThan(75);
  } finally {
    db.close();
  }
});

it('mantiene Caja independiente cuando Compras se activa o se pausa', () => {
  const db = openDatabase(':memory:');
  try {
    const auth = new AuthService(db);
    const owner = auth.bootstrap({
      name: 'Dueña',
      username: 'jefe',
      password: 'Prueba-Perla-2026!',
    }).user;
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const sales = new SalesService(db, catalog, stock, new DraftRepository(db));
    const features = new FeatureService(db);
    const product = catalog.save({
      sku: 'CAJA-MODULAR',
      barcode: null,
      name: 'Producto modular',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1500,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    for (const enabled of [true, false]) {
      const state = features.status();
      features.change(
        {
          expectedRevision: state.revision,
          enabled: { SUPPLIERS_PURCHASES: enabled },
        },
        owner,
      );
      expect(
        sales.complete({
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 1,
              expectedProductRevision: product.revision,
              expectedPriceCents: product.priceCents,
            },
          ],
          discount: { type: 'NONE' },
          payments: [{ method: 'CASH', amountCents: product.priceCents }],
        }).status,
      ).toBe('COMPLETED');
    }
  } finally {
    db.close();
  }
});
