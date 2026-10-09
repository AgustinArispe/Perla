import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { LotService } from '../../src/worker/lots/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { ReturnService } from '../../src/worker/returns/service';
import { PurchaseService } from '../../src/worker/purchases/service';

function fixture() {
  const db = openDatabase(':memory:');
  const actor = new AuthService(db).bootstrap({
    name: 'Dueña',
    username: 'jefe',
    password: 'Prueba-Perla-2026!',
  }).user;
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const product = catalog.save({
    sku: 'MER-01',
    barcode: null,
    name: 'Merluza congelada',
    category: 'Pescados',
    saleUnit: 'KG',
    priceCents: 900000,
    active: true,
    trackStock: true,
    minStockBase: 500,
  });
  stock.opening({
    productId: product.id,
    countedBase: 0,
    reason: 'Inicio sin mercadería',
    operationKey: randomUUID(),
    expectedRevision: 0,
    expectedProductRevision: product.revision,
  });
  return { db, actor, product, lots: new LotService(db) };
}

describe('lotes FEFO', () => {
  it('repone el lote original al anular una venta completa', () => {
    const f = fixture();
    try {
      f.lots.enable(f.product.id, f.actor);
      const lot = f.lots.receive({
        productId: f.product.id,
        code: 'ANULA-01',
        expiresOn: '2026-12-01',
        quantityBase: 500,
        operationKey: randomUUID(),
        actor: f.actor,
      });
      const catalog = new CatalogRepository(f.db);
      const stock = new StockService(f.db, catalog);
      const balance = stock.get(f.product.id);
      stock.record({
        productId: f.product.id,
        deltaBase: 500,
        kind: 'RECEIPT',
        reason: 'Ingreso',
        operationKey: randomUUID(),
        expectedRevision: balance.revision,
        expectedProductRevision: balance.productRevision,
      });
      const sales = new SalesService(f.db, catalog, stock, new DraftRepository(f.db), () => true, f.lots, () => true);
      const product = catalog.get(f.product.id);
      const sale = sales.complete({
        checkoutKey: randomUUID(),
        lines: [{ lineId: randomUUID(), productId: product.id, quantityBase: 250, expectedProductRevision: product.revision, expectedPriceCents: product.priceCents }],
        discount: { type: 'NONE' },
        payments: [{ method: 'CASH', amountCents: 225000 }],
      }, f.actor);
      expect(f.lots.get(lot.id).quantityBase).toBe(250);
      sales.void({ saleId: sale.id, operationKey: randomUUID(), reason: 'Venta equivocada' }, f.actor);
      expect(f.lots.get(lot.id).quantityBase).toBe(500);
    } finally {
      f.db.close();
    }
  });

  it('revierte una recepción por lote sólo si no tuvo movimientos posteriores', () => {
    const f = fixture();
    try {
      f.lots.enable(f.product.id, f.actor);
      const catalog = new CatalogRepository(f.db);
      const stock = new StockService(f.db, catalog);
      const purchases = new PurchaseService(f.db, catalog, stock, () => true, f.lots, () => true);
      const supplier = purchases.saveSupplier({ name: 'Puerto del Sur' });
      const product = catalog.get(f.product.id);
      const purchase = purchases.receive({
        receiptKey: randomUUID(),
        supplierId: supplier.id,
        businessDate: '2026-10-02',
        lines: [{
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 500,
          unitCostCents: 500000,
          expectedProductRevision: product.revision,
          lotCode: 'COMPRA-01',
          expiresOn: '2026-12-20',
        }],
      }, f.actor);
      expect(f.lots.list(product.id)[0]?.quantityBase).toBe(500);
      expect(purchases.previewVoid(purchase.id).reversible).toBe(true);
      purchases.void({ purchaseId: purchase.id, operationKey: randomUUID(), reason: 'Carga duplicada' }, f.actor);
      expect(f.lots.list(product.id)[0]?.quantityBase).toBe(0);
    } finally {
      f.db.close();
    }
  });

  it('conecta venta y devolución con el lote histórico sin cambiar Caja cuando no aplica', () => {
    const f = fixture();
    try {
      f.lots.enable(f.product.id, f.actor);
      const lot = f.lots.receive({
        productId: f.product.id,
        code: 'VENTA-01',
        expiresOn: '2026-12-01',
        quantityBase: 500,
        operationKey: randomUUID(),
        actor: f.actor,
      });
      const balance = new StockService(f.db, new CatalogRepository(f.db)).get(f.product.id);
      new StockService(f.db, new CatalogRepository(f.db)).record({
        productId: f.product.id,
        deltaBase: 500,
        kind: 'RECEIPT',
        reason: 'Ingreso de lote',
        operationKey: randomUUID(),
        expectedRevision: balance.revision,
        expectedProductRevision: balance.productRevision,
      });
      const catalog = new CatalogRepository(f.db);
      const stock = new StockService(f.db, catalog);
      const sales = new SalesService(
        f.db,
        catalog,
        stock,
        new DraftRepository(f.db),
        () => true,
        f.lots,
        () => true,
      );
      const product = catalog.get(f.product.id);
      const sale = sales.complete(
        {
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 250,
              expectedProductRevision: product.revision,
              expectedPriceCents: product.priceCents,
            },
          ],
          discount: { type: 'NONE' },
          payments: [{ method: 'CASH', amountCents: 225000 }],
        },
        f.actor,
      );
      expect(f.lots.get(lot.id).quantityBase).toBe(250);
      expect(f.db.prepare('SELECT quantity_base FROM sale_item_lots').get()).toEqual({
        quantity_base: 250,
      });
      const returns = new ReturnService(f.db, stock, sales, f.lots, () => true);
      returns.confirm(
        {
          saleId: sale.id,
          operationKey: randomUUID(),
          reason: 'Reingreso parcial',
          refundMethod: 'CASH',
          items: [
            { saleItemId: sale.items[0]!.id, quantityBase: 100, disposition: 'RESTOCK' },
          ],
        },
        f.actor,
      );
      expect(f.lots.get(lot.id).quantityBase).toBe(350);
    } finally {
      f.db.close();
    }
  });

  it('exige distribuir el stock existente antes de habilitar operaciones por lote', () => {
    const db = openDatabase(':memory:');
    try {
      const actor = new AuthService(db).bootstrap({
        name: 'Dueña',
        username: 'jefe',
        password: 'Prueba-Perla-2026!',
      }).user;
      const catalog = new CatalogRepository(db);
      const stock = new StockService(db, catalog);
      const product = catalog.save({
        sku: 'CAL-01',
        barcode: null,
        name: 'Calamar',
        category: 'Mariscos',
        saleUnit: 'KG',
        priceCents: 800000,
        active: true,
        trackStock: true,
        minStockBase: 200,
      });
      stock.opening({
        productId: product.id,
        countedBase: 500,
        reason: 'Conteo inicial',
        operationKey: randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
      });
      const lots = new LotService(db);
      lots.enable(product.id, actor);
      expect(() =>
        lots.receive({
          productId: product.id,
          code: 'NUEVO',
          expiresOn: null,
          quantityBase: 100,
          operationKey: randomUUID(),
          actor,
        }),
      ).toThrow('Distribuí');
      lots.reconcile({
        productId: product.id,
        operationKey: randomUUID(),
        actor,
        lots: [
          { code: 'ACTUAL-A', expiresOn: '2026-11-01', quantityBase: 300 },
          { code: 'ACTUAL-B', expiresOn: null, quantityBase: 200 },
        ],
      });
      expect(lots.list(product.id).map((lot) => lot.quantityBase)).toEqual([300, 200]);
    } finally {
      db.close();
    }
  });

  it('asigna primero el vencimiento más próximo y deja sin fecha para el final', () => {
    const f = fixture();
    try {
      f.lots.enable(f.product.id, f.actor);
      const late = f.lots.receive({
        productId: f.product.id,
        code: 'LOTE-TARDE',
        expiresOn: '2026-12-20',
        quantityBase: 500,
        operationKey: randomUUID(),
        actor: f.actor,
      });
      const early = f.lots.receive({
        productId: f.product.id,
        code: 'LOTE-PRONTO',
        expiresOn: '2026-11-10',
        quantityBase: 300,
        operationKey: randomUUID(),
        actor: f.actor,
      });
      const undated = f.lots.receive({
        productId: f.product.id,
        code: 'SIN-FECHA',
        expiresOn: null,
        quantityBase: 400,
        operationKey: randomUUID(),
        actor: f.actor,
      });
      expect(
        f.lots.allocate({
          productId: f.product.id,
          quantityBase: 650,
          businessDate: '2026-10-02',
          operationKey: randomUUID(),
          actor: f.actor,
        }),
      ).toEqual([
        { lotId: early.id, code: 'LOTE-PRONTO', quantityBase: 300 },
        { lotId: late.id, code: 'LOTE-TARDE', quantityBase: 350 },
      ]);
      expect(f.lots.get(undated.id).quantityBase).toBe(400);
      expect(f.lots.get(late.id).quantityBase).toBe(150);
    } finally {
      f.db.close();
    }
  });

  it('no vende vencidos o bloqueados y no deja un movimiento parcial', () => {
    const f = fixture();
    try {
      f.lots.enable(f.product.id, f.actor);
      const expired = f.lots.receive({
        productId: f.product.id,
        code: 'VENCIDO',
        expiresOn: '2026-09-30',
        quantityBase: 500,
        operationKey: randomUUID(),
        actor: f.actor,
      });
      const blocked = f.lots.receive({
        productId: f.product.id,
        code: 'BLOQUEADO',
        expiresOn: '2026-12-01',
        quantityBase: 500,
        operationKey: randomUUID(),
        actor: f.actor,
      });
      f.lots.setBlocked(blocked.id, true, f.actor);
      expect(() =>
        f.lots.allocate({
          productId: f.product.id,
          quantityBase: 1,
          businessDate: '2026-10-02',
          operationKey: randomUUID(),
          actor: f.actor,
        }),
      ).toThrow('lotes disponibles');
      expect(f.lots.get(expired.id).quantityBase).toBe(500);
      expect(f.lots.get(blocked.id).quantityBase).toBe(500);
    } finally {
      f.db.close();
    }
  });
});
