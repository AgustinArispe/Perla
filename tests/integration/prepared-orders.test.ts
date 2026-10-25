import { randomUUID } from 'node:crypto';
import { afterEach, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';
import type { Product } from '../../src/shared/catalog';
import type { PreparedOrder } from '../../src/shared/prepared-orders';
import type { CheckoutInput, SaleDetail } from '../../src/shared/sales';
import type { FeatureSelection } from '../../src/shared/features';
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function fixture() {
  const db = openDatabase(':memory:');
  cleanups.push(() => db.close());
  const auth = new AuthService(db);
  const grant = auth.bootstrap({
    username: 'jefe',
    name: 'Dueña',
    password: 'Ordenes-Prueba-2026!',
  });
  const app = new Application(db, auth);
  const call = <T>(operation: string, payload: unknown) =>
    app.dispatch(operation, payload, grant.sessionToken) as T;
  const features = new FeatureService(db);
  const flags = (enabled: FeatureSelection) =>
    features.change({ expectedRevision: features.status().revision, enabled }, grant.user);
  let product = call<Product>('products.save', {
    sku: 'TOR-01',
    barcode: null,
    name: 'Tornillo',
    category: null,
    saleUnit: 'UNIT',
    priceCents: 1000,
    active: true,
    trackStock: true,
    minStockBase: 0,
  });
  call('stock.opening', {
    productId: product.id,
    countedBase: 20,
    expectedRevision: 0,
    expectedProductRevision: product.revision,
    reason: 'Inicial',
    operationKey: randomUUID(),
  });
  product = call<Product>('products.get', { productId: product.id });
  const input = () => ({
    operationKey: randomUUID(),
    customerName: 'Cliente de mostrador',
    note: 'Preparó ferretería',
    body: {
      checkoutKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 3,
          expectedProductRevision: product.revision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' as const },
    },
  });
  const prepare = () => call<PreparedOrder>('preparedOrders.create', input());
  const pay = (order: PreparedOrder): CheckoutInput => ({
    ...order.body,
    preparedOrderId: order.id,
    payments: [{ method: 'DEBIT', amountCents: order.quote.totalCents }],
  });
  const count = () => ({
    stock: (
      db
        .prepare('SELECT quantity_base n FROM inventory_balances WHERE product_id=?')
        .get(product.id) as { n: number }
    ).n,
    sales: (db.prepare('SELECT count(*) n FROM sale_orders').get() as { n: number }).n,
    payments: (db.prepare('SELECT count(*) n FROM sale_payments').get() as { n: number }).n,
  });
  return { db, auth, app, call, grant, flags, features, product, input, prepare, pay, count };
}
it('órdenes se habilita con remitos internos apagados y preparar no cobra ni mueve stock', () => {
  const f = fixture();
  expect(() => f.prepare()).toThrow('desactivado');
  f.flags({ PREPARED_ORDERS: true, DELIVERY_NOTES_INTERNAL: false });
  const before = f.count();
  const order = f.prepare();
  expect(order.status).toBe('READY');
  expect(order.quote.totalCents).toBe(3000);
  expect(f.count()).toEqual(before);
  f.flags({ PRODUCT_LABELS: false });
  expect(f.features.status().enabled.PREPARED_ORDERS).toBe(true);
});
it('caja confirma venta, pago y orden en la misma transacción y el reintento no cobra dos veces', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  const input = f.pay(order);
  const sale = f.call<SaleDetail>('sales.complete', input);
  expect(f.count()).toEqual({ stock: 17, sales: 1, payments: 1 });
  expect(f.call('sales.complete', input)).toEqual(sale);
  expect(f.call<PreparedOrder>('preparedOrders.byNumber', { number: order.number })).toMatchObject({
    status: 'PAID',
    saleId: sale.id,
    saleNumber: sale.number,
  });
  expect(f.count()).toEqual({ stock: 17, sales: 1, payments: 1 });
});
it('revierte también venta, pago y stock si falla la actualización final de la orden', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  f.db.exec(
    "CREATE TEMP TRIGGER fail_order_settlement BEFORE UPDATE ON prepared_orders WHEN NEW.status='PAID' BEGIN SELECT RAISE(ABORT,'fallo simulado'); END;",
  );
  expect(() => f.call('sales.complete', f.pay(order))).toThrow('fallo simulado');
  expect(f.count()).toEqual({ stock: 20, sales: 0, payments: 0 });
  expect(f.call<PreparedOrder>('preparedOrders.byNumber', { number: order.number }).status).toBe(
    'READY',
  );
});
it('apagar preparación conserva la consulta y el cobro de las órdenes pendientes', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  f.flags({ PREPARED_ORDERS: false });
  expect(() => f.prepare()).toThrow('desactivado');
  expect(f.call<{ total: number }>('preparedOrders.list', { status: 'READY' }).total).toBe(1);
  expect(f.call<SaleDetail>('sales.complete', f.pay(order)).totalCents).toBe(3000);
});
it('rechaza cambios de contenido, cobrar sin vínculo y venta a cuenta', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  const input = f.pay(order);
  expect(() =>
    f.call('sales.complete', {
      ...input,
      lines: input.lines.map((l) => ({ ...l, quantityBase: 2 })),
    }),
  ).toThrow('no corresponden');
  expect(() => f.call('sales.complete', { ...input, preparedOrderId: undefined })).toThrow(
    'desde la orden',
  );
  expect(() => f.call('sales.complete', { ...input, checkoutKey: randomUUID() })).toThrow(
    'no corresponden',
  );
  expect(() => f.call('sales.complete', { ...input, onAccountCents: 1000 })).toThrow(
    'cobro completo',
  );
  expect(f.count()).toEqual({ stock: 20, sales: 0, payments: 0 });
});
it('un error de pago o falta de stock conserva la orden pendiente sin escrituras parciales', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  expect(() =>
    f.call('sales.complete', { ...f.pay(order), payments: [{ method: 'DEBIT', amountCents: 10 }] }),
  ).toThrow();
  expect(f.count()).toEqual({ stock: 20, sales: 0, payments: 0 });
  f.db
    .prepare('UPDATE inventory_balances SET quantity_base=0 WHERE product_id=?')
    .run(f.product.id);
  f.db
    .prepare('UPDATE location_inventory_balances SET quantity_base=0 WHERE product_id=?')
    .run(f.product.id);
  expect(() => f.call('sales.complete', f.pay(order))).toThrow();
  expect(f.call<PreparedOrder>('preparedOrders.byNumber', { number: order.number }).status).toBe(
    'READY',
  );
  expect(f.count().sales).toBe(0);
});
it('cancelar no cobra y una orden cancelada nunca se puede pagar', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  const action = {
    orderId: order.id,
    expectedRevision: order.revision,
    operationKey: randomUUID(),
    reason: 'Cliente desistió',
  };
  const cancelled = f.call<PreparedOrder>('preparedOrders.cancel', action);
  expect(cancelled.status).toBe('CANCELLED');
  expect(f.call('preparedOrders.cancel', action)).toEqual(cancelled);
  expect(() => f.call('sales.complete', f.pay(order))).toThrow('cancelada');
  expect(f.count()).toEqual({ stock: 20, sales: 0, payments: 0 });
});
it('no cambia silenciosamente el precio de una orden ya preparada', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  f.db
    .prepare('UPDATE products SET price_cents=2000,revision=revision+1 WHERE id=?')
    .run(f.product.id);
  expect(() => f.call('sales.complete', f.pay(order))).toThrow('Cambió el producto');
  expect(
    f.call<PreparedOrder>('preparedOrders.byNumber', { number: order.number }).quote.totalCents,
  ).toBe(3000);
  expect(f.count().sales).toBe(0);
});
it('preparar es idempotente, los documentos son inmutables y no se reutiliza una orden cobrada', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const input = f.input();
  const order = f.call<PreparedOrder>('preparedOrders.create', input);
  expect(f.call('preparedOrders.create', input)).toEqual(order);
  expect(() => f.call('preparedOrders.create', { ...input, customerName: 'Otro' })).toThrow(
    'otros datos',
  );
  expect(() =>
    f.db.prepare("UPDATE prepared_orders SET body_json='{}' WHERE id=?").run(order.id),
  ).toThrow();
  expect(() => f.db.prepare('DELETE FROM prepared_orders WHERE id=?').run(order.id)).toThrow();
  f.call('sales.complete', f.pay(order));
  expect(() =>
    f.call('sales.complete', {
      ...f.pay(order),
      payments: [{ method: 'CASH', amountCents: 3000 }],
    }),
  ).toThrow('otra venta');
  expect(() =>
    f.call('preparedOrders.cancel', {
      orderId: order.id,
      expectedRevision: 2,
      operationKey: randomUUID(),
      reason: 'Anular',
    }),
  ).toThrow('pendientes');
  expect(f.count()).toEqual({ stock: 17, sales: 1, payments: 1 });
  expect(f.db.pragma('foreign_key_check')).toEqual([]);
});
it('cobrar una orden conserva el borrador de caja y rechaza un depósito distinto', () => {
  const f = fixture();
  f.flags({ PREPARED_ORDERS: true });
  const order = f.prepare();
  const draft = f.input().body;
  f.call('checkout.saveDraft', { body: draft, expectedRevision: 0 });
  expect(() => f.call('sales.complete', { ...f.pay(order), locationId: randomUUID() })).toThrow(
    'ubicación',
  );
  f.call('sales.complete', f.pay(order));
  expect(f.call<{ body: unknown }>('checkout.getDraft', null).body).toEqual(draft);
});
