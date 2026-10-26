import { contextBridge, ipcRenderer } from 'electron';
import type { BochaApi, Result } from '../shared/contracts';
import type { Operation } from '../shared/requests';

function invoke<T>(operation: Operation, payload: unknown = null): Promise<Result<T>> {
  return ipcRenderer.invoke('bocha:request', { operation, payload });
}
const api: BochaApi = {
  dashboard: {
    monthly: (month) => invoke('dashboard.monthly', { month }),
    compare: (input) => invoke('dashboard.compare', input),
  },
  notifications: {
    list: () => invoke('notifications.list', null),
    markRead: (input) => invoke('notifications.markRead', input),
  },
  auth: {
    status: () => invoke('auth.status'),
    bootstrap: (input) => invoke('auth.bootstrap', input),
    login: (input) => invoke('auth.login', input),
    logout: () => invoke('auth.logout'),
    changePassword: (input) => invoke('auth.changePassword', input),
    unlockUser: (input) => invoke('auth.unlockUser', input),
  },
  users: {
    list: () => invoke('users.list'),
    save: (input) => invoke('users.save', input),
    unlockUser: (input) => invoke('auth.unlockUser', input),
  },
  system: {
    health: () => invoke('system.health'),
    reconnect: () => invoke('system.reconnect'),
  },
  products: {
    get: (productId) => invoke('products.get', { productId }),
    search: (input) => invoke('products.search', input),
    save: (input) => invoke('products.save', input),
    setActive: (input) => invoke('products.setActive', input),
    taxonomy: (input) => invoke('products.taxonomy', input),
    saveCategory: (input) => invoke('products.saveCategory', input),
    saveBrand: (input) => invoke('products.saveBrand', input),
    findByBarcode: (barcode) => invoke('products.findByBarcode', { barcode }),
    proposeInternalBarcode: () => invoke('products.proposeInternalBarcode'),
    labels: (input) => invoke('products.labels', input),
    createLabel: (input) => invoke('products.createLabel', input),
    markLabelPrinted: (input) => invoke('products.markLabelPrinted', input),
    previewImport: () => invoke('products.previewImport'),
    applyImport: (input) => invoke('products.applyImport', input),
  },
  pricing: {
    preview: (input) => invoke('pricing.preview', input),
    confirm: (input) => invoke('pricing.confirm', input),
  },
  promotions: {
    list: () => invoke('promotions.list'),
    get: (promotionId) => invoke('promotions.get', { promotionId }),
    save: (input) => invoke('promotions.save', input),
  },
  checkout: {
    cancelDraft: (expectedRevision) => invoke('checkout.cancelDraft', { expectedRevision }),
    getDraft: () => invoke('checkout.getDraft'),
    saveDraft: (input) => invoke('checkout.saveDraft', input),
  },
  stock: {
    operation: (operationKey) => invoke('stock.operation', { operationKey }),
    get: (productId) => invoke('stock.get', { productId }),
    search: (input) => invoke('stock.search', input),
    opening: (input) => invoke('stock.opening', input),
    count: (input) => invoke('stock.count', input),
    record: (input) => invoke('stock.record', input),
    listLow: (input) => invoke('stock.listLow', input),
    movements: (input) => invoke('stock.movements', input),
  },
  lots: {
    status: (productId) => invoke('lots.status', { productId }),
    enable: (productId) => invoke('lots.enable', { productId }),
    reconcile: (input) => invoke('lots.reconcile', input),
    setBlocked: (input) => invoke('lots.setBlocked', input),
  },
  preparedOrders: {
    create: (input) => invoke('preparedOrders.create', input),
    list: (input) => invoke('preparedOrders.list', input),
    byNumber: (number) => invoke('preparedOrders.byNumber', { number }),
    cancel: (input) => invoke('preparedOrders.cancel', input),
  },
  businessUnits: {
    status: () => invoke('businessUnits.status', null),
    rename: (input) => invoke('businessUnits.rename', input),
  },
  deliveryNotes: {
    list: (input) => invoke('deliveryNotes.list', input),
    sources: (input) => invoke('deliveryNotes.sources', input),
    detail: (noteId) => invoke('deliveryNotes.detail', { noteId }),
    create: (input) => invoke('deliveryNotes.create', input),
    deliver: (input) => invoke('deliveryNotes.deliver', input),
    cancel: (input) => invoke('deliveryNotes.cancel', input),
  },
  receipts: {
    create: (input) => invoke('receipts.create', input),
    list: (input) => invoke('receipts.list', input),
    markPrinted: (input) => invoke('receipts.markPrinted', input),
  },
  suppliers: {
    get: (supplierId) => invoke('suppliers.get', { supplierId }),
    search: (input) => invoke('suppliers.search', input),
    save: (input) => invoke('suppliers.save', input),
    setActive: (input) => invoke('suppliers.setActive', input),
  },
  supplierAccounts: {
    detail: (supplierId) => invoke('supplierAccounts.detail', { supplierId }),
    pay: (input) => invoke('supplierAccounts.pay', input),
  },
  customers: {
    get: (customerId) => invoke('customers.get', { customerId }),
    search: (input) => invoke('customers.search', input),
    save: (input) => invoke('customers.save', input),
    setActive: (input) => invoke('customers.setActive', input),
    setCredit: (input) => invoke('customers.setCredit', input),
  },
  customerAccounts: {
    detail: (customerId) => invoke('customerAccounts.detail', { customerId }),
    collect: (input) => invoke('customerAccounts.collect', input),
  },
  locations: {
    inventory: (input) => invoke('locations.inventory', input),
    list: () => invoke('locations.list', {}),
    save: (input) => invoke('locations.save', input),
    assignTerminal: (input) => invoke('locations.assignTerminal', input),
    summary: (month) => invoke('locations.summary', { month }),
  },
  transfers: {
    list: (input) => invoke('transfers.list', input),
    detail: (transferId) => invoke('transfers.detail', { transferId }),
    dispatch: (input) => invoke('transfers.dispatch', input),
    receive: (input) => invoke('transfers.receive', input),
    cancel: (input) => invoke('transfers.cancel', input),
  },
  purchases: {
    getDraft: () => invoke('purchases.getDraft'),
    saveDraft: (input) => invoke('purchases.saveDraft', input),
    cancelDraft: (expectedRevision) => invoke('purchases.cancelDraft', { expectedRevision }),
    receive: (input) => invoke('purchases.receive', input),
    findByReceiptKey: (receiptKey) => invoke('purchases.findByReceiptKey', { receiptKey }),
    detail: (purchaseId) => invoke('purchases.detail', { purchaseId }),
    list: (input) => invoke('purchases.list', input),
    previewVoid: (purchaseId) => invoke('purchases.previewVoid', { purchaseId }),
    void: (input) => invoke('purchases.void', input),
    lastCost: (productId) => invoke('purchases.lastCost', { productId }),
  },
  costs: {
    get: (productId) => invoke('costs.get', { productId }),
    setReference: (input) => invoke('costs.setReference', input),
  },
  sales: {
    quote: (input) => invoke('sales.quote', input),
    complete: (input) => invoke('sales.complete', input),
    findByCheckoutKey: (checkoutKey) => invoke('sales.findByCheckoutKey', { checkoutKey }),
    detail: (saleId) => invoke('sales.detail', { saleId }),
    list: (input) => invoke('sales.list', input),
    previewVoid: (saleId) => invoke('sales.previewVoid', { saleId }),
    void: (input) => invoke('sales.void', input),
    previewReturn: (saleId) => invoke('sales.previewReturn', { saleId }),
    returnSale: (input) => invoke('sales.return', input),
    returns: (saleId) => invoke('sales.returns', { saleId }),
  },
};
contextBridge.exposeInMainWorld('bocha', api);
