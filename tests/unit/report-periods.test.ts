import { expect, it } from 'vitest';
import { comparisonPeriods } from '../../src/worker/reports/period';

const now = new Date('2026-10-05T15:00:00Z');

it('resuelve hoy, semana, mes y rango con un tramo anterior equivalente', () => {
  expect(comparisonPeriods({ preset: 'TODAY' }, now)).toEqual({
    from: '2026-10-05',
    to: '2026-10-05',
    previousFrom: '2026-10-04',
    previousTo: '2026-10-04',
  });
  expect(comparisonPeriods({ preset: 'WEEK' }, now)).toEqual({
    from: '2026-10-05',
    to: '2026-10-05',
    previousFrom: '2026-10-04',
    previousTo: '2026-10-04',
  });
  expect(comparisonPeriods({ preset: 'MONTH' }, now)).toEqual({
    from: '2026-10-01',
    to: '2026-10-05',
    previousFrom: '2026-09-26',
    previousTo: '2026-09-30',
  });
  expect(
    comparisonPeriods({ preset: 'CUSTOM', from: '2026-09-10', to: '2026-09-14' }, now),
  ).toEqual({
    from: '2026-09-10',
    to: '2026-09-14',
    previousFrom: '2026-09-05',
    previousTo: '2026-09-09',
  });
});

it('rechaza rangos invertidos o excesivos', () => {
  expect(() => comparisonPeriods({ preset: 'CUSTOM', from: '2026-10-05', to: '2026-10-04' }, now)).toThrow();
  expect(() => comparisonPeriods({ preset: 'CUSTOM', from: '2024-01-01', to: '2026-10-05' }, now)).toThrow();
});
