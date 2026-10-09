import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';
import { CashService } from '../../src/worker/operations/cash';

const password = 'Prueba-Clientes-2026!';

function fixture() {
  const db = openDatabase(':memory:');
  const auth = new AuthService(db);
  const grant = auth.bootstrap({ name: 'Dueña', username: 'jefe', password });
  const app = new Application(db, auth);
  const features = new FeatureService(db);
  const status = features.status();
  features.change(
    { expectedRevision: status.revision, enabled: { CUSTOMERS: true, CUSTOMER_CREDIT: true } },
    grant.user,
  );
  const product = app.dispatch(
    'products.save',
    {
      sku: 'CLIENTE-01',
      barcode: null,
      name: 'Producto de prueba',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 12_000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    },
    grant.sessionToken,
  ) as { id: string; revision: number; priceCents: number };
  return { db, app, token: grant.sessionToken, owner: grant.user, product };
}

describe('clientes y cuenta corriente', () => {
  test('caja permite al vendedor crear un cliente, pero no editarlo ni habilitar crédito', () => {
    const f = fixture();
    try {
      const auth = new AuthService(f.db);
      auth.saveUser(f.token, {
        username: 'caja-cliente',
        name: 'Caja',
        role: 'SELLER',
        active: true,
        password,
      });
      const seller = auth.login({ username: 'caja-cliente', password }).sessionToken;
      const customer = f.app.dispatch('customers.save', { name: 'Cliente desde caja' }, seller) as {
        id: string;
        revision: number;
        creditEnabled: boolean;
      };
      expect(customer.creditEnabled).toBe(false);
      expect(() =>
        f.app.dispatch(
          'customers.save',
          { id: customer.id, expectedRevision: customer.revision, name: 'Cambio no autorizado' },
          seller,
        ),
      ).toThrow();
      expect(() =>
        f.app.dispatch(
          'customers.setCredit',
          {
            customerId: customer.id,
            expectedRevision: customer.revision,
            creditEnabled: true,
            creditLimitCents: 100000,
          },
          seller,
        ),
      ).toThrow();
    } finally {
      f.db.close();
    }
  });
  test('vende a cuenta, controla el límite y aplica cobros parciales sin duplicar ventas', () => {
    const f = fixture();
    try {
      const customer = f.app.dispatch(
        'customers.save',
        { name: 'Cliente del puerto', phone: '2494000000' },
        f.token,
      ) as { id: string; revision: number };
      f.app.dispatch(
        'customers.setCredit',
        {
          customerId: customer.id,
          expectedRevision: customer.revision,
          creditEnabled: true,
          creditLimitCents: 20_000,
        },
        f.token,
      );
      const sale = f.app.dispatch(
        'sales.complete',
        {
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: f.product.id,
              quantityBase: 1,
              expectedProductRevision: f.product.revision,
              expectedPriceCents: f.product.priceCents,
            },
          ],
          discount: { type: 'NONE' },
          customerId: customer.id,
          onAccountCents: 12_000,
          payments: [],
        },
        f.token,
      ) as { id: string; customerId: string; onAccountCents: number };
      expect(sale).toMatchObject({ customerId: customer.id, onAccountCents: 12_000 });
      expect(() =>
        f.app.dispatch(
          'sales.complete',
          {
            checkoutKey: randomUUID(),
            lines: [
              {
                lineId: randomUUID(),
                productId: f.product.id,
                quantityBase: 1,
                expectedProductRevision: f.product.revision,
                expectedPriceCents: f.product.priceCents,
              },
            ],
            discount: { type: 'NONE' },
            customerId: customer.id,
            onAccountCents: 12_000,
            payments: [],
          },
          f.token,
        ),
      ).toThrow('límite');
      const collection = f.app.dispatch(
        'customerAccounts.collect',
        {
          operationKey: randomUUID(),
          customerId: customer.id,
          amountCents: 5_000,
          businessDate: '2026-10-05',
          method: 'TRANSFER',
        },
        f.token,
      ) as { amountCents: number };
      expect(collection.amountCents).toBe(5_000);
      expect(
        f.app.dispatch('customerAccounts.detail', { customerId: customer.id }, f.token),
      ).toMatchObject({
        balanceCents: 7_000,
        availableCents: 13_000,
        receivables: [{ saleId: sale.id, balanceCents: 7_000, status: 'OPEN' }],
      });
      expect(f.app.dispatch('sales.list', { status: 'ALL', limit: 10 }, f.token)).toMatchObject({
        total: 1,
      });
    } finally {
      f.db.close();
    }
  });

  test('el cobro en efectivo entra una sola vez a la caja', () => {
    const f = fixture();
    try {
      const customer = f.app.dispatch('customers.save', { name: 'Marina Sur' }, f.token) as {
        id: string;
        revision: number;
      };
      f.app.dispatch(
        'customers.setCredit',
        {
          customerId: customer.id,
          expectedRevision: customer.revision,
          creditEnabled: true,
          creditLimitCents: 20_000,
        },
        f.token,
      );
      f.app.dispatch(
        'sales.complete',
        {
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: f.product.id,
              quantityBase: 1,
              expectedProductRevision: f.product.revision,
              expectedPriceCents: f.product.priceCents,
            },
          ],
          discount: { type: 'NONE' },
          customerId: customer.id,
          onAccountCents: 12_000,
          payments: [],
        },
        f.token,
      );
      const terminalId = randomUUID();
      f.db
        .prepare(
          'INSERT INTO terminals(id,name,active,revision,created_at_utc,updated_at_utc) VALUES (?,?,1,1,?,?)',
        )
        .run(terminalId, 'Caja clientes', 'now', 'now');
      const cash = new CashService(f.db);
      const shift = cash.open(
        { terminalId, openingCashCents: 10_000, operationKey: randomUUID() },
        f.owner,
      ) as { id: string };
      const operationKey = randomUUID();
      const input = {
        operationKey,
        customerId: customer.id,
        amountCents: 12_000,
        businessDate: '2026-10-05',
        method: 'CASH',
        shiftId: shift.id,
      };
      const first = f.app.dispatch('customerAccounts.collect', input, f.token);
      expect(f.app.dispatch('customerAccounts.collect', input, f.token)).toEqual(first);
      expect(cash.expected(cash.detail(shift.id, f.owner))).toBe(22_000);
    } finally {
      f.db.close();
    }
  });

  test('una devolución cancela primero la deuda y reintegra sólo lo ya cobrado', () => {
    const f = fixture();
    try {
      const customer = f.app.dispatch(
        'customers.save',
        { name: 'Cliente devolución' },
        f.token,
      ) as { id: string; revision: number };
      f.app.dispatch(
        'customers.setCredit',
        {
          customerId: customer.id,
          expectedRevision: customer.revision,
          creditEnabled: true,
          creditLimitCents: 20_000,
        },
        f.token,
      );
      const sale = f.app.dispatch(
        'sales.complete',
        {
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: f.product.id,
              quantityBase: 1,
              expectedProductRevision: f.product.revision,
              expectedPriceCents: f.product.priceCents,
            },
          ],
          discount: { type: 'NONE' },
          customerId: customer.id,
          onAccountCents: 12_000,
          payments: [],
        },
        f.token,
      ) as { id: string; items: { id: string }[] };
      f.app.dispatch(
        'customerAccounts.collect',
        {
          operationKey: randomUUID(),
          customerId: customer.id,
          amountCents: 5_000,
          businessDate: '2026-10-05',
          method: 'TRANSFER',
        },
        f.token,
      );
      const returned = f.app.dispatch(
        'sales.return',
        {
          saleId: sale.id,
          operationKey: randomUUID(),
          reason: 'Producto devuelto',
          refundMethod: 'TRANSFER',
          items: [{ saleItemId: sale.items[0]!.id, quantityBase: 1, disposition: 'NONE' }],
        },
        f.token,
      ) as { totalCents: number; accountOffsetCents: number; refundCents: number };
      expect(returned).toMatchObject({
        totalCents: 12_000,
        accountOffsetCents: 7_000,
        refundCents: 5_000,
      });
      expect(
        f.app.dispatch('customerAccounts.detail', { customerId: customer.id }, f.token),
      ).toMatchObject({ balanceCents: 0 });
    } finally {
      f.db.close();
    }
  });
});
