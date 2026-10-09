import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { OperationalControlService } from '../../src/worker/control/operations';
import type { CountSession } from '../../src/shared/operational-control';
import type { AgendaRow, ControlPage } from '../../src/shared/operational-control';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';
import { LotService } from '../../src/worker/lots/service';
import { CashService } from '../../src/worker/operations/cash';

function fixture() {
  const db = openDatabase(':memory:');
  const owner = new AuthService(db).bootstrap({
    name: 'Jefe',
    username: 'jefe',
    password: 'Prueba-2026!',
  }).user;
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const product = catalog.save({
    sku: 'COUNT-01',
    barcode: '123456',
    name: 'Artículo',
    saleUnit: 'UNIT',
    priceCents: 1000,
    active: true,
    category: null,
    trackStock: true,
    minStockBase: 0,
  });
  stock.opening({
    productId: product.id,
    countedBase: 12,
    reason: 'Inicial',
    operationKey: randomUUID(),
    expectedRevision: 0,
    expectedProductRevision: product.revision,
  });
  const service = new OperationalControlService(db);
  const locationId = (
    db.prepare('SELECT id FROM locations WHERE is_default=1').get() as { id: string }
  ).id;
  return { db, owner, product, stock, service, locationId };
}

test('recupera borrador, distingue vacío de cero, rechaza stock cambiado y aplica una sola vez', () => {
  const f = fixture();
  try {
    const session = f.service.execute(
      'countStart',
      { locationId: f.locationId },
      f.owner,
    ) as CountSession;
    expect(session.lines[0]!.countedBase).toBeNull();
    const counted = f.service.execute(
      'countLine',
      {
        sessionId: session.id,
        expectedRevision: session.revision,
        productId: f.product.id,
        countedBase: 10,
      },
      f.owner,
    ) as CountSession;
    expect(
      (
        new OperationalControlService(f.db).execute(
          'countGet',
          { sessionId: session.id },
          f.owner,
        ) as CountSession
      ).lines[0]!.differenceBase,
    ).toBe(-2);
    const input = {
      sessionId: counted.id,
      expectedRevision: counted.revision,
      productIds: [f.product.id],
      reason: 'Conteo físico',
      operationKey: randomUUID(),
    };
    const applied = f.service.execute('countApply', input, f.owner);
    expect(f.service.execute('countApply', input, f.owner)).toEqual(applied);
    expect(f.stock.get(f.product.id).quantityBase).toBe(10);
    const next = f.service.execute(
      'countStart',
      { locationId: f.locationId },
      f.owner,
    ) as CountSession;
    const zero = f.service.execute(
      'countLine',
      {
        sessionId: next.id,
        expectedRevision: next.revision,
        productId: f.product.id,
        countedBase: 0,
      },
      f.owner,
    ) as CountSession;
    const balance = f.stock.get(f.product.id);
    f.stock.record({
      productId: f.product.id,
      deltaBase: -1,
      kind: 'WASTE',
      reason: 'Merma real',
      operationKey: randomUUID(),
      expectedRevision: balance.revision,
      expectedProductRevision: balance.productRevision,
    });
    expect(() =>
      f.service.execute(
        'countApply',
        {
          ...input,
          sessionId: zero.id,
          expectedRevision: zero.revision,
          operationKey: randomUUID(),
        },
        f.owner,
      ),
    ).toThrow(/cambió|contar/);
    expect(f.stock.get(f.product.id).quantityBase).toBe(9);
    expect(
      (f.service.execute('countGet', { sessionId: zero.id }, f.owner) as CountSession).lines[0]!
        .status,
    ).toBe('REVIEW');
  } finally {
    f.db.close();
  }
});

test('vendedor no accede a conteos, caja ni agenda', () => {
  const f = fixture();
  try {
    for (const action of ['countSessions', 'cashDifferences', 'agenda'])
      expect(() => f.service.execute(action, {}, { ...f.owner, role: 'SELLER' })).toThrow(
        /permiso/,
      );
  } finally {
    f.db.close();
  }
});

test('fecha nullable no inventa vencimiento; cobro se imputa a obligación elegida y detecta saldo cambiado', () => {
  const db = openDatabase(':memory:');
  try {
    const auth = new AuthService(db),
      grant = auth.bootstrap({ name: 'Jefe', username: 'jefe', password: 'Prueba-2026!' }),
      app = new Application(db, auth),
      service = new OperationalControlService(db),
      features = new FeatureService(db);
    features.change(
      {
        expectedRevision: features.status().revision,
        enabled: { CUSTOMERS: true, CUSTOMER_CREDIT: true },
      },
      grant.user,
    );
    const customer = app.dispatch(
      'customers.save',
      { name: 'Cliente agenda' },
      grant.sessionToken,
    ) as { id: string; revision: number };
    app.dispatch(
      'customers.setCredit',
      {
        customerId: customer.id,
        expectedRevision: customer.revision,
        creditEnabled: true,
        creditLimitCents: 100000,
      },
      grant.sessionToken,
    );
    const p = app.dispatch(
      'products.save',
      {
        sku: 'AGENDA',
        barcode: null,
        name: 'Producto agenda',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 10000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      grant.sessionToken,
    ) as { id: string; revision: number };
    const sell = () =>
      app.dispatch(
        'sales.complete',
        {
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: p.id,
              quantityBase: 1,
              expectedProductRevision: p.revision,
              expectedPriceCents: 10000,
            },
          ],
          discount: { type: 'NONE' },
          customerId: customer.id,
          onAccountCents: 10000,
          payments: [],
        },
        grant.sessionToken,
      ) as { id: string };
    const first = sell(),
      second = sell();
    expect(
      (service.execute('agenda', { bucket: 'OVERDUE' }, grant.user) as ControlPage<AgendaRow>)
        .total,
    ).toBe(0);
    expect(
      (service.execute('agenda', { bucket: 'NO_DATE' }, grant.user) as ControlPage<AgendaRow>)
        .total,
    ).toBe(2);
    const due = {
      kind: 'CUSTOMER',
      obligationId: second.id,
      expectedRevision: 1,
      expectedBalanceCents: 10000,
      dueOn: '2020-01-01',
      reason: 'Fecha pactada',
    };
    service.execute('agendaDate', due, grant.user);
    expect(() => service.execute('agendaDate', due, grant.user)).toThrow(/cambió/);
    const payment = {
      operationKey: randomUUID(),
      customerId: customer.id,
      amountCents: 3000,
      businessDate: '2026-10-07',
      method: 'TRANSFER',
      allocations: [{ saleId: second.id, amountCents: 3000, expectedBalanceCents: 10000 }],
    };
    const collected = app.dispatch('customerAccounts.collect', payment, grant.sessionToken);
    expect(app.dispatch('customerAccounts.collect', payment, grant.sessionToken)).toEqual(
      collected,
    );
    const overdue = service.execute(
      'agenda',
      { bucket: 'OVERDUE' },
      grant.user,
    ) as ControlPage<AgendaRow>;
    expect(overdue.items[0]).toMatchObject({
      obligationId: second.id,
      balanceCents: 7000,
      dueOn: '2020-01-01',
    });
    expect(
      (
        db
          .prepare('SELECT balance_cents FROM customer_receivables WHERE sale_id=?')
          .get(first.id) as { balance_cents: number }
      ).balance_cents,
    ).toBe(10000);
    expect(() =>
      app.dispatch(
        'customerAccounts.collect',
        { ...payment, operationKey: randomUUID() },
        grant.sessionToken,
      ),
    ).toThrow(/cambió/);
  } finally {
    db.close();
  }
});

test('conteo por lotes conserva ledger y cantidades de ubicación en un ajuste idempotente', () => {
  const f = fixture();
  try {
    const features = new FeatureService(f.db);
    features.change(
      { expectedRevision: features.status().revision, enabled: { LOTS: true } },
      f.owner,
    );
    const lots = new LotService(f.db);
    lots.enable(f.product.id, f.owner);
    const [lot] = lots.reconcile({
      productId: f.product.id,
      operationKey: randomUUID(),
      actor: f.owner,
      lots: [{ code: 'L-01', expiresOn: '2026-10-01', quantityBase: 12 }],
    });
    const session = f.service.execute(
      'countStart',
      { locationId: f.locationId },
      f.owner,
    ) as CountSession;
    const counted = f.service.execute(
      'countLine',
      {
        sessionId: session.id,
        expectedRevision: session.revision,
        productId: f.product.id,
        countedBase: 10,
        lots: [{ lotId: lot!.id, countedBase: 10, expectedRevision: 1 }],
      },
      f.owner,
    ) as CountSession;
    const command = {
      sessionId: session.id,
      expectedRevision: counted.revision,
      productIds: [f.product.id],
      reason: 'Conteo por lote',
      operationKey: randomUUID(),
    };
    f.service.execute('countApply', command, f.owner);
    f.service.execute('countApply', command, f.owner);
    expect(lots.get(lot!.id).quantityBase).toBe(10);
    expect(
      (
        f.db
          .prepare(
            'SELECT quantity_base FROM location_lot_balances WHERE location_id=? AND lot_id=?',
          )
          .get(f.locationId, lot!.id) as { quantity_base: number }
      ).quantity_base,
    ).toBe(10);
    expect(
      (
        f.db
          .prepare(
            "SELECT COUNT(*) n FROM lot_movements WHERE lot_id=? AND reason='Conteo por lote'",
          )
          .get(lot!.id) as { n: number }
      ).n,
    ).toBe(1);
    expect(f.stock.get(f.product.id).quantityBase).toBe(10);
    const expiry = f.service.execute(
      'expiries',
      { bucket: 'EXPIRED', today: '2026-10-07', lotId: lot!.id, locationId: f.locationId },
      f.owner,
    ) as { items: { lotId: string; locationId: string; quantityBase: number }[] };
    expect(expiry.items[0]).toMatchObject({
      lotId: lot!.id,
      locationId: f.locationId,
      quantityBase: 10,
    });
  } finally {
    f.db.close();
  }
});

test('caja conserva faltantes/sobrantes al revisar y supervisor no obtiene agregados ni revisa', () => {
  const f = fixture();
  try {
    const cash = new CashService(f.db),
      terminalId = randomUUID(),
      now = new Date().toISOString();
    f.db
      .prepare('INSERT INTO terminals VALUES (?,?,1,1,?,?)')
      .run(terminalId, 'Caja prueba', now, now);
    const a = cash.open(
      { terminalId, openingCashCents: 10000, operationKey: randomUUID() },
      f.owner,
    ) as { id: string };
    cash.close({ shiftId: a.id, countedCashCents: 0, operationKey: randomUUID() }, f.owner);
    const b = cash.open(
      { terminalId, openingCashCents: 0, operationKey: randomUUID() },
      f.owner,
    ) as { id: string };
    cash.close({ shiftId: b.id, countedCashCents: 10000, operationKey: randomUUID() }, f.owner);
    const before = f.db.prepare('SELECT * FROM register_shifts ORDER BY id').all();
    const list = f.service.execute('cashDifferences', { status: 'ALL' }, f.owner) as {
      summary: { shortagesCents: number; surplusesCents: number };
    };
    expect(list.summary).toEqual({ shortagesCents: 10000, surplusesCents: 10000 });
    f.service.execute(
      'cashReview',
      { shiftId: a.id, expectedRevision: 0, note: 'Revisado con operador' },
      f.owner,
    );
    expect(f.db.prepare('SELECT * FROM register_shifts ORDER BY id').all()).toEqual(before);
    expect(() =>
      f.service.execute(
        'cashReview',
        { shiftId: a.id, expectedRevision: 0, note: 'Otra nota' },
        f.owner,
      ),
    ).toThrow(/cambió/);
    expect(
      f.service.execute('cashDifferences', {}, { ...f.owner, role: 'SUPERVISOR' }),
    ).not.toHaveProperty('summary');
    expect(() =>
      f.service.execute(
        'cashReview',
        { shiftId: b.id, expectedRevision: 0, note: 'Nota del supervisor' },
        { ...f.owner, role: 'SUPERVISOR' },
      ),
    ).toThrow(/jefe/);
  } finally {
    f.db.close();
  }
});
