import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { ReturnService } from '../../src/worker/returns/service';
import { MonthlyReports } from '../../src/worker/reports/queries';
import { CashService, type RegisterShift } from '../../src/worker/operations/cash';

function fixture() {
  const db = openDatabase(':memory:');
  const actor = new AuthService(db).bootstrap({
    name: 'Dueña',
    username: 'jefe',
    password: 'Prueba-Perla-2026!',
  }).user;
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const drafts = new DraftRepository(db);
  const sales = new SalesService(db, catalog, stock, drafts);
  const product = catalog.save({
    sku: 'SALMON',
    barcode: null,
    name: 'Salmón rosado',
    category: 'Pescados',
    saleUnit: 'KG',
    priceCents: 1200000,
    active: true,
    trackStock: true,
    minStockBase: 100,
  });
  const opened = stock.opening({
    productId: product.id,
    countedBase: 1000,
    reason: 'Conteo inicial',
    operationKey: randomUUID(),
    expectedRevision: 0,
    expectedProductRevision: product.revision,
  });
  const sale = sales.complete({
    checkoutKey: randomUUID(),
    lines: [
      {
        lineId: randomUUID(),
        productId: product.id,
        quantityBase: 250,
        expectedProductRevision: opened.productRevision,
        expectedPriceCents: product.priceCents,
      },
    ],
    discount: { type: 'NONE' },
    payments: [{ method: 'CASH', amountCents: 300000 }],
  });
  return { db, actor, stock, sale, returns: new ReturnService(db, stock, sales) };
}

describe('devoluciones parciales', () => {
  it('conserva los centavos al devolver por partes una venta con descuento', () => {
    const f = fixture();
    try {
      const catalog = new CatalogRepository(f.db);
      const product = catalog.save({
        sku: 'LAVANDINA',
        barcode: null,
        name: 'Lavandina 1 L',
        category: 'Limpieza',
        saleUnit: 'UNIT',
        priceCents: 136938,
        active: true,
        trackStock: true,
        minStockBase: 1,
      });
      const opening = f.stock.opening({
        productId: product.id,
        countedBase: 10,
        reason: 'Stock inicial',
        operationKey: randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
      });
      const sales = new SalesService(f.db, catalog, f.stock, new DraftRepository(f.db));
      const sale = sales.complete({
        checkoutKey: randomUUID(),
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: 3,
            expectedProductRevision: opening.productRevision,
            expectedPriceCents: product.priceCents,
          },
        ],
        discount: { type: 'FIXED', amountCents: 20540 },
        payments: [{ method: 'DEBIT', amountCents: 390274 }],
      });
      const returns = new ReturnService(f.db, f.stock, sales);
      for (let n = 0; n < 3; n++) {
        const result = returns.confirm(
          {
            saleId: sale.id,
            operationKey: randomUUID(),
            reason: 'Devolución de una unidad',
            refundMethod: 'DEBIT',
            items: [{ saleItemId: sale.items[0]!.id, quantityBase: 1, disposition: 'RESTOCK' }],
          },
          f.actor,
        );
        expect(result.totalCents).toBeGreaterThan(0);
      }
      expect(
        f.db
          .prepare(
            'SELECT SUM(gross_cents) gross, SUM(discount_cents) discount, SUM(net_cents) net FROM sale_return_items WHERE sale_item_id=?',
          )
          .get(sale.items[0]!.id),
      ).toEqual({ gross: 410814, discount: 20540, net: 390274 });
      expect(f.stock.get(product.id).quantityBase).toBe(10);
    } finally {
      f.db.close();
    }
  });
  it('prorratea, repone stock y conserva idempotencia sin exceder lo vendido', () => {
    const f = fixture();
    try {
      const operationKey = randomUUID();
      const first = f.returns.confirm(
        {
          saleId: f.sale.id,
          operationKey,
          reason: 'El cliente cambió de opinión',
          refundMethod: 'CASH',
          items: [
            {
              saleItemId: f.sale.items[0]!.id,
              quantityBase: 100,
              disposition: 'RESTOCK',
            },
          ],
        },
        f.actor,
      );
      expect(first).toMatchObject({ number: 1, totalCents: 120000, status: 'CONFIRMED' });
      const terminalId = randomUUID();
      f.db
        .prepare(
          'INSERT INTO terminals(id,name,active,revision,created_at_utc,updated_at_utc) VALUES (?,?,1,1,?,?)',
        )
        .run(terminalId, 'Caja devoluciones', 'now', 'now');
      const cash = new CashService(f.db);
      const shift = cash.open(
        { terminalId, openingCashCents: 200000, operationKey: randomUUID() },
        f.actor,
      ) as RegisterShift;
      const movement = f.db.transaction(() => cash.partialRefund(first, shift.id, f.actor))() as {
        id: string;
        shiftId: string;
      };
      expect(movement).toMatchObject({ shiftId: shift.id });
      expect(cash.expected(shift)).toBe(80000);
      expect(
        f.db.transaction(() => cash.partialRefund(first, shift.id, f.actor))() as {
          id: string;
          shiftId: string;
        },
      ).toEqual(movement);
      expect(f.stock.get(f.sale.items[0]!.productId).quantityBase).toBe(850);
      expect(new MonthlyReports(f.db).month(f.sale.localMonth).totals.netCents).toBe(180000);
      expect(f.returns.confirm(first.input, f.actor).id).toBe(first.id);
      expect(f.returns.listForSale(f.sale.id)).toMatchObject([
        { id: first.id, totalCents: 120000, refundMethod: 'CASH' },
      ]);
      expect(f.db.prepare('SELECT COUNT(*) AS n FROM sale_returns').get()).toEqual({ n: 1 });
      expect(() =>
        new SalesService(
          f.db,
          new CatalogRepository(f.db),
          f.stock,
          new DraftRepository(f.db),
        ).void({
          saleId: f.sale.id,
          operationKey: randomUUID(),
          reason: 'No debe duplicar la devolución',
        }),
      ).toThrow('devoluciones parciales');

      const preview = f.returns.preview(f.sale.id);
      expect(preview.items[0]).toMatchObject({
        soldQuantityBase: 250,
        returnedQuantityBase: 100,
        availableQuantityBase: 150,
        refundableCents: 180000,
      });
      const second = f.returns.confirm(
        {
          saleId: f.sale.id,
          operationKey: randomUUID(),
          reason: 'Devolución restante',
          refundMethod: 'DEBIT',
          items: [
            {
              saleItemId: f.sale.items[0]!.id,
              quantityBase: 150,
              disposition: 'WASTE',
            },
          ],
        },
        f.actor,
      );
      expect(second.totalCents).toBe(180000);
      expect(f.stock.get(f.sale.items[0]!.productId).quantityBase).toBe(850);
      expect(() =>
        f.returns.confirm(
          {
            saleId: f.sale.id,
            operationKey: randomUUID(),
            reason: 'Exceso',
            refundMethod: 'CASH',
            items: [
              {
                saleItemId: f.sale.items[0]!.id,
                quantityBase: 1,
                disposition: 'RESTOCK',
              },
            ],
          },
          f.actor,
        ),
      ).toThrow('devuelta');
    } finally {
      f.db.close();
    }
  });

  it('revierte la operación completa si falla después de tocar stock', () => {
    const f = fixture();
    try {
      f.db.exec(
        "CREATE TRIGGER reject_return_event BEFORE INSERT ON sale_return_events BEGIN SELECT RAISE(ABORT,'failure fixture'); END",
      );
      expect(() =>
        f.returns.confirm(
          {
            saleId: f.sale.id,
            operationKey: randomUUID(),
            reason: 'Prueba atómica',
            refundMethod: 'CASH',
            items: [
              {
                saleItemId: f.sale.items[0]!.id,
                quantityBase: 100,
                disposition: 'RESTOCK',
              },
            ],
          },
          f.actor,
        ),
      ).toThrow('failure fixture');
      expect(f.stock.get(f.sale.items[0]!.productId).quantityBase).toBe(750);
      expect(f.db.prepare('SELECT COUNT(*) AS n FROM sale_returns').get()).toEqual({ n: 0 });
    } finally {
      f.db.close();
    }
  });
});
