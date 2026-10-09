import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { PurchaseService } from '../../src/worker/purchases/service';
import { ReplenishmentService } from '../../src/worker/control/replenishment';
import type { ReplenishmentOrder, SuggestionPage } from '../../src/shared/replenishment';

function fixture() {
  const db = openDatabase(':memory:');
  if (!db.prepare("SELECT name FROM sqlite_master WHERE name='replenishment_orders'").get())
    db.exec(readFileSync('src/worker/db/migrations/025_control_orders.sql', 'utf8'));
  db.prepare(
    "UPDATE business_features SET enabled=1 WHERE feature_key IN ('REPLENISHMENT','STOCK_CONTROL','SUPPLIERS_PURCHASES','SUPPLIER_ACCOUNTS')",
  ).run();
  const owner = new AuthService(db).bootstrap({
    name: 'Dueña',
    username: 'jefa',
    password: 'Prueba-Perla-2026!',
  }).user;
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const purchases = new PurchaseService(db, catalog, stock, () => true);
  const supplier = purchases.saveSupplier({ name: 'Proveedor' });
  let product = catalog.save({
    sku: 'REP-01',
    name: 'Producto',
    barcode: null,
    category: null,
    saleUnit: 'UNIT',
    priceCents: 100,
    active: true,
    trackStock: true,
    minStockBase: 20,
  });
  stock.opening({
    productId: product.id,
    operationKey: randomUUID(),
    expectedRevision: 0,
    expectedProductRevision: product.revision,
    countedBase: 3,
    reason: 'Conteo inicial',
  });
  product = catalog.get(product.id);
  const locationId = (
    db.prepare('SELECT id FROM locations WHERE is_default=1').get() as { id: string }
  ).id;
  const service = new ReplenishmentService(db);
  const call = (action: string, input: unknown) => service.execute(action, input, owner);
  return { db, owner, product, supplier, locationId, service, call, stock };
}

describe('reposición y pedidos', () => {
  test('recibe stock y lotes en el destino y revierte todo cuando falta el lote obligatorio', () => {
    const f = fixture();
    try {
      const destination = randomUUID(),
        now = new Date().toISOString();
      f.db
        .prepare('INSERT INTO locations VALUES(?,?,?,1,0,1,?,?)')
        .run(destination, 'Destino', 'DEST', now, now);
      f.db
        .prepare('INSERT INTO location_inventory_balances VALUES(?,?,0,1)')
        .run(destination, f.product.id);
      f.db.prepare("UPDATE business_features SET enabled=1 WHERE feature_key='LOTS'").run();
      f.db
        .prepare('INSERT INTO lot_product_settings VALUES(?,1,1,1,?,?,?)')
        .run(f.product.id, now, f.owner.id, f.owner.name);
      const draft = f.call('create', {
        locationId: destination,
        supplierId: f.supplier.id,
        operationKey: randomUUID(),
        lines: [
          { productId: f.product.id, quantityBase: 5, expectedProductRevision: f.product.revision },
        ],
      }) as ReplenishmentOrder;
      const order = f.call('confirm', {
        orderId: draft.id,
        expectedRevision: 1,
        operationKey: randomUUID(),
      }) as ReplenishmentOrder;
      const receipt = {
        orderId: order.id,
        expectedRevision: order.revision,
        operationKey: randomUUID(),
        businessDate: '2026-10-07',
        lines: [
          {
            lineId: order.lines[0]!.id,
            quantityBase: 2,
            unitCostCents: 100,
            expectedProductRevision: f.product.revision,
          },
        ],
      };
      expect(() => f.call('receive', receipt)).toThrow('código de lote');
      expect(f.db.prepare('SELECT COUNT(*) AS n FROM purchases').get()).toEqual({ n: 0 });
      expect(f.stock.get(f.product.id).quantityBase).toBe(3);
      f.call('receive', {
        ...receipt,
        lines: [{ ...receipt.lines[0]!, lotCode: 'NUEVO', expiresOn: '2026-12-01' }],
      });
      expect(
        f.db
          .prepare(
            'SELECT quantity_base AS qty FROM location_inventory_balances WHERE location_id=? AND product_id=?',
          )
          .get(destination, f.product.id),
      ).toEqual({ qty: 2 });
      expect(
        f.db
          .prepare(
            'SELECT quantity_base AS qty FROM location_inventory_balances WHERE location_id=? AND product_id=?',
          )
          .get(f.locationId, f.product.id),
      ).toEqual({ qty: 3 });
      expect(
        f.db
          .prepare(
            "SELECT b.location_id AS location,b.quantity_base AS qty FROM location_lot_balances b JOIN inventory_lots l ON l.id=b.lot_id WHERE l.code='NUEVO'",
          )
          .all(),
      ).toEqual([{ location: destination, qty: 2 }]);
    } finally {
      f.db.close();
    }
  });
  test('pagina y exporta los mismos filtros con 4000 artículos', () => {
    const f = fixture();
    try {
      const now = new Date().toISOString();
      const insert = f.db.prepare(
        "INSERT INTO products(id,sku,name,search_name,sale_unit,price_cents,active,track_stock,stock_initialized,min_stock_base,revision,created_at_utc,updated_at_utc) VALUES(?,?,?,?,'UNIT',100,1,1,1,20,1,?,?)",
      );
      const balance = f.db.prepare('INSERT INTO location_inventory_balances VALUES(?,?,3,1)');
      const total = f.db.prepare('INSERT INTO inventory_balances VALUES(?,3,1)');
      f.db
        .transaction(() => {
          for (let i = 1; i < 4000; i++) {
            const id = randomUUID();
            insert.run(id, `PERF-${i}`, `Medición ${i}`, `medicion ${i}`, now, now);
            balance.run(f.locationId, id);
            total.run(id);
          }
        })
        .immediate();
      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const started = performance.now();
        const page = f.call('suggest', {
          locationId: f.locationId,
          limit: 50,
          offset: i * 50,
        }) as SuggestionPage;
        durations.push(performance.now() - started);
        expect(page.total).toBe(4000);
        expect(page.items).toHaveLength(50);
      }
      const filters = { locationId: f.locationId, query: 'Medición 3999' };
      const filtered = f.call('suggest', filters) as SuggestionPage;
      const exported = f.call('export', { dataset: 'suggestions', filters }) as {
        sheets: { rows: unknown[] }[];
      };
      expect(exported.sheets[0]!.rows).toEqual(filtered.items);
      console.info(
        `Reposición SQLite 4000 productos: ${durations.map((ms) => ms.toFixed(1)).join(', ')} ms (5 consultas, entorno local)`,
      );
    } finally {
      f.db.close();
    }
  });
  test('incluye días abiertos sin ventas y devoluciones, sin mezclar gramos con unidades', () => {
    const f = fixture();
    try {
      f.call('saveCalendar', {
        locationId: f.locationId,
        expectedRevision: 0,
        openWeekdays: [1, 2, 3, 4, 5, 6],
        closedDates: [],
      });
      const saleId = randomUUID(),
        itemId = randomUUID(),
        returnId = randomUUID();
      f.db
        .prepare(
          "INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,location_id) VALUES(?,1,?,'hash','COMPLETED','2026-10-01T12:00:00Z','2026-10-01','2026-10',2800,0,2800,'{}',?)",
        )
        .run(saleId, randomUUID(), f.locationId);
      f.db
        .prepare(
          "INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents) VALUES(?,?,?,0,?,'REP-01','Producto','UNIT',100,28,2800,0,2800)",
        )
        .run(itemId, saleId, randomUUID(), f.product.id);
      f.db
        .prepare(
          "INSERT INTO sale_returns(id,number,sale_id,operation_key,payload_hash,input_json,status,reason,total_cents,actor_user_id,actor_name,created_at_utc,business_date,local_month) VALUES(?,1,?,?,'hash','{}','CONFIRMED','Devolución',700,?,'Dueña','2026-10-07T12:00:00Z','2026-10-07','2026-10')",
        )
        .run(returnId, saleId, randomUUID(), f.owner.id);
      f.db
        .prepare(
          "INSERT INTO sale_return_items(id,return_id,sale_item_id,product_id,quantity_base,gross_cents,discount_cents,net_cents,disposition) VALUES(?,?,?,?,7,700,0,700,'NONE')",
        )
        .run(randomUUID(), returnId, itemId, f.product.id);
      expect(
        (f.call('suggest', { locationId: f.locationId, asOf: '2026-10-07' }) as SuggestionPage)
          .items[0],
      ).toMatchObject({ observedOpenDays: 6, dailyDemand: 3.5, targetBase: 25, suggestedBase: 22 });
      const newerSale=randomUUID();
      f.db.prepare("INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,location_id) VALUES(?,2,?,'hash','COMPLETED','2026-10-06T12:00:00Z','2026-10-06','2026-10',2800,0,2800,'{}',?)").run(newerSale,randomUUID(),f.locationId);
      f.db.prepare("INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents) VALUES(?,?,?,0,?,'REP-01','Producto','UNIT',100,28,2800,0,2800)").run(randomUUID(),newerSale,randomUUID(),f.product.id);
      expect((f.call('suggest',{locationId:f.locationId,asOf:'2026-10-07',referenceDays:2}) as SuggestionPage).items[0]).toMatchObject({observedOpenDays:2,dailyDemand:10.5,targetBase:74});
      f.db.prepare('DELETE FROM sale_items WHERE sale_id=?').run(newerSale);
      f.db.prepare('DELETE FROM sales WHERE id=?').run(newerSale);
      f.db.prepare("UPDATE sale_items SET unit='KG',quantity_base=28000 WHERE id=?").run(itemId);
      f.db
        .prepare('UPDATE sale_return_items SET quantity_base=7000 WHERE sale_item_id=?')
        .run(itemId);
      f.db.prepare("UPDATE products SET sale_unit='KG' WHERE id=?").run(f.product.id);
      expect(
        (f.call('suggest', { locationId: f.locationId, asOf: '2026-10-07' }) as SuggestionPage)
          .items[0],
      ).toMatchObject({ unit: 'KG', dailyDemand: 3500, targetBase: 24500, suggestedBase: 24497 });
      f.db.prepare('UPDATE products SET active=0 WHERE id=?').run(f.product.id);
      expect(
        (f.call('suggest', { locationId: f.locationId, asOf: '2026-10-07' }) as SuggestionPage)
          .items,
      ).toHaveLength(0);
    } finally {
      f.db.close();
    }
  });
  test('excluye lotes bloqueados/vencidos y revalida ventas concurrentes al confirmar', () => {
    const f = fixture();
    try {
      for (const [code, state, expires] of [
        ['B', 'BLOCKED', null],
        ['V', 'ACTIVE', '2026-10-01'],
      ] as const) {
        const id = randomUUID();
        f.db
          .prepare('INSERT INTO inventory_lots VALUES(?,?,?,?,?,1,1,?,?)')
          .run(
            id,
            f.product.id,
            code,
            expires,
            state,
            new Date().toISOString(),
            new Date().toISOString(),
          );
        f.db.prepare('INSERT INTO location_lot_balances VALUES(?,?,1,1)').run(f.locationId, id);
      }
      expect(
        (f.call('suggest', { locationId: f.locationId, asOf: '2026-10-07' }) as SuggestionPage)
          .items[0],
      ).toMatchObject({ availableBase: 1, suggestedBase: 19 });
      const draft = f.call('create', {
        locationId: f.locationId,
        supplierId: f.supplier.id,
        operationKey: randomUUID(),
        lines: [
          { productId: f.product.id, quantityBase: 5, expectedProductRevision: f.product.revision },
        ],
      }) as ReplenishmentOrder;
      f.db
        .prepare(
          'UPDATE location_inventory_balances SET quantity_base=2,revision=revision+1 WHERE location_id=? AND product_id=?',
        )
        .run(f.locationId, f.product.id);
      const input = { orderId: draft.id, expectedRevision: 1, operationKey: randomUUID() };
      expect(() => f.call('confirm', input)).toThrow('existencia cambió');
      expect(f.call('confirm', { ...input, acceptChangedStock: true })).toMatchObject({
        status: 'ORDERED',
      });
    } finally {
      f.db.close();
    }
  });
  test('reconfirma la fecha de pedidos retrasados sin duplicar el compromiso', () => {
    const f = fixture();
    try {
      const draft = f.call('create', {
        locationId: f.locationId,
        supplierId: f.supplier.id,
        expectedDate: '2026-10-01',
        operationKey: randomUUID(),
        lines: [
          { productId: f.product.id, quantityBase: 5, expectedProductRevision: f.product.revision },
        ],
      }) as ReplenishmentOrder;
      const order = f.call('confirm', {
        orderId: draft.id,
        expectedRevision: 1,
        operationKey: randomUUID(),
      }) as ReplenishmentOrder;
      const query = { locationId: f.locationId, asOf: '2026-10-07' };
      expect((f.call('suggest', query) as SuggestionPage).items[0]).toMatchObject({
        incomingBase: 0,
        overdueBase: 5,
        suggestedBase: 17,
      });
      f.call('reschedule', {
        orderId: order.id,
        expectedRevision: order.revision,
        expectedDate: '2026-10-09',
        operationKey: randomUUID(),
      });
      expect((f.call('suggest', query) as SuggestionPage).items[0]).toMatchObject({
        incomingBase: 5,
        overdueBase: 0,
        suggestedBase: 12,
      });
    } finally {
      f.db.close();
    }
  });
  test('redondea por unidad de compra y conserva aislada la existencia del depósito', () => {
    const f = fixture();
    try {
      f.call('saveProductRule', {
        productId: f.product.id,
        expectedRevision: 0,
        purchaseMultipleBase: 6,
      });
      const location = randomUUID();
      f.db
        .prepare('INSERT INTO locations VALUES(?,?,?,1,0,1,?,?)')
        .run(location, 'Depósito', 'DEP', new Date().toISOString(), new Date().toISOString());
      f.db
        .prepare('INSERT INTO location_inventory_balances VALUES(?,?,40,1)')
        .run(location, f.product.id);
      expect(
        (f.call('suggest', { locationId: f.locationId }) as SuggestionPage).items[0],
      ).toMatchObject({ availableBase: 3, suggestedBase: 18, otherLocationBase: 40 });
      expect(
        (f.call('suggest', { locationId: location }) as SuggestionPage).items[0],
      ).toMatchObject({ availableBase: 40, suggestedBase: 0 });
      f.db.prepare('DELETE FROM location_inventory_balances WHERE location_id=?').run(location);
      expect(
        (f.call('suggest', { locationId: location }) as SuggestionPage).items[0],
      ).toMatchObject({ availableBase: null, suggestedBase: null, reason: 'Revisar conteo' });
    } finally {
      f.db.close();
    }
  });
  test('descuenta solo confirmado dentro del horizonte y recibe parcialmente una sola compra/deuda', () => {
    const f = fixture();
    try {
      const base = {
        locationId: f.locationId,
        supplierId: f.supplier.id,
        expectedDate: '2026-10-09',
        operationKey: randomUUID(),
        lines: [
          {
            productId: f.product.id,
            quantityBase: 5,
            estimatedCostCents: 100,
            expectedProductRevision: f.product.revision,
          },
        ],
      };
      const draft = f.call('create', base) as ReplenishmentOrder;
      const query = { locationId: f.locationId, asOf: '2026-10-07', coverageDays: 7 };
      expect((f.call('suggest', query) as SuggestionPage).items[0]).toMatchObject({
        suggestedBase: 17,
        incomingBase: 0,
      });
      const ordered = f.call('confirm', {
        orderId: draft.id,
        expectedRevision: draft.revision,
        operationKey: randomUUID(),
      }) as ReplenishmentOrder;
      expect((f.call('suggest', query) as SuggestionPage).items[0]).toMatchObject({
        suggestedBase: 12,
        incomingBase: 5,
      });
      const receipt = {
        orderId: ordered.id,
        expectedRevision: ordered.revision,
        operationKey: randomUUID(),
        businessDate: '2026-10-07',
        lines: [
          {
            lineId: ordered.lines[0]!.id,
            quantityBase: 2,
            unitCostCents: 150,
            expectedProductRevision: f.product.revision,
          },
        ],
      };
      expect(f.call('receive', receipt)).toMatchObject({
        status: 'PARTIAL',
        lines: [expect.objectContaining({ receivedBase: 2, pendingBase: 3 })],
      });
      f.call('receive', receipt);
      expect(f.stock.get(f.product.id).quantityBase).toBe(5);
      expect(f.db.prepare('SELECT COUNT(*) AS n FROM purchases').get()).toEqual({ n: 1 });
      expect(
        f.db
          .prepare('SELECT COUNT(*) AS n,SUM(balance_cents) AS balance FROM supplier_payables')
          .get(),
      ).toEqual({ n: 1, balance: 300 });
      expect(() =>
        f.call('receive', { ...receipt, lines: [{ ...receipt.lines[0], quantityBase: 3 }] }),
      ).toThrow('identificador');
    } finally {
      f.db.close();
    }
  });
  test('rechaza permisos, datos extra, revisiones viejas y conserva compromisos con módulo oculto', () => {
    const f = fixture();
    try {
      expect(() =>
        f.service.execute('suggest', { locationId: f.locationId }, { ...f.owner, role: 'SELLER' }),
      ).toThrow();
      expect(() => f.call('suggest', { locationId: f.locationId, injected: true })).toThrow();
      const draft = f.call('create', {
        locationId: f.locationId,
        supplierId: f.supplier.id,
        operationKey: randomUUID(),
        lines: [
          { productId: f.product.id, quantityBase: 5, expectedProductRevision: f.product.revision },
        ],
      }) as ReplenishmentOrder;
      f.call('confirm', { orderId: draft.id, expectedRevision: 1, operationKey: randomUUID() });
      expect(() =>
        f.call('cancel', {
          orderId: draft.id,
          expectedRevision: 1,
          operationKey: randomUUID(),
          reason: 'Cancelar resto',
        }),
      ).toThrow('cambió');
      f.db
        .prepare("UPDATE business_features SET enabled=0 WHERE feature_key='REPLENISHMENT'")
        .run();
      expect(f.call('list', {})).toMatchObject({ total: 1 });
      expect(() => f.call('create', {})).toThrow('desactivada');
    } finally {
      f.db.close();
    }
  });
});
