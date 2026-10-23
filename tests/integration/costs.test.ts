import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { CostService } from '../../src/worker/costs/service';
import { StockService } from '../../src/worker/stock/service';
import { PurchaseService } from '../../src/worker/purchases/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';

function fixture() {
  const db = openDatabase(':memory:');
  const owner = new AuthService(db).bootstrap({
    name: 'Dueña',
    username: 'jefe',
    password: 'Prueba-Perla-2026!',
  }).user;
  const catalog = new CatalogRepository(db);
  const costs = new CostService(db);
  return { db, owner, catalog, costs };
}

describe('costos vigentes', () => {
  test('guarda una referencia manual con historial y revisión optimista', () => {
    const f = fixture();
    try {
      const product = f.catalog.save({
        sku: 'SAL-01',
        barcode: null,
        name: 'Sal marina',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 2500,
        active: true,
        trackStock: false,
        minStockBase: 0,
      });
      expect(f.costs.get(product.id)).toBeNull();
      const saved = f.costs.setReference(
        { productId: product.id, unitCostCents: 1200, expectedRevision: 0 },
        f.owner,
      );
      expect(saved).toMatchObject({ method: 'REFERENCE', unitCostCents: 1200, revision: 1 });
      expect(() =>
        f.costs.setReference(
          { productId: product.id, unitCostCents: 1300, expectedRevision: 0 },
          f.owner,
        ),
      ).toThrow('cambió');
      expect(f.db.prepare('SELECT COUNT(*) n FROM product_cost_events').get()).toEqual({ n: 1 });
      f.costs.invalidateForUnitChange(product.id, 'UNIT', 'KG', f.owner);
      expect(f.costs.get(product.id)).toBeNull();
      expect(
        f.db.prepare("SELECT COUNT(*) n FROM product_cost_events WHERE kind='INVALIDATED'").get(),
      ).toEqual({ n: 1 });
    } finally {
      f.db.close();
    }
  });

  test('actualiza el promedio y puede restaurar el costo anterior', () => {
    const f = fixture();
    try {
      const product = f.catalog.save({
        sku: 'ATU-01',
        barcode: null,
        name: 'Atún',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 5000,
        active: true,
        trackStock: true,
        minStockBase: 0,
      });
      const supplierId = randomUUID();
      f.db
        .prepare(
          'INSERT INTO parties(id,name,search_name,is_supplier,created_at_utc,updated_at_utc) VALUES (?,?,?,1,?,?)',
        )
        .run(
          supplierId,
          'Proveedor',
          'proveedor',
          new Date().toISOString(),
          new Date().toISOString(),
        );
      const addPurchase = (purchaseId: string, itemId: string, number: number) => {
        const key = randomUUID();
        f.db
          .prepare("INSERT INTO purchases(id,number,receipt_key,payload_hash,supplier_id,supplier_name,supplier_phone,status,received_at_utc,business_date,total_cents,stock_applied,actor_user_id,actor_name) VALUES (?,?,?,?,?,?,NULL,'RECEIVED',?,?,?,?,?,?)")
          .run(
            purchaseId,
            number,
            key,
            key,
            supplierId,
            'Proveedor',
            new Date().toISOString(),
            '2026-10-02',
            1000,
            1,
            f.owner.id,
            f.owner.name,
          );
        f.db
          .prepare('INSERT INTO purchase_items(id,purchase_id,position,line_id,product_id,sku,barcode,name,unit,quantity_base,unit_cost_cents,subtotal_cents,product_revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(
            itemId,
            purchaseId,
            0,
            randomUUID(),
            product.id,
            product.sku,
            null,
            product.name,
            product.saleUnit,
            10,
            1000,
            10000,
            product.revision,
          );
      };
      const firstPurchaseId = randomUUID();
      const firstItemId = randomUUID();
      addPurchase(firstPurchaseId, firstItemId, 1);
      const first = f.costs.receive({
        product,
        oldQuantityBase: 10,
        receivedQuantityBase: 10,
        unitCostCents: 1000,
        purchaseId: firstPurchaseId,
        purchaseItemId: firstItemId,
        actor: f.owner,
      });
      expect(first.unitCostCents).toBe(1000);
      expect(f.costs.getUsable(product.id, 20)).toBeNull();
      expect(f.costs.getUsable(product.id, 10)?.unitCostCents).toBe(1000);
      const purchaseId = randomUUID();
      const itemId = randomUUID();
      addPurchase(purchaseId, itemId, 2);
      const second = f.costs.receive({
        product,
        oldQuantityBase: 20,
        receivedQuantityBase: 10,
        unitCostCents: 1600,
        purchaseId,
        purchaseItemId: itemId,
        actor: f.owner,
      });
      expect(second.unitCostCents).toBe(1300);
      expect(f.costs.canReversePurchaseItem(firstItemId)).toMatchObject({ reversible: false });
      expect(f.costs.canReversePurchaseItem(itemId)).toEqual({ reversible: true, reason: null });
      f.costs.reversePurchaseItem(itemId, f.owner, 'Compra anulada');
      expect(f.costs.get(product.id)?.unitCostCents).toBe(1000);
    } finally {
      f.db.close();
    }
  });

  test('una compra actualiza el promedio y cada venta congela su costo', () => {
    const f = fixture();
    try {
      const stock = new StockService(f.db, f.catalog);
      const purchases = new PurchaseService(f.db, f.catalog, stock, () => true);
      const drafts = new DraftRepository(f.db);
      const sales = new SalesService(f.db, f.catalog, stock, drafts);
      const supplier = purchases.saveSupplier({ name: 'Puerto Sur' });
      const product = f.catalog.save({
        sku: 'LAN-01',
        barcode: null,
        name: 'Langostinos',
        category: null,
        saleUnit: 'KG',
        priceCents: 120000,
        active: true,
        trackStock: true,
        minStockBase: 0,
      });
      stock.opening({
        productId: product.id,
        countedBase: 0,
        reason: 'Inicio',
        operationKey: randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
      });
      const current = f.catalog.get(product.id);
      purchases.receive(
        {
          receiptKey: randomUUID(),
          supplierId: supplier.id,
          businessDate: '2026-10-02',
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 1000,
              unitCostCents: 60000,
              expectedProductRevision: current.revision,
            },
          ],
        },
        f.owner,
      );
      expect(f.costs.get(product.id)?.unitCostCents).toBe(60000);

      const checkoutKey = randomUUID();
      const body = {
        checkoutKey,
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: 250,
            expectedProductRevision: current.revision,
            expectedPriceCents: product.priceCents,
          },
        ],
        discount: { type: 'NONE' as const },
      };
      drafts.save({ body, expectedRevision: 0 }, f.owner.id);
      const sale = sales.complete(
        { ...body, expectedDraftRevision: 1, payments: [{ method: 'CASH', amountCents: 30000 }] },
        f.owner,
      );
      expect(sale.items[0]).toMatchObject({ costMethod: 'WEIGHTED_AVERAGE', costCents: 15000 });
    } finally {
      f.db.close();
    }
  });
});
