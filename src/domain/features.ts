import type { FeatureKey, FeatureSelection } from '../shared/features';

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
}

export const availableFeatures: readonly FeatureDefinition[] = [
  {
    key: 'BUSINESS_UNITS',
    name: 'BiEmpresa · unidades operativas',
    description:
      'Dos unidades identificadas por usuario, con ventas trazables e inventario compartido. Sin facturación fiscal.',
  },
  {
    key: 'REPLENISHMENT',
    name: 'Reposición y pedidos',
    description: 'Sugerencias de compra y recepción de pedidos.',
  },
  {
    key: 'STOCK_CONTROL',
    name: 'Control de stock',
    description: 'Existencias, conteos y alertas de reposición.',
  },
  {
    key: 'MONTHLY_DASHBOARD',
    name: 'Resumen mensual',
    description: 'Ventas y comparativos del negocio.',
  },
  {
    key: 'RECEIPTS',
    name: 'Comprobantes',
    description: 'Comprobantes internos de las ventas.',
  },
  {
    key: 'PRODUCT_LABELS',
    name: 'Etiquetas',
    description: 'Etiquetas internas para productos.',
  },
  {
    key: 'SUPPLIERS_PURCHASES',
    name: 'Proveedores y compras',
    description: 'Recepciones, costos e historial de proveedores.',
  },
  {
    key: 'COSTS_MARGIN',
    name: 'Costos y rentabilidad',
    description: 'Costo de mercadería, margen bruto y cobertura.',
  },
  {
    key: 'RETURNS',
    name: 'Devoluciones',
    description: 'Devoluciones parciales, reintegros y reingreso al stock.',
  },
  {
    key: 'LOTS',
    name: 'Lotes y vencimientos',
    description: 'Trazabilidad y salida automática por próximo vencimiento.',
  },
  {
    key: 'PROMOTIONS',
    name: 'Promociones',
    description: 'Ofertas automáticas aplicadas al cobrar.',
  },
  {
    key: 'NOTIFICATIONS',
    name: 'Notificaciones',
    description: 'Avisos de stock, vencimientos y control del negocio.',
  },
  {
    key: 'SUPPLIER_ACCOUNTS',
    name: 'Cuenta de proveedores',
    description: 'Saldos, pagos parciales y egresos vinculados a compras.',
  },
  { key: 'CUSTOMERS', name: 'Clientes', description: 'Contactos e historial de compras.' },
  {
    key: 'CUSTOMER_CREDIT',
    name: 'Cuenta corriente',
    description: 'Ventas a cuenta, límites y cobros.',
  },
  {
    key: 'LOCATIONS_TRANSFERS',
    name: 'Ubicaciones y traslados',
    description: 'Stock por local y mercadería en tránsito.',
  },
  {
    key: 'DELIVERY_NOTES_SALES',
    name: 'Remitos a clientes',
    description: 'Documentos de entrega vinculados a ventas registradas.',
  },
  {
    key: 'DELIVERY_NOTES_PURCHASES',
    name: 'Remitos de proveedores',
    description: 'Constancias de recepciones vinculadas a compras registradas.',
  },
  {
    key: 'DELIVERY_NOTES_INTERNAL',
    name: 'Remitos internos',
    description: 'Documentos de mercadería vinculados a traslados entre ubicaciones.',
  },
  {
    key: 'PREPARED_ORDERS',
    name: 'Órdenes para caja',
    description: 'Preparar pedidos sin cobrar y recuperarlos por número para pagarlos en caja.',
  },
];

const protectedOperations: Readonly<Record<string, FeatureKey>> = {
  'dashboard.monthly': 'MONTHLY_DASHBOARD',
  'dashboard.compare': 'MONTHLY_DASHBOARD',
  'products.labels': 'PRODUCT_LABELS',
  'products.createLabel': 'PRODUCT_LABELS',
  'products.markLabelPrinted': 'PRODUCT_LABELS',
};

export const purchaseHistoryOperations = new Set([
  'purchases.findByReceiptKey',
  'purchases.detail',
  'purchases.list',
  'purchases.previewVoid',
  'purchases.void',
]);
export const transferHistoryOperations = new Set(['transfers.list', 'transfers.detail']);

export function featureForOperation(operation: string): FeatureKey | null {
  if (operation.startsWith('locations.') || operation.startsWith('transfers.'))
    return 'LOCATIONS_TRANSFERS';
  if (operation.startsWith('customerAccounts.')) return 'CUSTOMERS';
  if (operation.startsWith('customers.')) return 'CUSTOMERS';
  if (operation.startsWith('supplierAccounts.')) return 'SUPPLIER_ACCOUNTS';
  if (operation.startsWith('notifications.')) return 'NOTIFICATIONS';
  if (operation.startsWith('promotions.')) return 'PROMOTIONS';
  if (operation.startsWith('lots.')) return 'LOTS';
  if (operation === 'sales.previewReturn' || operation === 'sales.return') return 'RETURNS';
  if (operation.startsWith('costs.')) return 'COSTS_MARGIN';
  if (operation.startsWith('stock.')) return 'STOCK_CONTROL';
  if (operation.startsWith('receipts.')) return 'RECEIPTS';
  if (
    operation.startsWith('suppliers.') ||
    (operation.startsWith('purchases.') && !purchaseHistoryOperations.has(operation))
  )
    return 'SUPPLIERS_PURCHASES';
  return protectedOperations[operation] ?? null;
}

export function validateFeatureSelection(selection: FeatureSelection): FeatureSelection {
  const validKeys = new Set(availableFeatures.map((feature) => feature.key));
  return Object.fromEntries(
    Object.entries(selection).filter(([key]) => validKeys.has(key as FeatureKey)),
  ) as FeatureSelection;
}
