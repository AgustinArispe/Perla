import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import type { Product } from '../../src/shared/catalog';
import type { SaleDetail } from '../../src/shared/sales';
import Database from 'better-sqlite3';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
const password = 'Prueba-Bocha-2026!';
const product = {
  sku: 'P',
  barcode: '00123',
  name: 'Producto de prueba',
  category: null,
  saleUnit: 'UNIT' as const,
  priceCents: 100,
  active: true,
  trackStock: false,
  minStockBase: 0,
};
function fixture() {
  const db = openDatabase(':memory:');
  const auth = new AuthService(db);
  const app = new Application(db, auth);
  const owner = auth.bootstrap({ name: 'Agus', username: 'jefe', password });
  return { db, auth, app, owner };
}
it('actualiza esquema 4 conservando stock y adopta borrador legacy para el primer jefe', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys=ON');
  try {
    migrate(db, MIGRATIONS.slice(0, 4));
    const catalog = new CatalogRepository(db),
      stock = new StockService(db, catalog);
    const p = catalog.save({ ...product, trackStock: true });
    stock.opening({
      productId: p.id,
      countedBase: 8,
      expectedRevision: 0,
      expectedProductRevision: 1,
      operationKey: randomUUID(),
      reason: 'Conteo',
    });
    const body = { checkoutKey: randomUUID(), lines: [], discount: { type: 'NONE' as const } };
    db.prepare("INSERT INTO checkout_drafts VALUES ('main',1,?,?)").run(
      JSON.stringify(body),
      new Date().toISOString(),
    );
    migrate(db);
    const auth = new AuthService(db),
      app = new Application(db, auth),
      owner = auth.bootstrap({ username: 'jefe', name: 'Primer jefe', password });
    expect(app.dispatch('checkout.getDraft', null, owner.sessionToken)).toMatchObject({
      body,
      revision: 1,
    });
    expect(stock.get(p.id).quantityBase).toBe(8);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  } finally {
    db.close();
  }
});
it('sesión vencida se rechaza y un fallo de auditoría revierte el cambio durable', () => {
  const f = fixture();
  try {
    f.db.exec(
      "CREATE TRIGGER audit_fail BEFORE INSERT ON audit_events WHEN NEW.operation='products.save' BEGIN SELECT RAISE(ABORT,'failure fixture'); END",
    );
    expect(() => f.app.dispatch('products.save', product, f.owner.sessionToken)).toThrow();
    expect(f.db.prepare('SELECT COUNT(*) AS n FROM products').get()).toEqual({ n: 0 });
    f.db.prepare('UPDATE auth_sessions SET expires_at_ms=0').run();
    expect(() => f.auth.authorize(f.owner.sessionToken, 'products.save')).toThrow('venció');
    expect(f.auth.status(f.owner.sessionToken).user).toBeNull();
  } finally {
    f.db.close();
  }
});
it('registro de intentos lleno falla cerrado y una cuenta inactiva no ingresa', () => {
  const f = fixture();
  try {
    const insert = f.db.prepare('INSERT INTO auth_attempts VALUES (?,1,0,?)');
    f.db.transaction(() => {
      for (let i = 0; i < 1000; i++) insert.run(`ghost-${i}`, Date.now());
    })();
    expect(() => f.auth.login({ username: 'jefe', password: 'incorrecta' })).toThrow('intentos');
    f.db.prepare('DELETE FROM auth_attempts').run();
    f.auth.saveUser(f.owner.sessionToken, {
      username: 'inactivo',
      name: 'Cuenta inactiva',
      role: 'SELLER',
      active: false,
      password,
    });
    expect(() => f.auth.login({ username: 'inactivo', password })).toThrow('incorrectos');
  } finally {
    f.db.close();
  }
});
it('bootstrap único, hashes privados, login genérico, bloqueo y logout', () => {
  const f = fixture();
  try {
    expect(() => f.auth.bootstrap({ name: 'Otro', username: 'otro', password })).toThrow();
    expect(JSON.stringify(f.auth.listUsers(f.owner.sessionToken))).not.toContain('password');
    expect(
      (f.db.prepare('SELECT password_hash FROM users').get() as { password_hash: string })
        .password_hash,
    ).not.toContain(password);
    for (let i = 0; i < 5; i++)
      expect(() => f.auth.login({ username: 'jefe', password: 'incorrecta' })).toThrow();
    expect(() => f.auth.login({ username: 'jefe', password })).toThrow('intentos');
    f.auth.logout(f.owner.sessionToken);
    expect(() => f.auth.authorize(f.owner.sessionToken, 'products.save')).toThrow();
  } finally {
    f.db.close();
  }
});
it('jefe administra, supervisor sin dashboard/usuarios, vendedor sólo circuito de venta', () => {
  const f = fixture();
  try {
    for (const [username, role] of [
      ['vendedor', 'SELLER'],
      ['supervisor', 'SUPERVISOR'],
    ] as const)
      f.auth.saveUser(f.owner.sessionToken, {
        username,
        name: username,
        role,
        active: true,
        password,
      });
    const seller = f.auth.login({ username: 'vendedor', password });
    const supervisor = f.auth.login({ username: 'supervisor', password });
    expect(() => f.app.dispatch('products.save', product, seller.sessionToken)).toThrow();
    expect(() => f.app.dispatch('stock.listLow', { limit: 20 }, seller.sessionToken)).toThrow();
    expect(() => f.app.dispatch('users.list', null, supervisor.sessionToken)).toThrow();
    expect(() => f.auth.authorize(supervisor.sessionToken, 'dashboard.monthly')).toThrow();
    expect(f.app.dispatch('products.save', product, supervisor.sessionToken)).toMatchObject({
      name: product.name,
    });
    expect(() => f.app.dispatch('products.save', product, null)).toThrow();
  } finally {
    f.db.close();
  }
});
it('revoca sesiones al cambiar rol o contraseña y protege el último jefe', () => {
  const f = fixture();
  try {
    expect(() =>
      f.auth.saveUser(f.owner.sessionToken, {
        id: f.owner.user.id,
        expectedRevision: 1,
        username: 'jefe',
        name: 'Agus',
        role: 'SELLER',
        active: true,
      }),
    ).toThrow('jefe');
    const user = f.auth.saveUser(f.owner.sessionToken, {
      username: 'venta',
      name: 'Vendedor',
      role: 'SELLER',
      active: true,
      password,
    });
    const session = f.auth.login({ username: 'venta', password });
    f.auth.saveUser(f.owner.sessionToken, {
      id: user.id,
      expectedRevision: user.revision,
      username: user.username,
      name: user.name,
      role: 'SUPERVISOR',
      active: true,
    });
    expect(() => f.auth.authorize(session.sessionToken, 'checkout.getDraft')).toThrow();
    const renewed = f.auth.login({ username: 'venta', password });
    f.auth.changePassword(renewed.sessionToken, {
      currentPassword: password,
      newPassword: 'Otra-Prueba-2026!',
    });
    expect(() => f.auth.authorize(renewed.sessionToken, 'checkout.getDraft')).toThrow();
    expect(() => f.auth.login({ username: 'venta', password })).toThrow();
  } finally {
    f.db.close();
  }
});
it('borradores separados, cancelar exige revisión y ventas conservan actor sin doble auditoría', () => {
  const f = fixture();
  try {
    const p = f.app.dispatch('products.save', product, f.owner.sessionToken) as Product;
    const user = f.auth.saveUser(f.owner.sessionToken, {
      username: 'venta',
      name: 'Vendedor',
      role: 'SELLER',
      active: true,
      password,
    });
    const seller = f.auth.login({ username: 'venta', password });
    expect(seller.user.id).toBe(user.id);
    const body = {
      checkoutKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          productId: p.id,
          quantityBase: 1,
          expectedProductRevision: p.revision,
          expectedPriceCents: p.priceCents,
        },
      ],
      discount: { type: 'NONE' as const },
    };
    f.app.dispatch('checkout.saveDraft', { body, expectedRevision: 0 }, seller.sessionToken);
    expect(f.app.dispatch('checkout.getDraft', null, f.owner.sessionToken)).toBeNull();
    expect(() =>
      f.app.dispatch('checkout.cancelDraft', { expectedRevision: 2 }, seller.sessionToken),
    ).toThrow();
    f.app.dispatch('checkout.cancelDraft', { expectedRevision: 1 }, seller.sessionToken);
    expect(f.app.dispatch('checkout.getDraft', null, seller.sessionToken)).toBeNull();
    const input = { ...body, payments: [{ method: 'CASH', amountCents: 100 }] };
    const sale = f.app.dispatch('sales.complete', input, seller.sessionToken) as SaleDetail;
    expect(sale.actorName).toBe('Vendedor');
    f.app.dispatch('sales.complete', input, seller.sessionToken);
    expect(
      f.db.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE operation='sales.complete'").get(),
    ).toEqual({ n: 1 });
    expect(() =>
      f.app.dispatch(
        'sales.void',
        { saleId: sale.id, operationKey: randomUUID(), reason: 'Error' },
        seller.sessionToken,
      ),
    ).toThrow();
    expect(() => f.app.dispatch('sales.list', { limit: 20 }, seller.sessionToken)).toThrow();
    const other = f.auth.saveUser(f.owner.sessionToken, {
      username: 'otra',
      name: 'Otra persona',
      role: 'SELLER',
      active: true,
      password,
    });
    void other;
    const otherSession = f.auth.login({ username: 'otra', password });
    expect(() =>
      f.app.dispatch(
        'sales.findByCheckoutKey',
        { checkoutKey: body.checkoutKey },
        otherSession.sessionToken,
      ),
    ).toThrow();
  } finally {
    f.db.close();
  }
});
