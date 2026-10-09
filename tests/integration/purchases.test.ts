import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { PurchaseService } from '../../src/worker/purchases/service';
import { exportCsv } from '../../src/worker/operations/export';

const password = 'Prueba-Perla-2026!';

function fixture(stockEnabled: boolean) {
  const db = openDatabase(':memory:');
  const auth = new AuthService(db);
  const owner = auth.bootstrap({ name: 'Dueña', username: 'jefe', password }).user;
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const purchases = new PurchaseService(db, catalog, stock, () => stockEnabled);
  return { db, owner, catalog, stock, purchases };
}

describe('proveedores y compras', () => {
  test('guarda, recupera y cancela un borrador propio con revisión optimista', () => {
    const f = fixture(false);
    try {
      const body = {
        receiptKey: randomUUID(),
        supplierId: null,
        businessDate: '2026-10-02',
        lines: [],
      };
      const saved = f.purchases.saveDraft({ body, expectedRevision: 0 }, f.owner.id, null);
      expect(saved).toMatchObject({ body, revision: 1 });
      expect(f.purchases.getDraft(f.owner.id)).toEqual(saved);
      expect(() => f.purchases.saveDraft({ body, expectedRevision: 0 }, f.owner.id, null)).toThrow(
        'cambió',
      );
      expect(f.purchases.cancelDraft(1, f.owner.id)).toBeNull();
      expect(f.purchases.getDraft(f.owner.id)).toBeNull();
    } finally {
      f.db.close();
    }
  });

  test('crea, busca, edita y desactiva proveedores con revisión optimista', () => {
    const f = fixture(false);
    try {
      const created = f.purchases.saveSupplier({ name: '  Puerto Fresco  ' });
      expect(created).toMatchObject({ name: 'Puerto Fresco', active: true, revision: 1 });
      expect(f.purchases.searchSuppliers({ query: 'puerto', limit: 20 }).items).toEqual([created]);
      const updated = f.purchases.saveSupplier({
        id: created.id,
        expectedRevision: created.revision,
        name: 'Puerto Fresco SA',
        phone: '2494 000000',
      });
      expect(updated).toMatchObject({ revision: 2, phone: '2494 000000' });
      expect(() =>
        f.purchases.saveSupplier({
          id: created.id,
          expectedRevision: 1,
          name: 'Versión vieja',
        }),
      ).toThrow('cambió');
      expect(
        f.purchases.setSupplierActive({
          supplierId: created.id,
          active: false,
          expectedRevision: updated.revision,
        }),
      ).toMatchObject({ active: false, revision: 3 });
    } finally {
      f.db.close();
    }
  });

  test('confirma costos y snapshots una sola vez cuando Stock está apagado', () => {
    const f = fixture(false);
    try {
      const supplier = f.purchases.saveSupplier({ name: 'Costa Atlántica' });
      const unit = f.catalog.save({
        sku: 'LAT-01',
        barcode: '7790000000001',
        name: 'Lata de atún',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 25000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      });
      const kilo = f.catalog.save({
        sku: 'MER-01',
        barcode: null,
        name: 'Merluza',
        category: null,
        saleUnit: 'KG',
        priceCents: 90000,
        active: true,
        trackStock: true,
        minStockBase: 0,
      });
      const receiptKey = randomUUID();
      const input = {
        receiptKey,
        supplierId: supplier.id,
        businessDate: '2026-10-02',
        lines: [
          {
            lineId: randomUUID(),
            productId: unit.id,
            quantityBase: 3,
            unitCostCents: 12550,
            expectedProductRevision: unit.revision,
          },
          {
            lineId: randomUUID(),
            productId: kilo.id,
            quantityBase: 250,
            unitCostCents: 1001,
            expectedProductRevision: kilo.revision,
          },
        ],
      };
      const received = f.purchases.receive(input, f.owner);
      expect(received).toMatchObject({
        number: 1,
        status: 'RECEIVED',
        supplierName: 'Costa Atlántica',
        totalCents: 37900,
        stockApplied: false,
      });
      expect(received.items.map((item) => item.subtotalCents)).toEqual([37650, 250]);
      expect(f.purchases.receive(input, f.owner)).toEqual(received);
      const exported = exportCsv(f.db, 'exports.purchases', {
        fromDate: '2026-10-02',
        toDate: '2026-10-02',
        limit: 100,
        offset: 0,
      });
      expect(exported.content).toContain('Costa Atlántica');
      expect(exported.content).toContain('379,00');
      expect(() =>
        f.purchases.receive(
          {
            ...input,
            lines: [{ ...input.lines[0]!, unitCostCents: 13000 }, input.lines[1]!],
          },
          f.owner,
        ),
      ).toThrow('identificador');
      expect(f.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get()).toEqual({ n: 0 });

      f.purchases.saveSupplier({
        id: supplier.id,
        expectedRevision: supplier.revision,
        name: 'Proveedor Renombrado',
      });
      f.catalog.save({
        sku: unit.sku,
        barcode: unit.barcode,
        internalBarcode: unit.internalBarcode,
        id: unit.id,
        expectedRevision: unit.revision,
        name: 'Producto renombrado',
        category: unit.category,
        categoryId: unit.categoryId,
        brand: unit.brand,
        brandId: unit.brandId,
        saleUnit: unit.saleUnit,
        priceCents: unit.priceCents,
        active: unit.active,
        trackStock: unit.trackStock,
        minStockBase: unit.minStockBase,
      });
      expect(f.purchases.detail(received.id)).toMatchObject({
        supplierName: 'Costa Atlántica',
        items: [{ name: 'Lata de atún' }, { name: 'Merluza' }],
      });
    } finally {
      f.db.close();
    }
  });

  test('aumenta stock preparado dentro de la misma confirmación', () => {
    const f = fixture(true);
    try {
      const supplier = f.purchases.saveSupplier({ name: 'Mar del Sur' });
      const product = f.catalog.save({
        sku: 'CAL-01',
        barcode: null,
        name: 'Calamar',
        category: null,
        saleUnit: 'KG',
        priceCents: 100000,
        active: true,
        trackStock: true,
        minStockBase: 1000,
      });
      const opened = f.stock.opening({
        productId: product.id,
        countedBase: 5000,
        reason: 'Conteo inicial',
        operationKey: randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
      });
      const received = f.purchases.receive(
        {
          receiptKey: randomUUID(),
          supplierId: supplier.id,
          businessDate: '2026-10-02',
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 2500,
              unitCostCents: 80000,
              expectedProductRevision: opened.productRevision,
            },
          ],
        },
        f.owner,
      );
      expect(received.stockApplied).toBe(true);
      expect(f.stock.get(product.id).quantityBase).toBe(7500);
      expect(
        f.db
          .prepare(
            'SELECT purchase_id,purchase_item_id,kind FROM stock_movements WHERE purchase_id=?',
          )
          .get(received.id),
      ).toMatchObject({ purchase_id: received.id, kind: 'RECEIPT' });
    } finally {
      f.db.close();
    }
  });

  test('lista snapshots y anula una recepción segura una sola vez', () => {
    const f = fixture(true);
    try {
      const supplier = f.purchases.saveSupplier({ name: 'Pesquera Azul' });
      const product = f.catalog.save({
        sku: 'ABA-01',
        barcode: null,
        name: 'Abadejo',
        category: null,
        saleUnit: 'KG',
        priceCents: 120000,
        active: true,
        trackStock: true,
        minStockBase: 0,
      });
      const opened = f.stock.opening({
        productId: product.id,
        countedBase: 1000,
        reason: 'Conteo inicial',
        operationKey: randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
      });
      const received = f.purchases.receive(
        {
          receiptKey: randomUUID(),
          supplierId: supplier.id,
          businessDate: '2026-10-02',
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 2000,
              unitCostCents: 50000,
              expectedProductRevision: opened.productRevision,
            },
          ],
        },
        f.owner,
      );
      expect(
        f.purchases.list({
          fromDate: '2026-10-01',
          toDate: '2026-10-03',
          supplierId: supplier.id,
          status: 'RECEIVED',
          limit: 20,
        }).items,
      ).toEqual([expect.objectContaining({ id: received.id, supplierName: 'Pesquera Azul' })]);
      expect(f.purchases.previewVoid(received.id)).toEqual({ reversible: true, conflicts: [] });
      const operationKey = randomUUID();
      const voided = f.purchases.void(
        { purchaseId: received.id, operationKey, reason: 'Carga duplicada' },
        f.owner,
      );
      expect(voided.status).toBe('VOIDED');
      expect(f.purchases.detail(received.id).events).toEqual([
        expect.objectContaining({ kind: 'RECEIVED', actorName: 'Dueña' }),
        expect.objectContaining({
          kind: 'VOIDED',
          reason: 'Carga duplicada',
          actorName: 'Dueña',
        }),
      ]);
      expect(
        f.purchases.void(
          { purchaseId: received.id, operationKey, reason: 'Carga duplicada' },
          f.owner,
        ),
      ).toEqual(voided);
      expect(f.stock.get(product.id).quantityBase).toBe(1000);
      expect(
        f.db
          .prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE purchase_id=? AND kind='VOID'")
          .get(received.id),
      ).toEqual({ n: 1 });
    } finally {
      f.db.close();
    }
  });

  test('bloquea la anulación automática si hubo una salida posterior', () => {
    const f = fixture(true);
    try {
      const supplier = f.purchases.saveSupplier({ name: 'Pesquera Roja' });
      const product = f.catalog.save({
        sku: 'LEN-01',
        barcode: null,
        name: 'Lenguado',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 50000,
        active: true,
        trackStock: true,
        minStockBase: 0,
      });
      const opened = f.stock.opening({
        productId: product.id,
        countedBase: 1,
        reason: 'Conteo inicial',
        operationKey: randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
      });
      const received = f.purchases.receive(
        {
          receiptKey: randomUUID(),
          supplierId: supplier.id,
          businessDate: '2026-10-02',
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 2,
              unitCostCents: 10000,
              expectedProductRevision: opened.productRevision,
            },
          ],
        },
        f.owner,
      );
      const current = f.stock.get(product.id);
      f.stock.record({
        productId: product.id,
        deltaBase: -1,
        kind: 'WASTE',
        reason: 'Producto dañado',
        operationKey: randomUUID(),
        expectedRevision: current.revision,
        expectedProductRevision: current.productRevision,
      });
      expect(f.purchases.previewVoid(received.id).reversible).toBe(false);
      expect(() =>
        f.purchases.void(
          {
            purchaseId: received.id,
            operationKey: randomUUID(),
            reason: 'Carga duplicada',
          },
          f.owner,
        ),
      ).toThrow('movimientos posteriores');
    } finally {
      f.db.close();
    }
  });
});
