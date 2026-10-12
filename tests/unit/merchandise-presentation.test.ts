import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { ReplenishmentPanel } from '../../src/renderer/features/control/ReplenishmentPanel';
import { StockList } from '../../src/renderer/features/stock/StockList';

vi.mock('../../src/renderer/components/SavedViews', () => ({ SavedViews: () => null }));
vi.mock('../../src/renderer/components/ExportButton', () => ({ ExportButton: () => null }));

it('distingue sin control y sin conteo de una existencia cero', () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(['stock', 'list', '', 'ALL', '', '', undefined], {
    total: 3,
    items: [
      {
        productId: 'disabled',
        name: 'Servicio',
        unit: 'UNIT',
        quantityBase: 0,
        minStockBase: 0,
        trackStock: false,
        initialized: false,
        state: 'DISABLED',
      },
      {
        productId: 'unknown',
        name: 'Sin inventario',
        unit: 'UNIT',
        quantityBase: null,
        minStockBase: 0,
        trackStock: true,
        initialized: false,
        state: 'UNKNOWN',
      },
      {
        productId: 'out',
        name: 'Agotado',
        unit: 'UNIT',
        quantityBase: 0,
        minStockBase: 1,
        trackStock: true,
        initialized: true,
        state: 'OUT',
      },
    ],
  });
  const html = renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(StockList)),
  );
  const rows = html.match(/<tr[^>]*>.*?<\/tr>/g)!;
  expect(rows[1]).toContain('>Sin control</td>');
  expect(rows[2]).toContain('>Sin conteo</td>');
  expect(rows[3]).toContain('>0 u.</td>');
  expect(rows[3]).toContain('Ingreso / merma');
  expect(rows[3]).toContain('Movimientos');
  client.clear();
});

it('permite avanzar cuando hay más sugerencias que las 25 filas de la página', () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(['control', 'replenishment', 'locations'], [{ id: 'local', name: 'Local' }]);
  client.setQueryData(
    [
      'control',
      'replenishment',
      'suggest',
      {
        locationId: 'local',
        coverageDays: 7,
        referenceDays: 28,
        query: '',
        productIds: [],
        onlyNeeded: true,
        offset: 0,
        limit: 25,
      },
    ],
    {
      total: 30,
      horizon: '2026-10-19',
      calendarConfigured: true,
      items: Array.from({ length: 25 }, (_, index) => ({
        productId: String(index),
        name: `Producto ${index}`,
        unit: 'UNIT',
        suggestedBase: 1,
        availableBase: 0,
        targetBase: 1,
        incomingBase: 0,
        dailyDemand: null,
        observedOpenDays: 0,
      })),
    },
  );
  const html = renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(ReplenishmentPanel)),
  );
  const nextButton = html.match(/<button[^>]*>Siguiente<\/button>/)?.[0];
  expect(nextButton).toBeDefined();
  expect(nextButton).not.toContain('disabled');
  client.clear();
});
