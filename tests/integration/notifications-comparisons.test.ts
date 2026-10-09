import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';
import { MonthlyReports } from '../../src/worker/reports/queries';

const password = 'Prueba-Perla-2026!';
function fixture() {
  const db = openDatabase(':memory:');
  const auth = new AuthService(db);
  const owner = auth.bootstrap({ name: 'Dueña', username: 'jefe', password });
  return { db, auth, app: new Application(db, auth), owner, features: new FeatureService(db) };
}

test('los avisos respetan función, rol y vuelven a pendientes si cambia la condición', () => {
  const f = fixture();
  try {
    const product = f.app.dispatch(
      'products.save',
      {
        sku: 'ALERTA-01',
        barcode: null,
        name: 'Salmón rosado',
        category: 'Pescados',
        saleUnit: 'KG',
        priceCents: 250000,
        active: true,
        trackStock: true,
        minStockBase: 2000,
      },
      f.owner.sessionToken,
    ) as { id: string; revision: number };
    f.app.dispatch(
      'stock.opening',
      {
        productId: product.id,
        countedBase: 1000,
        reason: 'Apertura',
        operationKey: randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
      },
      f.owner.sessionToken,
    );
    expect(() => f.app.dispatch('notifications.list', null, f.owner.sessionToken)).toThrow('desactivada');
    const status = f.features.status();
    f.features.change({ expectedRevision: status.revision, enabled: { NOTIFICATIONS: true } }, f.owner.user);
    const first = f.app.dispatch('notifications.list', null, f.owner.sessionToken) as {
      unreadCount: number;
      items: { key: string; signature: string; title: string; read: boolean }[];
    };
    expect(first.unreadCount).toBe(1);
    expect(first.items[0]).toMatchObject({ title: 'Salmón rosado con poco stock', read: false });
    const read = f.app.dispatch(
      'notifications.markRead',
      { key: first.items[0]!.key, signature: first.items[0]!.signature },
      f.owner.sessionToken,
    ) as { unreadCount: number };
    expect(read.unreadCount).toBe(0);
    const stock = f.app.dispatch('stock.get', { productId: product.id }, f.owner.sessionToken) as {
      revision: number;
      productRevision: number;
    };
    f.app.dispatch(
      'stock.count',
      {
        productId: product.id,
        countedBase: 500,
        reason: 'Nuevo conteo',
        operationKey: randomUUID(),
        expectedRevision: stock.revision,
        expectedProductRevision: stock.productRevision,
      },
      f.owner.sessionToken,
    );
    expect(
      (f.app.dispatch('notifications.list', null, f.owner.sessionToken) as { unreadCount: number })
        .unreadCount,
    ).toBe(1);
    f.app.dispatch(
      'users.save',
      { name: 'Caja', username: 'vendedor', role: 'SELLER', active: true, password },
      f.owner.sessionToken,
    );
    const seller = f.auth.login({ username: 'vendedor', password });
    expect(() => f.app.dispatch('notifications.list', null, seller.sessionToken)).toThrow();
  } finally {
    f.db.close();
  }
});

test('el comparativo usa períodos iguales y centavos netos', () => {
  const f = fixture();
  try {
    const product = f.app.dispatch(
      'products.save',
      {
        sku: 'COMP-01',
        barcode: null,
        name: 'Merluza',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 1000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      f.owner.sessionToken,
    ) as { id: string; revision: number; priceCents: number };
    const sell = () =>
      f.app.dispatch(
        'sales.complete',
        {
          checkoutKey: randomUUID(),
          lines: [{ lineId: randomUUID(), productId: product.id, quantityBase: 1, expectedProductRevision: product.revision, expectedPriceCents: product.priceCents }],
          discount: { type: 'NONE' },
          payments: [{ method: 'CASH', amountCents: 1000 }],
        },
        f.owner.sessionToken,
      ) as { id: string };
    const previous = sell(), current = sell();
    f.db.prepare("UPDATE sales SET business_date='2026-09-05',local_month='2026-09' WHERE id=?").run(previous.id);
    f.db.prepare("UPDATE sales SET business_date='2026-09-10',local_month='2026-09' WHERE id=?").run(current.id);
    const result = new MonthlyReports(f.db).compare({ preset: 'CUSTOM', from: '2026-09-10', to: '2026-09-14' });
    expect(result.period).toMatchObject({ previousFrom: '2026-09-05', previousTo: '2026-09-09' });
    expect(result.current).toMatchObject({ netCents: 1000, saleCount: 1, averageCents: 1000 });
    expect(result.previous.netCents).toBe(1000);
    expect(result.changeBasisPoints).toBe(0);
  } finally {
    f.db.close();
  }
});

