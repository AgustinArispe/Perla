import { expect, it } from 'vitest';
import {
  clearPendingPurchase,
  readPendingPurchase,
  writePendingPurchase,
} from '../../src/renderer/features/purchases/pending';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const body = {
  receiptKey: 'd9428888-122b-4f1d-a179-217b91bb44f9',
  supplierId: null,
  businessDate: '2026-10-02',
  lines: [],
};

it('recupera y limpia el último borrador local válido', () => {
  const storage = memoryStorage();
  writePendingPurchase(body, storage);
  expect(readPendingPurchase(storage)?.body).toEqual(body);
  clearPendingPurchase(storage);
  expect(readPendingPurchase(storage)).toBeNull();
});

it('ignora contenido local alterado o incompatible', () => {
  const storage = memoryStorage();
  storage.setItem('perla.purchase.pending.v1', '{"body":{"lines":"bad"},"savedAt":"now"}');
  expect(readPendingPurchase(storage)).toBeNull();
});
