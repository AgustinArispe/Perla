import { ReturnService } from '../../src/worker/returns/service';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';
import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { DraftRepository } from '../../src/worker/drafts';
import { SalesService } from '../../src/worker/sales/service';
import { MonthlyReports } from '../../src/worker/reports/queries';
import { AuthService } from '../../src/worker/auth/service';
import { CostService } from '../../src/worker/costs/service';
it('concilia descuentos, aplicado sin vuelto, KG separado y anulaciones del mes original', () => {
  const db = openDatabase(':memory:');
  try {
    const owner = new AuthService(db).bootstrap({
      name: 'Dueña',
      username: 'jefe',
      password: 'Prueba-Perla-2026!',
    }).user;
    const catalog = new CatalogRepository(db),
      stock = new StockService(db, catalog),
      sales = new SalesService(db, catalog, stock, new DraftRepository(db));
    const p = catalog.save({
      sku: 'U',
      barcode: '001',
      name: 'Leche',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: true,
      minStockBase: 10,
    });
    const k = catalog.save({
      sku: 'K',
      barcode: '002',
      name: 'Jamón',
      category: null,
      saleUnit: 'KG',
      priceCents: 1200000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    const costs = new CostService(db);
    costs.setReference({ productId: k.id, unitCostCents: 600000, expectedRevision: 0 }, owner);
    db.prepare('WITH input(id,method,rate,covered,rev,effective,actor,name) AS (VALUES(?,?,?,?,?,?,?,?)) UPDATE products SET (cost_method,cost_rate_micros_per_base,cost_covered_quantity_base,cost_revision,cost_effective_at_utc,cost_actor_user_id,cost_actor_name)=(SELECT method,rate,covered,rev,effective,actor,name FROM input) WHERE id=(SELECT id FROM input)').run(
      p.id,
      'WEIGHTED_AVERAGE',
      400000000,
      10,
      1,
      new Date().toISOString(),
      owner.id,
      owner.name,
    );
    stock.opening({
      productId: p.id,
      countedBase: 10,
      expectedRevision: 0,
      expectedProductRevision: 1,
      reason: 'Conteo',
      operationKey: randomUUID(),
    });
    const line = (product: typeof p, qty: number) => ({
      lineId: randomUUID(),
      productId: product.id,
      expectedPriceCents: product.priceCents,
      expectedProductRevision: product.revision,
      quantityBase: qty,
    });
    const sale = sales.complete({
      checkoutKey: randomUUID(),
      lines: [line(catalog.get(p.id), 2), line(k, 250)],
      discount: { type: 'PERCENT', basisPoints: 1000 },
      payments: [
        { method: 'CASH', amountCents: 171800, tenderedCents: 200000 },
        { method: 'DEBIT', amountCents: 100000 },
      ],
    });
    const reports = new MonthlyReports(db);
    const report = reports.month(sale.localMonth);
    expect(report.totals).toMatchObject({
      grossCents: 302000,
      discountCents: 30200,
      netCents: 271800,
      saleCount: 1,
    });
    expect(report.payments.reduce((sum, p) => sum + p.amountCents, 0)).toBe(report.totals.netCents);
    expect(report.cardCents).toBe(100000);
    expect(report.rankings.revenue.reduce((sum, p) => sum + p.netCents, 0)).toBe(271800);
    expect(report.rankings.units[0]).toMatchObject({ productId: p.id, quantityBase: 2 });
    expect(report.rankings.kilos[0]).toMatchObject({ productId: k.id, quantityBase: 250 });
    expect(report.profitability).toMatchObject({
      knownCostCents: 150800,
      coveredNetCents: 271800,
      grossMarginCents: 121000,
      coverageBasisPoints: 10000,
      missingLineCount: 0,
    });
    expect(report.lowStock[0]).toMatchObject({
      productId: p.id,
      quantityBase: 8,
      minStockBase: 10,
      soldBase: 2,
    });
    catalog.setActive({
      productId: p.id,
      active: false,
      expectedRevision: catalog.get(p.id).revision,
    });
    expect(reports.month(sale.localMonth).lowStock).toHaveLength(0);
    expect(reports.month(sale.localMonth).rankings.units[0]?.name).toBe('Leche');
    sales.void({ saleId: sale.id, reason: 'Operación equivocada', operationKey: randomUUID() });
    const voided = reports.month(sale.localMonth);
    expect(voided.totals).toMatchObject({
      netCents: 0,
      saleCount: 0,
      voidedCents: 271800,
      voidedCount: 1,
    });
    expect(voided.payments.every((p) => p.amountCents === 0)).toBe(true);
    expect(reports.month('2000-01').comparison.changeBasisPoints).toBeNull();
  } finally {
    db.close();
  }
});

it('ubica devoluciones entre meses en el período del movimiento y conserva costos históricos', () => {
  const db = openDatabase(':memory:');
  try {
    const owner = new AuthService(db).bootstrap({
      name: 'Dueña',
      username: 'jefe',
      password: 'Prueba-Perla-2026!',
    }).user;
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const sales = new SalesService(db, catalog, stock, new DraftRepository(db));
    const returns = new ReturnService(db, stock, sales);
    const known = catalog.save({
      sku: 'KNOWN',
      barcode: null,
      name: 'Histórico',
      category: 'Original',
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    new CostService(db).setReference(
      { productId: known.id, unitCostCents: 400, expectedRevision: 0 },
      owner,
    );
    const missing = catalog.save({
      sku: 'MISSING',
      barcode: null,
      name: 'Sin costo',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 500,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    const complete = (product: typeof known, quantityBase: number) =>
      sales.complete({
        checkoutKey: randomUUID(),
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase,
            expectedProductRevision: product.revision,
            expectedPriceCents: product.priceCents,
          },
        ],
        discount: { type: 'NONE' },
        payments: [{ method: 'CASH', amountCents: product.priceCents * quantityBase }],
      });
    const september = complete(known, 2);
    const october = complete(missing, 1);
    db.prepare('UPDATE sales SET business_date=?,local_month=? WHERE id=?').run(
      '2026-09-15',
      '2026-09',
      september.id,
    );
    db.prepare('UPDATE sales SET business_date=?,local_month=? WHERE id=?').run(
      '2026-10-02',
      '2026-10',
      october.id,
    );
    const reports = new MonthlyReports(db);
    const closedBefore = reports.month('2026-09', new Date('2026-10-12T12:00:00Z'));
    const returned = returns.confirm(
      {
        saleId: september.id,
        operationKey: randomUUID(),
        reason: 'Devolución posterior',
        refundMethod: 'DEBIT',
        items: [{ saleItemId: september.items[0]!.id, quantityBase: 1, disposition: 'NONE' }],
      },
      owner,
    );
    db.prepare(
      "UPDATE sales SET business_date=?,local_month=? WHERE id=? AND document_type='RETURN'",
    ).run('2026-10-03', '2026-10', returned.id);
    db.prepare(
      "UPDATE sale_events SET created_at_utc=? WHERE sale_id=? AND kind='CONFIRMED'",
    ).run('2026-10-03T15:00:00Z', returned.id);
    db.prepare("UPDATE sale_events SET created_at_utc=? WHERE kind<>'CONFIRMED'").run(
      '2026-09-15T12:00:00Z',
    );
    new CostService(db).setReference(
      { productId: known.id, unitCostCents: 900, expectedRevision: 1 },
      owner,
    );
    const closedAfter = reports.month('2026-09', new Date('2026-10-12T12:00:00Z'));
    expect(closedAfter.rankings).toEqual(closedBefore.rankings);
    expect(closedAfter.profitability).toEqual(closedBefore.profitability);
    const report = reports.month('2026-10', new Date('2026-10-12T12:00:00Z'), true);
    expect(report.totals).toMatchObject({ netCents: -500, saleCount: 1, voidedCount: 0 });
    expect(report.rankings.revenue).toMatchObject([
      { productId: missing.id, netCents: 500, quantityBase: 1 },
      { productId: known.id, name: 'Histórico', netCents: -1000, quantityBase: -1 },
    ]);
    expect(report.profitability).toMatchObject({
      knownCostCents: -400,
      coveredNetCents: -1000,
      grossMarginCents: -600,
      coverageBasisPoints: 6666,
      missingLineCount: 1,
    });
    expect(report.profitability.products.reduce((sum, row) => sum + row.netCents, 0)).toBe(-500);
    expect(report.profitability.categories).toContainEqual(
      expect.objectContaining({ id: 'Sin categoría', netCents: 500 }),
    );
    expect(report.profitability.categories).toContainEqual(
      expect.objectContaining({
        id: 'Original',
        knownCostCents: -400,
        netCents: -1000,
        coverageBasisPoints: 10000,
      }),
    );
    expect(report.daily.find((row) => row.date === '2026-10-03')).toEqual({
      date: '2026-10-03',
      netCents: -1000,
      saleCount: 0,
    });
    expect(report.payments.find((row) => row.method === 'DEBIT')).toMatchObject({
      amountCents: -1000,
      saleCount: 0,
      refundCount: 1,
    });
    expect(report.lastChangedAt).toBe('2026-10-03T15:00:00Z');
    expect(report.previousDaily).toHaveLength(12);
    expect(report.previousDaily?.[0]?.date).toBe('2026-09-01');
    expect(report.previousDaily?.reduce((sum, row) => sum + row.netCents, 0)).toBe(
      report.comparison.previous.netCents,
    );
    const full = reports.month('2026-10', new Date('2026-11-02T12:00:00Z'));
    expect(full.daily).toHaveLength(31);
    expect(full.previousDaily).toHaveLength(30);
    expect(full.previousDaily?.[29]?.date).toBe('2026-09-30');
  } finally {
    db.close();
  }
});

it('conserva actividad de pago y cobertura cuando venta y devolución se compensan a cero', () => {
  const db = openDatabase(':memory:');
  try {
    const owner = new AuthService(db).bootstrap({
      name: 'Dueña',
      username: 'jefe',
      password: 'Prueba-Perla-2026!',
    }).user;
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const sales = new SalesService(db, catalog, stock, new DraftRepository(db));
    const product = catalog.save({
      sku: 'ZERO',
      barcode: null,
      name: 'Venta compensada',
      category: 'Prueba',
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    new CostService(db).setReference(
      { productId: product.id, unitCostCents: 400, expectedRevision: 0 },
      owner,
    );
    const sale = sales.complete({
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
      payments: [{ method: 'CASH', amountCents: 1000 }],
    });
    new ReturnService(db, stock, sales).confirm(
      {
        saleId: sale.id,
        operationKey: randomUUID(),
        reason: 'Se devuelve completa',
        refundMethod: 'CASH',
        items: [{ saleItemId: sale.items[0]!.id, quantityBase: 1, disposition: 'NONE' }],
      },
      owner,
    );
    const report = new MonthlyReports(db).month(sale.localMonth);
    expect(report.totals.netCents).toBe(0);
    expect(report.rankings.revenue).toMatchObject([{ quantityBase: 0, netCents: 0 }]);
    expect(report.profitability).toMatchObject({
      knownCostCents: 0,
      coveredNetCents: 0,
      grossMarginCents: 0,
      coverageBasisPoints: 10000,
      missingLineCount: 0,
      coverageBasis: 'ABSOLUTE_MOVEMENT_NET',
    });
    expect(report.payments.find((row) => row.method === 'CASH')).toMatchObject({
      amountCents: 0,
      saleCount: 1,
      refundCount: 1,
    });
  } finally {
    db.close();
  }
});

it('incluye ventas a cuenta en vendido y excluye sus cobros posteriores del pago de ventas', () => {
  const db = openDatabase(':memory:');
  try {
    const auth = new AuthService(db);
    const grant = auth.bootstrap({
      name: 'Dueña',
      username: 'jefe',
      password: 'Prueba-Perla-2026!',
    });
    const app = new Application(db, auth);
    const features = new FeatureService(db);
    features.change(
      {
        expectedRevision: features.status().revision,
        enabled: { CUSTOMERS: true, CUSTOMER_CREDIT: true },
      },
      grant.user,
    );
    const customer = app.dispatch(
      'customers.save',
      { name: 'Cliente a cuenta' },
      grant.sessionToken,
    ) as { id: string; revision: number };
    app.dispatch(
      'customers.setCredit',
      {
        customerId: customer.id,
        expectedRevision: customer.revision,
        creditEnabled: true,
        creditLimitCents: 10000,
      },
      grant.sessionToken,
    );
    const product = new CatalogRepository(db).save({
      sku: 'ACCOUNT',
      barcode: null,
      name: 'A cuenta',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    const sale = app.dispatch(
      'sales.complete',
      {
        checkoutKey: randomUUID(),
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: 1,
            expectedPriceCents: 1000,
            expectedProductRevision: product.revision,
          },
        ],
        discount: { type: 'NONE' },
        customerId: customer.id,
        onAccountCents: 1000,
        payments: [],
      },
      grant.sessionToken,
    ) as { localMonth: string; businessDate: string };
    app.dispatch(
      'customerAccounts.collect',
      {
        operationKey: randomUUID(),
        customerId: customer.id,
        amountCents: 1000,
        businessDate: sale.businessDate,
        method: 'TRANSFER',
      },
      grant.sessionToken,
    );
    const report = new MonthlyReports(db).month(sale.localMonth);
    expect(report.totals).toMatchObject({ netCents: 1000, saleCount: 1 });
    expect(report.rankings.revenue[0]?.netCents).toBe(1000);
    expect(report.payments.reduce((sum, row) => sum + row.amountCents, 0)).toBe(0);
    expect(report.payments.find((row) => row.method === 'TRANSFER')).toMatchObject({
      amountCents: 0,
      saleCount: 0,
      refundCount: 0,
    });
  } finally {
    db.close();
  }
});
