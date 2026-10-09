import { describe, expect, it } from 'vitest';
import { proportionalIncrement } from '../../src/domain/returns';

describe('prorrateo acumulado de devoluciones', () => {
  it('conserva cada centavo al devolver una línea en varias partes', () => {
    const first = proportionalIncrement({
      totalAmountCents: 1000,
      totalQuantityBase: 3,
      previousQuantityBase: 0,
      returnedQuantityBase: 1,
    });
    const second = proportionalIncrement({
      totalAmountCents: 1000,
      totalQuantityBase: 3,
      previousQuantityBase: 1,
      returnedQuantityBase: 1,
    });
    const last = proportionalIncrement({
      totalAmountCents: 1000,
      totalQuantityBase: 3,
      previousQuantityBase: 2,
      returnedQuantityBase: 1,
    });
    expect([first, second, last]).toEqual([333, 333, 334]);
    expect(first + second + last).toBe(1000);
  });

  it('funciona igual con gramos y costos históricos', () => {
    expect(
      proportionalIncrement({
        totalAmountCents: 875,
        totalQuantityBase: 750,
        previousQuantityBase: 250,
        returnedQuantityBase: 125,
      }),
    ).toBe(146);
  });

  it('rechaza cero, excesos y enteros inseguros', () => {
    const base = {
      totalAmountCents: 1000,
      totalQuantityBase: 3,
      previousQuantityBase: 0,
      returnedQuantityBase: 1,
    };
    expect(() => proportionalIncrement({ ...base, returnedQuantityBase: 0 })).toThrow();
    expect(() =>
      proportionalIncrement({ ...base, previousQuantityBase: 2, returnedQuantityBase: 2 }),
    ).toThrow();
    expect(() =>
      proportionalIncrement({ ...base, totalAmountCents: Number.MAX_SAFE_INTEGER + 1 }),
    ).toThrow();
  });
});
