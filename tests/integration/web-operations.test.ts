import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { OperationsService } from '../../src/worker/operations/service';
function fixture() {
  const db = openDatabase(':memory:');
  const auth = new AuthService(db);
  const owner = auth.bootstrap({
    username: 'owner',
    name: 'Owner',
    password: 'Prueba-Bocha-2026!',
  }).user;
  return { db, owner, ops: new OperationsService(db) };
}
it('settings revision, terminal ownership, cash replay and immutable closure', () => {
  const f = fixture();
  try {
    const t = f.ops.execute('terminals.save', { name: 'Caja 1', active: true }, f.owner) as {
      id: string;
    };
    const input = { terminalId: t.id, openingCashCents: 1000, operationKey: randomUUID() };
    const shift = f.ops.execute('cash.open', input, f.owner) as { id: string };
    expect(f.ops.execute('cash.open', input, f.owner)).toEqual(shift);
    expect(() =>
      f.ops.execute('cash.open', { ...input, openingCashCents: 2000 }, f.owner),
    ).toThrow();
    f.ops.execute(
      'cash.movement',
      {
        shiftId: shift.id,
        kind: 'IN',
        amountCents: 300,
        reason: 'Ingreso',
        operationKey: randomUUID(),
      },
      f.owner,
    );
    const close = { shiftId: shift.id, countedCashCents: 1290, operationKey: randomUUID() };
    expect(f.ops.execute('cash.close', close, f.owner)).toMatchObject({
      status: 'CLOSED',
      expectedCashCents: 1300,
      differenceCents: -10,
    });
    expect(f.ops.execute('cash.close', close, f.owner)).toMatchObject({ expectedCashCents: 1300 });
    expect(() =>
      f.ops.execute(
        'cash.movement',
        {
          shiftId: shift.id,
          kind: 'OUT',
          amountCents: 1,
          reason: 'Salida',
          operationKey: randomUUID(),
        },
        f.owner,
      ),
    ).toThrow();
    const settings = f.ops.execute('settings.get', {}, f.owner) as { revision: number };
    f.ops.execute(
      'settings.save',
      {
        expectedRevision: settings.revision,
        businessName: 'Local',
        currency: 'ARS',
        paymentMethods: ['CASH'],
      },
      f.owner,
    );
    expect(() =>
      f.ops.execute(
        'settings.save',
        {
          expectedRevision: settings.revision,
          businessName: 'Otro',
          currency: 'ARS',
          paymentMethods: ['CASH'],
        },
        f.owner,
      ),
    ).toThrow();
  } finally {
    f.db.close();
  }
});
it('seller owns shifts, audit failure rolls back, drafts prevent close, exports neutralize formulas', () => {
  const f = fixture();
  try {
    const auth = new AuthService(f.db);
    const seller = auth.saveUser(
      auth.login({ username: 'owner', password: 'Prueba-Bocha-2026!' }).sessionToken,
      {
        username: 'seller',
        name: 'Seller',
        role: 'SELLER',
        active: true,
        password: 'Prueba-Bocha-2026!',
      },
    );
    const t = f.ops.execute('terminals.save', { name: 'Caja 1', active: true }, f.owner) as {
      id: string;
    };
    const shift = f.ops.execute(
      'cash.open',
      { terminalId: t.id, openingCashCents: 0, operationKey: randomUUID() },
      seller,
    ) as { id: string };
    expect(() =>
      f.ops.execute(
        'settings.save',
        { expectedRevision: 1, businessName: 'X', currency: 'ARS', paymentMethods: ['CASH'] },
        seller,
      ),
    ).toThrow();
    expect(() => f.ops.execute('audit.list', {}, seller)).toThrow();
    expect(() =>
      f.ops.execute('exports.sales', { fromDate: '2026-01-01', toDate: '2026-01-02' }, seller),
    ).toThrow();
    const other = { ...seller, id: f.owner.id };
    expect(() => f.ops.execute('shifts.details', { shiftId: shift.id }, other)).toThrow();
    f.db
      .prepare('INSERT INTO checkout_drafts VALUES (?,?,1,?,?)')
      .run(seller.id, seller.id, JSON.stringify({ lines: [{}] }), new Date().toISOString());
    expect(() =>
      f.ops.execute(
        'cash.close',
        { shiftId: shift.id, countedCashCents: 0, operationKey: randomUUID() },
        seller,
      ),
    ).toThrow('borrador');
    f.db.prepare('DELETE FROM checkout_drafts').run();
    f.db.exec(
      "CREATE TRIGGER audit_failure BEFORE INSERT ON audit_events WHEN NEW.operation='cash.movement' BEGIN SELECT RAISE(ABORT,'audit failed'); END",
    );
    expect(() =>
      f.ops.execute(
        'cash.movement',
        {
          shiftId: shift.id,
          kind: 'IN',
          amountCents: 100,
          operationKey: randomUUID(),
          reason: 'Ingreso',
        },
        seller,
      ),
    ).toThrow();
    expect(f.db.prepare('SELECT count(*) AS n FROM register_movements').get()).toEqual({ n: 0 });
    expect(() =>
      f.ops.execute(
        'cash.open',
        { terminalId: t.id, openingCashCents: 0, operationKey: randomUUID(), unexpected: true },
        seller,
      ),
    ).toThrow();
  } finally {
    f.db.close();
  }
});
it('mixed cash reconciles applied amount, refund in next shift leaves closure intact', () => {
  const f = fixture();
  try {
    const t = f.ops.execute('terminals.save', { name: 'Caja', active: true }, f.owner) as {
      id: string;
    };
    const shift = f.ops.execute(
      'cash.open',
      { terminalId: t.id, openingCashCents: 1000, operationKey: randomUUID() },
      f.owner,
    ) as { id: string };
    const saleId = randomUUID();
    f.db
      .prepare(
        "INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,register_shift_id,terminal_id) VALUES (?,1,?,'hash','COMPLETED',?,'2026-09-18','2026-09',1000,0,1000,'{}',?,?)",
      )
      .run(saleId, randomUUID(), new Date().toISOString(), shift.id, t.id);
    f.db
      .prepare('INSERT INTO sale_payments VALUES (?,?,0,?,?,?,?)')
      .run(randomUUID(), saleId, 'CASH', 600, 1000, 400);
    f.db
      .prepare('INSERT INTO sale_payments VALUES (?,?,1,?,?,NULL,0)')
      .run(randomUUID(), saleId, 'DEBIT', 400);
    const close = { shiftId: shift.id, countedCashCents: 1600, operationKey: randomUUID() };
    expect(f.ops.execute('cash.close', close, f.owner)).toMatchObject({ expectedCashCents: 1600 });
    const next = f.ops.execute(
      'cash.open',
      { terminalId: t.id, openingCashCents: 1600, operationKey: randomUUID() },
      f.owner,
    ) as { id: string };
    const sale = {
      id: saleId,
      number: 1,
      payments: [
        { method: 'CASH', amountCents: 600, changeCents: 400 },
        { method: 'DEBIT', amountCents: 400, changeCents: 0 },
      ],
    } as import('../../src/shared/sales').SaleDetail;
    f.db.transaction(() => {
      f.db.prepare("UPDATE sales SET status='VOIDED' WHERE id=?").run(saleId);
      f.ops.cash.refund(sale, next.id, f.owner);
      f.ops.cash.refund(sale, next.id, f.owner);
    })();
    expect(f.ops.execute('shifts.details', { shiftId: next.id }, f.owner)).toMatchObject({
      expectedCashCents: 1000,
    });
    expect(f.ops.execute('cash.close', close, f.owner)).toMatchObject({ expectedCashCents: 1600 });
    expect(f.db.prepare('SELECT count(*) AS n FROM register_movements').get()).toEqual({ n: 1 });
  } finally {
    f.db.close();
  }
});
it('CSV exports are bounded, exclude credentials and neutralize spreadsheet formulas', () => {
  const f = fixture();
  try {
    const now = new Date().toISOString();
    f.db
      .prepare("INSERT INTO products VALUES (?,? ,NULL,?,? ,NULL,'UNIT',100,1,0,0,0,1,?,?)")
      .run(randomUUID(), '=IMPORT', '@SUM(1)', 'sum', now, now);
    const date = now.slice(0, 10);
    const exported = f.ops.execute(
      'exports.products',
      { fromDate: date, toDate: date },
      f.owner,
    ) as { content: string; mimeType: string };
    expect(exported.content.startsWith('\uFEFF')).toBe(true);
    expect(exported.content).toContain("'=IMPORT");
    expect(exported.content).toContain("'@SUM(1)");
    expect(exported.content).not.toContain('password_hash');
    expect(() =>
      f.ops.execute('exports.sales', { fromDate: '2020-01-01', toDate: '2026-01-01' }, f.owner),
    ).toThrow();
    const first = f.ops.execute('audit.list', { limit: 1 }, f.owner) as {
      items: unknown[];
      nextCursor: string | null;
    };
    expect(first.items.length).toBeLessThanOrEqual(1);
  } finally {
    f.db.close();
  }
});
it('movement exact retry survives close, changed payload and reused cross-operation key reject', () => {
  const f = fixture();
  try {
    const t = f.ops.execute('terminals.save', { name: 'Caja', active: true }, f.owner) as {
      id: string;
    };
    const opening = { terminalId: t.id, openingCashCents: 100, operationKey: randomUUID() };
    const shift = f.ops.execute('cash.open', opening, f.owner) as { id: string };
    const movement = {
      shiftId: shift.id,
      kind: 'OUT',
      amountCents: 25,
      reason: 'Retiro',
      operationKey: randomUUID(),
    };
    const result = f.ops.execute('cash.movement', movement, f.owner);
    const close = { shiftId: shift.id, countedCashCents: 75, operationKey: randomUUID() };
    f.ops.execute('cash.close', close, f.owner);
    expect(f.ops.execute('cash.movement', movement, f.owner)).toEqual(result);
    expect(() => f.ops.execute('cash.movement', { ...movement, amountCents: 26 }, f.owner)).toThrow(
      'otros datos',
    );
    expect(() => f.ops.execute('cash.close', { ...close, countedCashCents: 74 }, f.owner)).toThrow(
      'otros datos',
    );
    expect(() =>
      f.ops.execute('cash.movement', { ...movement, operationKey: opening.operationKey }, f.owner),
    ).toThrow('utilizada');
  } finally {
    f.db.close();
  }
});
it('audit keyset pagination has no duplicates and cursor cannot change filters', () => {
  const f = fixture();
  try {
    for (let i = 0; i < 4; i++)
      f.ops.execute('terminals.save', { name: 'Caja ' + i, active: true }, f.owner);
    const first = f.ops.execute(
      'audit.list',
      { limit: 2, operation: 'terminals.save' },
      f.owner,
    ) as { items: { id: string }[]; nextCursor: string };
    const second = f.ops.execute(
      'audit.list',
      { limit: 2, operation: 'terminals.save', cursor: first.nextCursor },
      f.owner,
    ) as { items: { id: string }[]; nextCursor: string | null };
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(new Set([...first.items, ...second.items].map((r) => r.id)).size).toBe(4);
    expect(second.nextCursor).toBeNull();
    expect(() =>
      f.ops.execute(
        'audit.list',
        { limit: 2, operation: 'cash.open', cursor: first.nextCursor },
        f.owner,
      ),
    ).toThrow('página');
  } finally {
    f.db.close();
  }
});
