import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import type { MonthlyReport } from '../../src/shared/reports';
import { PeriodComparison } from '../../src/renderer/features/dashboard/PeriodComparison';

const exported = vi.hoisted(() => ({ filters: {} as Record<string, unknown> }));
vi.mock('../../src/renderer/components/ExportButton', () => ({
  ExportButton: ({ filters }: { filters: Record<string, unknown> }) => {
    exported.filters = filters;
    return null;
  },
}));

it('explora y exporta las fechas del mes histórico elegido, sin resolver el mes actual', () => {
  const period = {
    from: '2026-02-01',
    to: '2026-02-28',
    previousFrom: '2026-01-01',
    previousTo: '2026-01-28',
    open: false,
  };
  const report = {
    period,
    totals: { netCents: 0 },
    comparison: { previous: { netCents: 0 }, changeBasisPoints: null },
  } as MonthlyReport;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PeriodComparison, { monthlyReport: report }),
    ),
  );
  expect(exported.filters).toEqual({ preset: 'CUSTOM', from: period.from, to: period.to });
  expect(html).toContain('value="2026-02-01"');
  expect(html).toContain('value="2026-02-28"');
  client.clear();
});

it('exporta las fechas ya resueltas y el mismo resultado de un preset, sin volver a resolverlo al descargar', () => {
  const client = new QueryClient();
  client.setQueryData(['dashboard-comparison', { preset: 'MONTH' }], {
    period: {
      from: '2026-10-01',
      to: '2026-10-07',
      previousFrom: '2026-09-24',
      previousTo: '2026-09-30',
    },
    current: { netCents: 32100, saleCount: 3, averageCents: 10700 },
    previous: { netCents: 10000 },
    changeBasisPoints: 22100,
  });
  const html = renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(PeriodComparison)),
  );
  expect(html).toMatch(/\$\s321,00/);
  expect(html).toMatch(/\$\s100,00/);
  expect(exported.filters).toEqual({ preset: 'CUSTOM', from: '2026-10-01', to: '2026-10-07' });
  client.clear();
});
