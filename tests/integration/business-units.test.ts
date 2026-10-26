import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { afterEach, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';
import {
  PRIMARY_UNIT_ID,
  SECONDARY_UNIT_ID,
  type BusinessUnitStatus,
} from '../../src/shared/business-units';
import type { SaleDetail, SalePage } from '../../src/shared/sales';
import type { Product } from '../../src/shared/catalog';
import type { PreparedOrder } from '../../src/shared/prepared-orders';
const databases: Database.Database[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});
function fixture() {
  const db = openDatabase(':memory:');
  databases.push(db);
  const auth = new AuthService(db);
  const owner = auth.bootstrap({
    username: 'jefe',
    name: 'Jefe principal',
    password: 'Prueba-Unidades-2026!',
  });
  const secondary = auth.saveUser(owner.sessionToken, {
    username: 'cajay',
    name: 'Caja segunda',
    role: 'OWNER',
    active: true,
    password: 'Prueba-Unidades-2026!',
    businessUnitId: SECONDARY_UNIT_ID,
  });
  const login = auth.login({ username: 'cajay', password: 'Prueba-Unidades-2026!' });
  const app = new Application(db, auth);
  const call = <T>(operation: string, payload: unknown, token = owner.sessionToken) =>
    app.dispatch(operation, payload, token) as T;
  const feature = new FeatureService(db);
  const flags = (enabled: Parameters<FeatureService['change']>[0]['enabled']) =>
    feature.change({ expectedRevision: feature.status().revision, enabled }, owner.user);
  let product = call<Product>('products.save', {
    sku: 'COMPARTIDO',
    barcode: null,
    name: 'Producto compartido',
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
    operationKey: randomUUID(),
    reason: 'Inicial compartido',
  });
  product = call<Product>('products.get', { productId: product.id });
  const body = () => ({
    checkoutKey: randomUUID(),
    discount: { type: 'NONE' as const },
    lines: [
      {
        lineId: randomUUID(),
        productId: product.id,
        quantityBase: 1,
        expectedProductRevision: product.revision,
        expectedPriceCents: 1000,
      },
    ],
  });
  const input = () => ({
    ...body(),
    payments: [{ method: 'TRANSFER' as const, amountCents: 1000 }],
  });
  return { db, auth, owner, secondary, login, call, flags, body, input, product };
}
it('apagado usa principal; activado atribuye por usuario y comparte stock sin ocultar ventas', () => {
  const f = fixture();
  const disabled = f.call<SaleDetail>('sales.complete', f.input(), f.login.sessionToken);
  expect(disabled.businessUnitId).toBe(PRIMARY_UNIT_ID);
  f.flags({ BUSINESS_UNITS: true });
  const input = f.input();
  const secondary = f.call<SaleDetail>('sales.complete', input, f.login.sessionToken);
  expect(secondary.businessUnitId).toBe(SECONDARY_UNIT_ID);
  expect(f.call<SalePage>('sales.list', { limit: 20 }).total).toBe(2);
  expect(
    f
      .call<SalePage>('sales.list', { limit: 20, businessUnitId: SECONDARY_UNIT_ID })
      .items.map((x) => x.id),
  ).toEqual([secondary.id]);
  expect(
    f.call<{ quantityBase: number }>('stock.get', { productId: f.product.id }).quantityBase,
  ).toBe(18);
  expect(() =>
    f.call(
      'sales.complete',
      { ...f.input(), businessUnitId: PRIMARY_UNIT_ID },
      f.login.sessionToken,
    ),
  ).toThrow();
  expect(() =>
    f.db
      .prepare('UPDATE sales SET business_unit_id=? WHERE id=?')
      .run(PRIMARY_UNIT_ID, secondary.id),
  ).toThrow(/inmutable/);
  const status = f.call<BusinessUnitStatus>('businessUnits.status', null);
  const unit = status.units.find((u) => u.secondary)!;
  f.call('businessUnits.rename', {
    id: unit.id,
    expectedRevision: unit.revision,
    name: 'Empresa Y',
  });
  expect(f.call<SaleDetail>('sales.detail', { saleId: secondary.id }).businessUnitName).toBe(
    'Segunda unidad',
  );
  f.flags({ BUSINESS_UNITS: false });
  expect(f.call<SaleDetail>('sales.complete', input, f.login.sessionToken).id).toBe(secondary.id);
  expect(f.call<SaleDetail>('sales.complete', f.input(), f.login.sessionToken).businessUnitId).toBe(
    PRIMARY_UNIT_ID,
  );
  expect(f.call<BusinessUnitStatus>('businessUnits.status', null).hasSecondaryHistory).toBe(true);
  expect(f.db.pragma('integrity_check', { simple: true })).toBe('ok');
  expect(f.db.pragma('foreign_key_check')).toEqual([]);
});
it('orden de Y cobrada por X conserva unidad y devolución hereda origen', () => {
  const f = fixture();
  f.flags({ BUSINESS_UNITS: true, PREPARED_ORDERS: true, RETURNS: true });
  const order = f.call<PreparedOrder>(
    'preparedOrders.create',
    { operationKey: randomUUID(), customerName: 'Cliente mostrador', note: '', body: f.body() },
    f.login.sessionToken,
  );
  expect(order.businessUnitId).toBe(SECONDARY_UNIT_ID);
  f.flags({ BUSINESS_UNITS: false });
  const sale = f.call<SaleDetail>('sales.complete', {
    ...order.body,
    preparedOrderId: order.id,
    payments: [{ method: 'TRANSFER', amountCents: 1000 }],
  });
  expect(sale.businessUnitId).toBe(SECONDARY_UNIT_ID);
  f.call('sales.return', {
    saleId: sale.id,
    operationKey: randomUUID(),
    reason: 'Devolución del cliente',
    refundMethod: 'TRANSFER',
    items: [{ saleItemId: sale.items[0]!.id, quantityBase: 1, disposition: 'RESTOCK' }],
  });
  expect(
    f.db.prepare("SELECT business_unit_id id FROM sales WHERE document_type='RETURN'").get(),
  ).toEqual({ id: SECONDARY_UNIT_ID });
  expect(
    f.call<{ quantityBase: number }>('stock.get', { productId: f.product.id }).quantityBase,
  ).toBe(20);
});
it('solo responsables asignan unidades y cambiar asignación invalida sesiones', () => {
  const f = fixture();
  f.flags({ BUSINESS_UNITS: true });
  const seller = f.auth.saveUser(f.owner.sessionToken, {
    username: 'vendedor',
    name: 'Vendedor',
    role: 'SELLER',
    active: true,
    password: 'Prueba-Unidades-2026!',
  });
  const session = f.auth.login({ username: 'vendedor', password: 'Prueba-Unidades-2026!' });
  expect(() =>
    f.call(
      'businessUnits.rename',
      { id: SECONDARY_UNIT_ID, expectedRevision: 1, name: 'Empresa falsa' },
      session.sessionToken,
    ),
  ).toThrow();
  expect(() =>
    f.call(
      'users.save',
      {
        id: seller.id,
        expectedRevision: seller.revision,
        username: seller.username,
        name: seller.name,
        role: seller.role,
        active: true,
        businessUnitId: SECONDARY_UNIT_ID,
      },
      session.sessionToken,
    ),
  ).toThrow();
  f.auth.saveUser(f.owner.sessionToken, {
    id: f.secondary.id,
    expectedRevision: f.secondary.revision,
    username: f.secondary.username,
    name: f.secondary.name,
    role: f.secondary.role,
    active: true,
    businessUnitId: PRIMARY_UNIT_ID,
  });
  expect(() => f.auth.requireUser(f.login.sessionToken)).toThrow();
  expect(() =>
    f.auth.saveUser(f.owner.sessionToken, {
      username: 'invalido',
      name: 'Inválido',
      role: 'SELLER',
      active: true,
      password: 'Prueba-Unidades-2026!',
      businessUnitId: randomUUID(),
    }),
  ).toThrow(/unidad/);
});
it('migra una base v37 con ventas existentes y conserva importes e integridad', () => {
  const db = new Database(':memory:');
  databases.push(db);
  db.pragma('foreign_keys=ON');
  migrate(
    db,
    MIGRATIONS.filter((m) => m.version <= 37),
  );
  const id = randomUUID();
  db.prepare(
    `INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json) VALUES(?,1,?,'hash','COMPLETED','2026-10-25','2026-10-25','2026-10',1000,0,1000,'{"type":"NONE"}')`,
  ).run(id, randomUUID());
  migrate(db);
  expect(
    db.prepare('SELECT total_cents total,business_unit_id unit FROM sales WHERE id=?').get(id),
  ).toEqual({ total: 1000, unit: PRIMARY_UNIT_ID });
  expect(db.pragma('foreign_key_check')).toEqual([]);
  expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
});
