import { describe, expect, test } from 'vitest';
import {
  costRateFromUnitCost,
  costForQuantity,
  weightedAverageCost,
  coverageBasisPoints,
} from '../../src/domain/costs';

describe('cost math', () => {
  test('converts unit and kilogram prices to microcents per base unit', () => {
    expect(costRateFromUnitCost('UNIT', 1234)).toBe(1_234_000_000);
    expect(costRateFromUnitCost('KG', 1234)).toBe(1_234_000);
  });

  test('rounds a weighted average to the closest microcent with ties upwards', () => {
    expect(
      weightedAverageCost({
        oldQuantityBase: 3,
        oldRateMicros: 1,
        receivedQuantityBase: 1,
        receivedRateMicros: 3,
      }),
    ).toBe(2);
    expect(
      weightedAverageCost({
        oldQuantityBase: 2,
        oldRateMicros: 10_000_000,
        receivedQuantityBase: 1,
        receivedRateMicros: 13_000_000,
      }),
    ).toBe(11_000_000);
  });

  test('starts from received stock when previous stock is zero or negative', () => {
    expect(
      weightedAverageCost({
        oldQuantityBase: -2,
        oldRateMicros: 99,
        receivedQuantityBase: 3,
        receivedRateMicros: 4_500_000,
      }),
    ).toBe(4_500_000);
  });

  test('rounds line costs in cents without floating point', () => {
    expect(costForQuantity(3, 1_500_000)).toBe(5);
    expect(costForQuantity(250, costRateFromUnitCost('KG', 2_000))).toBe(500);
  });

  test('reports coverage against net sales in basis points', () => {
    expect(coverageBasisPoints(7_500, 10_000)).toBe(7_500);
    expect(coverageBasisPoints(0, 0)).toBe(0);
  });
});
