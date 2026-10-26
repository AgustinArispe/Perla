import { expect, test } from 'vitest';
import {
  availableFeatures,
  featureForOperation,
  validateFeatureSelection,
} from '../../src/domain/features';

test('solo las funciones opcionales entregadas son visibles y las operaciones protegidas se asignan', () => {
  expect(availableFeatures.map((feature) => feature.key)).toEqual([
    'BUSINESS_UNITS',
    'REPLENISHMENT',
    'STOCK_CONTROL',
    'MONTHLY_DASHBOARD',
    'RECEIPTS',
    'PRODUCT_LABELS',
    'SUPPLIERS_PURCHASES',
    'COSTS_MARGIN',
    'RETURNS',
    'LOTS',
    'PROMOTIONS',
    'NOTIFICATIONS',
    'SUPPLIER_ACCOUNTS',
    'CUSTOMERS',
    'CUSTOMER_CREDIT',
    'LOCATIONS_TRANSFERS',
    'DELIVERY_NOTES_SALES',
    'DELIVERY_NOTES_PURCHASES',
    'DELIVERY_NOTES_INTERNAL',
    'PREPARED_ORDERS',
  ]);
  expect(featureForOperation('stock.search')).toBe('STOCK_CONTROL');
  expect(featureForOperation('sales.complete')).toBeNull();
  expect(featureForOperation('purchases.receive')).toBe('SUPPLIERS_PURCHASES');
  expect(featureForOperation('suppliers.save')).toBe('SUPPLIERS_PURCHASES');
  expect(featureForOperation('costs.setReference')).toBe('COSTS_MARGIN');
  expect(featureForOperation('notifications.list')).toBe('NOTIFICATIONS');
  expect(featureForOperation('supplierAccounts.pay')).toBe('SUPPLIER_ACCOUNTS');
  expect(featureForOperation('customers.search')).toBe('CUSTOMERS');
  expect(featureForOperation('customerAccounts.collect')).toBe('CUSTOMERS');
  expect(featureForOperation('dashboard.compare')).toBe('MONTHLY_DASHBOARD');
  expect(featureForOperation('transfers.dispatch')).toBe('LOCATIONS_TRANSFERS');
  expect(validateFeatureSelection({ STOCK_CONTROL: true })).toEqual({ STOCK_CONTROL: true });
});
