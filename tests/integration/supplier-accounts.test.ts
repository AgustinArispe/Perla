import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { PurchaseService } from '../../src/worker/purchases/service';
import { SupplierAccountService } from '../../src/worker/supplier-accounts/service';
import { CashService, type RegisterShift } from '../../src/worker/operations/cash';

function fixture() {
  const db = openDatabase(':memory:');
  const owner = new AuthService(db).bootstrap({
    name: 'Dueña',
    username: 'jefe',
    password: 'Prueba-Cuentas-2026!',
  }).user;
  const catalog = new CatalogRepository(db);
  const stock = new StockService(db, catalog);
  const cash = new CashService(db);
  const accounts = new SupplierAccountService(db, cash);
  const purchases = new PurchaseService(
    db,
    catalog,
    stock,
    () => false,
    undefined,
    () => false,
    accounts,
    () => true,
  );
  const supplier = purchases.saveSupplier({ name: 'Puerto del Sur' });
  const product = catalog.save({
    sku: 'PES-01',
    barcode: null,
    name: 'Pescado fresco',
    category: null,
    saleUnit: 'UNIT',
    priceCents: 20_000,
    active: true,
    trackStock: false,
    minStockBase: 0,
  });
  const receive = (date: string, quantity: number) =>
    purchases.receive(
      {
        receiptKey: randomUUID(),
        supplierId: supplier.id,
        businessDate: date,
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: quantity,
            unitCostCents: 10_000,
            expectedProductRevision: product.revision,
          },
        ],
      },
      owner,
    );
  return { db, owner, accounts, purchases, supplier, receive, cash };
}

describe('cuenta de proveedores', () => {
  test('crea deuda y aplica pagos parciales FIFO de forma idempotente', () => {
    const f = fixture();
    try {
      const first = f.receive('2026-10-01', 2);
      const second = f.receive('2026-10-02', 2);
      const operationKey = randomUUID();
      const payment = f.accounts.pay(
        {
          operationKey,
          supplierId: f.supplier.id,
          amountCents: 30_000,
          businessDate: '2026-10-03',
          method: 'TRANSFER',
        },
        f.owner,
      );
      expect(payment.allocations).toEqual([
        { purchaseId: first.id, purchaseNumber: first.number, amountCents: 20_000 },
        { purchaseId: second.id, purchaseNumber: second.number, amountCents: 10_000 },
      ]);
      expect(f.accounts.pay({
        operationKey,
        supplierId: f.supplier.id,
        amountCents: 30_000,
        businessDate: '2026-10-03',
        method: 'TRANSFER',
      }, f.owner)).toEqual(payment);
      expect(f.accounts.detail(f.supplier.id)).toMatchObject({
        balanceCents: 10_000,
        creditCents: 0,
        payables: [
          { purchaseId: first.id, balanceCents: 0, status: 'PAID' },
          { purchaseId: second.id, balanceCents: 10_000, status: 'OPEN' },
        ],
      });
      expect(() => f.accounts.pay({
        operationKey: randomUUID(),
        supplierId: f.supplier.id,
        amountCents: 10_001,
        businessDate: '2026-10-03',
        method: 'TRANSFER',
      }, f.owner)).toThrow('supera');
      f.accounts.pay({
        operationKey: randomUUID(),
        supplierId: f.supplier.id,
        amountCents: 5_000,
        businessDate: '2026-10-04',
        method: 'TRANSFER',
        allocations: [{ purchaseId: second.id, amountCents: 5_000 }],
      }, f.owner);
      expect(f.accounts.detail(f.supplier.id).balanceCents).toBe(5_000);
    } finally {
      f.db.close();
    }
  });

  test('vincula efectivo una sola vez y una anulación pagada deja crédito', () => {
    const f = fixture();
    try {
      const purchase = f.receive('2026-10-01', 2);
      const terminalId = randomUUID();
      f.db.prepare(
        'INSERT INTO terminals(id,name,active,revision,created_at_utc,updated_at_utc) VALUES (?,?,1,1,?,?)',
      ).run(terminalId, 'Caja proveedor', 'now', 'now');
      const shift = f.cash.open({
        terminalId,
        openingCashCents: 50_000,
        operationKey: randomUUID(),
      }, f.owner) as RegisterShift;
      const payment = f.accounts.pay({
        operationKey: randomUUID(),
        supplierId: f.supplier.id,
        amountCents: 20_000,
        businessDate: '2026-10-02',
        method: 'CASH',
        shiftId: shift.id,
      }, f.owner);
      expect(payment.shiftId).toBe(shift.id);
      expect(f.cash.expected(shift)).toBe(30_000);
      f.purchases.void({
        purchaseId: purchase.id,
        operationKey: randomUUID(),
        reason: 'Compra cargada por error',
      }, f.owner);
      expect(f.accounts.detail(f.supplier.id)).toMatchObject({
        balanceCents: 0,
        creditCents: 20_000,
        payables: [{ status: 'VOIDED', balanceCents: 0 }],
      });
      expect(f.cash.expected(shift)).toBe(30_000);
    } finally {
      f.db.close();
    }
  });
});
