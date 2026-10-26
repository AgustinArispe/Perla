import { expect, it } from 'vitest';
import { cashSuggestions } from '../../src/renderer/features/checkout/quick-payment';
import { MAX_MONEY } from '../../src/domain/values';
it('ofrece efectivo exacto e importes redondos sin duplicados', () => {
  expect(cashSuggestions(1850000)).toEqual([1850000, 1900000, 2000000]);
  expect(cashSuggestions(1000000)).toEqual([1000000, 2000000]);
  expect(cashSuggestions(6340506)).toEqual([6340506, 6400000, 6500000, 7000000]);
});
it('no sugiere importes inválidos ni supera el límite monetario', () => {
  for (const value of [-1, 0, 1.5, NaN, Infinity, MAX_MONEY + 1])
    expect(cashSuggestions(value)).toEqual([]);
  expect(cashSuggestions(MAX_MONEY)).toEqual([MAX_MONEY]);
});
