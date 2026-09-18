import type { Role } from '../shared/auth';
const common = [
  'settings.get',
  'terminals.active',
  'cash.current',
  'cash.open',
  'cash.close',
  'cash.movement',
  'shifts.details',
  'auth.status',
  'auth.logout',
  'auth.changePassword',
  'products.search',
  'products.get',
  'products.findByBarcode',
  'checkout.getDraft',
  'checkout.saveDraft',
  'checkout.cancelDraft',
  'sales.complete',
  'sales.findByCheckoutKey',
  'sales.detail',
];
const management = [
  'shifts.list',
  'audit.list',
  'products.save',
  'products.setActive',
  'products.previewImport',
  'products.applyImport',
  'stock.operation',
  'stock.get',
  'stock.search',
  'stock.opening',
  'stock.count',
  'stock.record',
  'stock.listLow',
  'stock.movements',
  'sales.list',
  'sales.previewVoid',
  'sales.void',
];
const owner = [
  'terminals.list',
  'terminals.save',
  'exports.products',
  'exports.sales',
  'exports.stock',
  'users.list',
  'users.save',
  'dashboard.monthly',
  'backup.create',
  'backup.restore',
  'settings.save',
];
export function hasPermission(role: Role, operation: string): boolean {
  return (
    common.includes(operation) ||
    (role !== 'SELLER' && management.includes(operation)) ||
    (role === 'OWNER' && owner.includes(operation))
  );
}
export const roleLabel: Record<Role, string> = {
  SELLER: 'Vendedor',
  SUPERVISOR: 'Supervisor',
  OWNER: 'Jefe',
};
