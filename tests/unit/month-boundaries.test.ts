import { expect, it } from 'vitest';
import { monthPeriods } from '../../src/worker/reports/month';
it('compara mes abierto con mismos días locales y trunca febrero', () => {
  expect(monthPeriods('2024-03', new Date('2024-03-31T02:00:00Z'))).toMatchObject({
    from: '2024-03-01',
    to: '2024-03-30',
    previousFrom: '2024-02-01',
    previousTo: '2024-02-29',
    open: true,
  });
  expect(monthPeriods('2024-02', new Date('2024-04-01T12:00:00Z'))).toMatchObject({
    to: '2024-02-29',
    previousTo: '2024-01-31',
    open: false,
  });
  expect(monthPeriods('2026-01', new Date('2026-02-01T12:00:00Z'))).toMatchObject({
    previousFrom: '2025-12-01',
    previousTo: '2025-12-31',
  });
  expect(() => monthPeriods('2026-13')).toThrow();
});
