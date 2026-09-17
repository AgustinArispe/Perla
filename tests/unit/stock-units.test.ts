import { expect, it } from 'vitest';
import { parseQuantity } from '../../src/domain/values';
import { stockState, formatStock } from '../../src/domain/inventory';
import { StockRecordSchema } from '../../src/shared/stock';

it('convierte kilos en gramos y distingue desconocido, cero, bajo y negativo', () => {
  expect(parseQuantity('2,500', 'KG')).toBe(2500);
  expect(() => parseQuantity('1,5', 'UNIT')).toThrow();
  expect(stockState(true, false, 0, 5)).toBe('UNKNOWN');
  expect(stockState(true, true, 0, 5)).toBe('OUT');
  expect(stockState(true, true, 5, 5)).toBe('LOW');
  expect(stockState(true, true, -1, 5)).toBe('NEGATIVE');
  expect(stockState(false, false, 0, 5)).toBe('DISABLED');
  expect(formatStock(-250, 'KG')).toBe('-0,250 kg');
});

it('rechaza merma cero, recepción negativa y fracciones en unidad base', () => {
  const input = {
    productId: crypto.randomUUID(),
    operationKey: crypto.randomUUID(),
    expectedRevision: 1,
    expectedProductRevision: 1,
    reason: 'Rotura',
    kind: 'WASTE',
  };
  expect(StockRecordSchema.safeParse({ ...input, deltaBase: 0 }).success).toBe(false);
  expect(StockRecordSchema.safeParse({ ...input, deltaBase: -1.5 }).success).toBe(false);
  expect(StockRecordSchema.safeParse({ ...input, kind: 'RECEIPT', deltaBase: -1 }).success).toBe(
    false,
  );
  expect(StockRecordSchema.safeParse({ ...input, deltaBase: -100 }).success).toBe(true);
});
