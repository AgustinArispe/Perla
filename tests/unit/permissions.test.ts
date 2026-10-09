import { expect, it } from 'vitest';
import { hasPermission, knownOperations } from '../../src/domain/permissions';
it('matriz explícita y operaciones desconocidas denegadas incluso para administrador', () => {
  for (const role of ['SELLER', 'SUPERVISOR', 'OWNER', 'ADMIN'] as const) {
    expect(hasPermission(role, 'checkout.saveDraft')).toBe(true);
    expect(hasPermission(role, 'sql.execute')).toBe(false);
    expect(hasPermission(role, 'dashboard.monthly')).toBe(role === 'OWNER' || role === 'ADMIN');
    expect(hasPermission(role, 'users.save')).toBe(role === 'OWNER' || role === 'ADMIN');
    expect(hasPermission(role, 'auth.unlockUser')).toBe(role === 'OWNER' || role === 'ADMIN');
    expect(hasPermission(role, 'products.save')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'products.createLabel')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'products.labels')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'sales.void')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'purchases.receive')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'suppliers.save')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'costs.get')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'costs.setReference')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'exports.purchases')).toBe(role === 'OWNER' || role === 'ADMIN');
    expect(hasPermission(role, 'locations.summary')).toBe(role === 'OWNER' || role === 'ADMIN');
  }
});

it('roles acumulativos: el jefe incluye toda la caja y toda la supervision', () => {
  for (const operation of knownOperations) {
    expect(hasPermission('OWNER', operation)).toBe(true);
    expect(hasPermission('ADMIN', operation)).toBe(true);
    if (hasPermission('SELLER', operation))
      expect(hasPermission('SUPERVISOR', operation)).toBe(true);
    if (hasPermission('SUPERVISOR', operation))
      expect(hasPermission('OWNER', operation)).toBe(true);
  }
  for (const operation of [
    'cash.open',
    'cash.close',
    'cash.movement',
    'products.findByBarcode',
    'checkout.cancelDraft',
    'sales.complete',
    'stock.count',
    'purchases.receive',
    'customerAccounts.collect',
  ])
    expect(hasPermission('OWNER', operation)).toBe(true);
});
