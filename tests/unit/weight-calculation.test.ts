import { expect, it } from 'vitest';
import { parseWeight } from '../../src/domain/weight';
import { calculateSale } from '../../src/domain/sale';
it('gramos y kilos explícitos coinciden, sin subgramos ni límites silenciosos', () => {
  expect(parseWeight('250', 'GRAM')).toBe(250);
  expect(parseWeight('0,250', 'KG')).toBe(250);
  expect(parseWeight('0.250', 'KG')).toBe(250);
  expect(
    calculateSale([{ unit: 'KG', priceCents: 1200000, quantityBase: 250 }], { type: 'NONE' })
      .totalCents,
  ).toBe(300000);
  for (const value of ['0', '-1', '100000', '1,5'])
    expect(() => parseWeight(value, 'GRAM')).toThrow();
  expect(() => parseWeight('0,0005', 'KG')).toThrow();
});
