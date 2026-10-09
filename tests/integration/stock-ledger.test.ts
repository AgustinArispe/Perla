import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { CatalogImporter } from '../../src/worker/products/import';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import Database from 'better-sqlite3';

const productInput = {
  sku: 'QUESO',
  barcode: null,
  name: 'Queso cremoso',
  saleUnit: 'KG' as const,
  priceCents: 900000,
  active: true,
  category: null,
  trackStock: true,
  minStockBase: 5000,
};

it('agrega inventario al catálogo v2 sin inventar existencias ni alterar productos', () => {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys=ON');
    migrate(db, MIGRATIONS.slice(0, 2));
    const catalog = new CatalogRepository(db);
    const original = catalog.save({ ...productInput, barcode: '0123456789012' });
    migrate(db);
    const stock = new StockService(db, catalog);
    expect(catalog.get(original.id)).toEqual(original);
    expect(stock.get(original.id).state).toBe('UNKNOWN');
    expect(stock.get(original.id).quantityBase).toBeNull();
    expect(stock.movements({ productId: original.id, limit: 20 }).total).toBe(0);
  } finally {
    db.close();
  }
});

it('registra apertura, recepción, merma y conteo con saldo conciliado e idempotencia', () => {
  const db = openDatabase(':memory:');
  try {
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const product = catalog.save(productInput);
    expect(stock.get(product.id).state).toBe('UNKNOWN');
    const opening = {
      productId: product.id,
      countedBase: 3000,
      reason: 'Conteo inicial',
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: product.revision,
    };
    const opened = stock.opening(opening);
    expect(stock.operation(opening.operationKey)).toEqual(opened);
    expect(stock.operation(randomUUID())).toBeNull();
    for (let i = 0; i < 100; i++) expect(stock.opening(opening)).toEqual(opened);
    expect(() => stock.opening({ ...opening, countedBase: 4000 })).toThrow('identificador');
    const received = stock.record({
      productId: product.id,
      deltaBase: 2000,
      kind: 'RECEIPT',
      reason: 'Compra',
      operationKey: randomUUID(),
      expectedRevision: opened.revision,
      expectedProductRevision: opened.productRevision,
    });
    const wasted = stock.record({
      productId: product.id,
      deltaBase: -100,
      kind: 'WASTE',
      reason: 'Merma',
      operationKey: randomUUID(),
      expectedRevision: received.revision,
      expectedProductRevision: received.productRevision,
    });
    expect(wasted.quantityBase).toBe(4900);
    expect(wasted.state).toBe('LOW');
    expect(() =>
      stock.count({
        ...opening,
        operationKey: randomUUID(),
        expectedProductRevision: wasted.productRevision,
        expectedRevision: 1,
      }),
    ).toThrow('cambió');
    const counted = stock.count({
      ...opening,
      countedBase: 4500,
      operationKey: randomUUID(),
      expectedProductRevision: wasted.productRevision,
      expectedRevision: wasted.revision,
    });
    expect(counted.quantityBase).toBe(4500);
    expect(db.prepare('SELECT SUM(delta_base) AS quantity FROM stock_movements').get()).toEqual({
      quantity: 4500,
    });
    expect(stock.movements({ productId: product.id, limit: 20 }).items).toHaveLength(4);
    const start = performance.now();
    expect(stock.listLow({ limit: 20 }).total).toBe(1);
    console.log(
      `Consulta bajo stock: ${(performance.now() - start).toFixed(2)}ms (fixture local).`,
    );
  } finally {
    db.close();
  }
});

it('exige confirmación explícita para negativo y revierte saldo si falla el movimiento', () => {
  const db = openDatabase(':memory:');
  try {
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const product = catalog.save(productInput);
    const opened = stock.opening({
      productId: product.id,
      countedBase: 100,
      reason: 'Conteo',
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: 1,
    });
    const waste = {
      productId: product.id,
      deltaBase: -200,
      kind: 'WASTE' as const,
      reason: 'Producto dañado',
      operationKey: randomUUID(),
      expectedRevision: opened.revision,
      expectedProductRevision: opened.productRevision,
    };
    expect(() => stock.record(waste)).toThrow('insuficiente');
    expect(stock.get(product.id).quantityBase).toBe(100);
    db.exec(
      "CREATE TRIGGER fail_movement BEFORE INSERT ON stock_movements BEGIN SELECT RAISE(ABORT, 'disk failure fixture'); END",
    );
    expect(() => stock.record({ ...waste, allowNegative: true })).toThrow();
    expect(stock.get(product.id)).toEqual(opened);
    db.exec('DROP TRIGGER fail_movement');
    expect(stock.record({ ...waste, allowNegative: true }).state).toBe('NEGATIVE');
  } finally {
    db.close();
  }
});

it('conserva historial al desactivar tracking y exige un nuevo conteo al reactivarlo', () => {
  const db = openDatabase(':memory:');
  try {
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const product = catalog.save(productInput);
    const opened = stock.opening({
      productId: product.id,
      countedBase: 0,
      reason: 'Estante vacío',
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: 1,
    });
    expect(opened.state).toBe('OUT');
    expect(() =>
      catalog.save({
        ...productInput,
        id: product.id,
        expectedRevision: opened.productRevision,
        saleUnit: 'UNIT',
      }),
    ).toThrow('unidad');
    const disabled = catalog.save({
      ...productInput,
      id: product.id,
      expectedRevision: opened.productRevision,
      trackStock: false,
    });
    expect(stock.get(product.id).state).toBe('DISABLED');
    const enabled = catalog.save({
      ...productInput,
      id: product.id,
      expectedRevision: disabled.revision,
    });
    expect(stock.get(product.id).state).toBe('UNKNOWN');
    const recounted = stock.opening({
      productId: product.id,
      countedBase: 2500,
      reason: 'Nuevo conteo',
      operationKey: randomUUID(),
      expectedRevision: opened.revision,
      expectedProductRevision: enabled.revision,
    });
    expect(recounted.quantityBase).toBe(2500);
    expect(stock.movements({ productId: product.id, limit: 20 }).items[0]?.kind).toBe('ADJUSTMENT');
  } finally {
    db.close();
  }
});

it('importa conteo real en la misma transacción y no lo repite ni reemplaza uno existente', () => {
  const db = openDatabase(':memory:');
  try {
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const importer = new CatalogImporter(db, catalog, stock);
    const csv =
      'sku;barcode;nombre;precio_ars;unidad;activo;categoria;stock_inicial;stock_minimo\nQUESO;;Queso;9.000;KG;si;Fiambres;2,500;1,000';
    const preview = importer.preview(csv, 'stock.csv');
    expect(preview.errors).toHaveLength(0);
    const input = {
      previewToken: preview.previewToken,
      operationKey: randomUUID(),
      confirmPriceChanges: true,
      confirmStockCounts: true,
    };
    importer.apply(input);
    importer.apply(input);
    const product = catalog.findBySku('QUESO')!;
    expect(stock.get(product.id).quantityBase).toBe(2500);
    expect(stock.movements({ productId: product.id, limit: 20 }).items).toHaveLength(1);
    expect(
      importer.preview(csv.replace('2,500', '3,000'), 'other.csv').errors[0]?.message,
    ).toContain('conteo');
  } finally {
    db.close();
  }
});

it('pagina movimientos con igual timestamp y filtra por fecha comercial argentina', () => {
  const db = openDatabase(':memory:');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T01:30:00Z'));
  try {
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const product = catalog.save(productInput);
    let balance = stock.opening({
      productId: product.id,
      countedBase: 1000,
      reason: 'Conteo',
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: 1,
    });
    for (let i = 0; i < 3; i++)
      balance = stock.record({
        productId: product.id,
        kind: 'RECEIPT',
        deltaBase: 100,
        reason: 'Ingreso',
        operationKey: randomUUID(),
        expectedRevision: balance.revision,
        expectedProductRevision: balance.productRevision,
      });
    const first = stock.movements({
      productId: product.id,
      limit: 2,
      fromDate: '2026-09-30',
      toDate: '2026-09-30',
    });
    const second = stock.movements({
      productId: product.id,
      limit: 2,
      fromDate: '2026-09-30',
      toDate: '2026-09-30',
      cursor: first.nextCursor!,
    });
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(4);
    expect(first.items.every((item) => item.businessDate === '2026-09-30')).toBe(true);
    expect(
      stock.movements({ productId: product.id, limit: 20, fromDate: '2026-10-01' }).total,
    ).toBe(0);
    expect(() =>
      stock.movements({
        productId: product.id,
        limit: 2,
        fromDate: '2026-10-01',
        cursor: first.nextCursor!,
      }),
    ).toThrow('filtro');
  } finally {
    vi.useRealTimers();
    db.close();
  }
});

it('muestra reposición de 2.000 productos y mantiene desconocidos por separado', () => {
  const db = openDatabase(':memory:');
  try {
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const importer = new CatalogImporter(db, catalog, stock);
    const csv =
      'sku;barcode;nombre;precio_ars;unidad;activo;categoria;stock_inicial;stock_minimo\n' +
      Array.from(
        { length: 2000 },
        (_, i) =>
          `STK-${i};;Producto ${String(i).padStart(4, '0')};500;UNIT;si;;${i === 0 ? '' : i % 2 === 0 ? '0' : '3'};5`,
      ).join('\n');
    const preview = importer.preview(csv, 'fixture.csv');
    expect(preview.errors).toHaveLength(0);
    importer.apply({
      previewToken: preview.previewToken,
      operationKey: randomUUID(),
      confirmPriceChanges: true,
      confirmStockCounts: true,
    });
    const times = Array.from({ length: 30 }, () => {
      const start = performance.now();
      const page = stock.listLow({ limit: 50 });
      expect(page.total).toBe(1999);
      expect(page.items.some((item) => item.state === 'UNKNOWN')).toBe(false);
      return performance.now() - start;
    }).sort((a, b) => a - b);
    console.log(
      `Reposición: 2.000 productos, p95=${times[28]!.toFixed(2)}ms (SQL+DTO, PC desarrollo).`,
    );
    expect(stock.search({ filter: 'UNKNOWN', limit: 20 }).total).toBe(1);
    const shortages = stock.search({ filter: 'SHORTAGES', limit: 20 });
    expect(shortages.total).toBe(1999);
    expect(shortages.items.every((item) => item.state === 'LOW' || item.state === 'OUT' || item.state === 'NEGATIVE')).toBe(true);
    expect(stock.search({ filter: 'SHORTAGES', query: 'Producto 0001', limit: 20 }).total).toBe(1);
    const first = stock.listLow({ limit: 50 });
    const next = stock.listLow({ limit: 50, cursor: first.nextCursor! });
    expect(new Set([...first.items, ...next.items].map((item) => item.productId)).size).toBe(100);
    expect(() => stock.search({ filter: 'LOW', limit: 50, cursor: first.nextCursor! })).toThrow(
      'búsqueda',
    );
    const mismatch = db
      .prepare(
        'SELECT b.product_id FROM inventory_balances b LEFT JOIN stock_movements m ON m.product_id=b.product_id GROUP BY b.product_id HAVING b.quantity_base != COALESCE(SUM(m.delta_base),0)',
      )
      .all();
    expect(mismatch).toHaveLength(0);
  } finally {
    db.close();
  }
});
