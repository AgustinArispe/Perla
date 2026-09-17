import { expect, it } from 'vitest';
import { hasPermission } from '../../src/domain/permissions';
it('matriz explícita y operaciones desconocidas denegadas incluso para jefe', () => {
  for (const role of ['SELLER', 'SUPERVISOR', 'OWNER'] as const) {
    expect(hasPermission(role, 'checkout.saveDraft')).toBe(true);
    expect(hasPermission(role, 'sql.execute')).toBe(false);
    expect(hasPermission(role, 'dashboard.monthly')).toBe(role === 'OWNER');
    expect(hasPermission(role, 'users.save')).toBe(role === 'OWNER');
    expect(hasPermission(role, 'products.save')).toBe(role !== 'SELLER');
    expect(hasPermission(role, 'sales.void')).toBe(role !== 'SELLER');
  }
});
