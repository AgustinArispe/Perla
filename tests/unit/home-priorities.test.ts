import { expect, it } from 'vitest';
import { homePriorities } from '../../src/renderer/features/control/home-priorities';
it('separa prioridades observadas de mantenimiento sin alarmar por contadores grandes', () => {
  const group = (key: string, total: number, action = key) => ({
    key,
    total,
    action,
    title: key,
    area: 'operations',
    sample: [],
  });
  const groups = [
    group('prices', 4000),
    group('cashDifferences', 2),
    group('expiries', 1),
    group('replenishment', 2000),
    group('empty', 0),
  ];
  const result = homePriorities(groups);
  expect(result.priority.map((row) => row.key)).toEqual(['expiries', 'cashDifferences']);
  expect(result.planned.map((row) => row.key)).toEqual(['prices', 'replenishment']);
  expect(groups[0]?.key).toBe('prices');
  expect(homePriorities([])).toEqual({ priority: [], planned: [] });
});
