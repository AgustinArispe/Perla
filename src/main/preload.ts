import { contextBridge, ipcRenderer } from 'electron';
import type { BochaApi, Result } from '../shared/contracts';
import type { Operation } from '../shared/requests';

function invoke<T>(operation: Operation, payload: unknown = null): Promise<Result<T>> {
  return ipcRenderer.invoke('bocha:request', { operation, payload });
}
const api: BochaApi = {
  system: { health: () => invoke('system.health'), reconnect: () => invoke('system.reconnect') },
  products: {
    search: (input) => invoke('products.search', input),
    save: (input) => invoke('products.save', input),
    setActive: (input) => invoke('products.setActive', input),
    findByBarcode: (barcode) => invoke('products.findByBarcode', { barcode }),
    previewImport: () => invoke('products.previewImport'),
    applyImport: (input) => invoke('products.applyImport', input),
  },
  checkout: {
    getDraft: () => invoke('checkout.getDraft'),
    saveDraft: (input) => invoke('checkout.saveDraft', input),
  },
};
contextBridge.exposeInMainWorld('bocha', api);
