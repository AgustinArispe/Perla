import { contextBridge, ipcRenderer } from 'electron';
import type { BochaApi, Result } from '../shared/contracts';
import type { Operation } from '../shared/requests';

function invoke<T>(operation: Operation, payload: unknown = null): Promise<Result<T>> {
  return ipcRenderer.invoke('bocha:request', { operation, payload });
}
const api: BochaApi = {
  dashboard: { monthly: (month) => invoke('dashboard.monthly', { month }) },
  auth: {
    status: () => invoke('auth.status'),
    bootstrap: (input) => invoke('auth.bootstrap', input),
    login: (input) => invoke('auth.login', input),
    logout: () => invoke('auth.logout'),
    changePassword: (input) => invoke('auth.changePassword', input),
  },
  users: { list: () => invoke('users.list'), save: (input) => invoke('users.save', input) },
  system: { health: () => invoke('system.health'), reconnect: () => invoke('system.reconnect') },
  products: {
    get: (productId) => invoke('products.get', { productId }),
    search: (input) => invoke('products.search', input),
    save: (input) => invoke('products.save', input),
    setActive: (input) => invoke('products.setActive', input),
    findByBarcode: (barcode) => invoke('products.findByBarcode', { barcode }),
    previewImport: () => invoke('products.previewImport'),
    applyImport: (input) => invoke('products.applyImport', input),
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
  sales: {
    complete: (input) => invoke('sales.complete', input),
    findByCheckoutKey: (checkoutKey) => invoke('sales.findByCheckoutKey', { checkoutKey }),
    detail: (saleId) => invoke('sales.detail', { saleId }),
    list: (input) => invoke('sales.list', input),
    previewVoid: (saleId) => invoke('sales.previewVoid', { saleId }),
    void: (input) => invoke('sales.void', input),
  },
};
contextBridge.exposeInMainWorld('bocha', api);
