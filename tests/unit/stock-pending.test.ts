import { expect, it } from 'vitest';
import { loadPending, savePending, clearPending } from '../../src/renderer/features/stock/pending';

it('conserva payload y clave del registro pendiente y no los reemplaza al reintentar', () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
  const pending = {
    action: 'record' as const,
    name: 'Leche',
    input: {
      productId: crypto.randomUUID(),
      operationKey: crypto.randomUUID(),
      expectedRevision: 1,
      expectedProductRevision: 2,
      kind: 'RECEIPT' as const,
      deltaBase: 10,
      reason: 'Reposición',
    },
  };
  savePending(pending, storage);
  expect(loadPending(storage)).toEqual(pending);
  expect(() =>
    savePending({ ...pending, input: { ...pending.input, deltaBase: 20 } }, storage),
  ).toThrow('pendiente');
  clearPending(crypto.randomUUID(), storage);
  expect(loadPending(storage)).toEqual(pending);
  clearPending(pending.input.operationKey, storage);
  expect(loadPending(storage)).toBeNull();
});

it('no permite enviar un registro si no se pudo conservar su intención', () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('Sin espacio');
    },
    removeItem: () => {},
  };
  expect(() =>
    savePending(
      {
        action: 'opening',
        name: 'Leche',
        input: {
          productId: crypto.randomUUID(),
          operationKey: crypto.randomUUID(),
          expectedRevision: 0,
          expectedProductRevision: 1,
          countedBase: 0,
          reason: 'Conteo',
        },
      },
      storage,
    ),
  ).toThrow('Sin espacio');
});
