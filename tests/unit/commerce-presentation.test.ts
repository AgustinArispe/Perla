import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { CustomerPage } from '../../src/renderer/features/customers/CustomerPage';
import { SupplierList } from '../../src/renderer/features/purchases/SupplierList';
import { AgendaPanel } from '../../src/renderer/features/control/AgendaPanel';
import { PromotionPage } from '../../src/renderer/features/promotions/PromotionPage';
import { SalesList } from '../../src/renderer/features/history/SalesList';
import { formatMoney } from '../../src/domain/values';

vi.mock('../../src/renderer/components/SavedViews', () => ({ SavedViews: () => null }));
vi.mock('../../src/renderer/components/ExportButton', () => ({ ExportButton: () => null }));

function render(component: ReturnType<typeof createElement>, key: unknown[], data: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(key, data);
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, component));
  client.clear();
  return html;
}

it('explica que el saldo positivo de un proveedor está por pagar', () => {
  const html = render(
    createElement(SupplierList, { accountsEnabled: true }),
    ['suppliers', '', undefined],
    {
      items: [{ id: 's', name: 'Mar del Sur', active: true, balanceCents: 12300 }],
      total: 1,
    },
  );
  expect(html).toContain('Por pagar');
  expect(html).toContain('Ver cuenta');
});

it('identifica la deuda del cliente como un importe por cobrar', () => {
  const html = render(createElement(CustomerPage, { canManageCredit: true }), ['customers', ''], {
    items: [{ id: 'c', name: 'Ana', active: true, creditEnabled: true, balanceCents: 4500 }],
    total: 1,
  });
  expect(html).toContain('Por cobrar');
});

it('ofrece un único control del tipo de compromiso y conserva los totales completos del filtro', () => {
  const html = render(
    createElement(AgendaPanel),
    ['control', 'agenda', { kind: 'ALL', bucket: 'ALL' }, 1],
    {
      items: [],
      total: 30,
      summary: { receivableCents: 10000, payableCents: 20000 },
    },
  );
  expect(html).toContain('Tipo de compromiso');
  expect(html).not.toContain('<option value="CUSTOMER">');
  expect(html).toContain('Por cobrar · total del filtro');
  expect(html).toContain('Por pagar · total del filtro');
  expect(html).toContain(formatMoney(10000));
  expect(html).toContain(formatMoney(20000));
});

it('muestra conteos una sola vez y expresa alcance y vigencia de la promoción', () => {
  const html = render(
    createElement(PromotionPage),
    ['promotions'],
    [
      {
        id: 'p',
        revision: 1,
        input: {
          name: 'Oferta merluza',
          type: 'PERCENT',
          status: 'ACTIVE',
          basisPoints: 1000,
          startsAt: null,
          endsAt: null,
          productIds: ['a', 'b'],
          categoryIds: ['c'],
          brandIds: [],
        },
      },
    ],
  );
  expect(html).not.toContain('promotion-overview');
  expect(html).toContain('2 productos · 1 categoría');
  expect(html).toContain('Sin fecha de finalización');
});

it('abre el histórico con el día de Resultados y explica el alcance de devoluciones', () => {
  const html = render(
    createElement(SalesList, { userId: 'u', initialDate: '2026-09-14', onBackToResults: () => {} }),
    ['sales-history', { limit: 20, status: 'ALL', fromDate: '2026-09-14', toDate: '2026-09-14' }],
    { items: [], total: 0 },
  );
  expect(html.match(/value="2026-09-14"/g)).toHaveLength(2);
  expect(html).toContain('Volver a Resultados');
  expect(html).toContain('las devoluciones pueden corresponder a ventas anteriores');
});

it('muestra el crédito del proveedor sin compensarlo contra el saldo por pagar', () => {
  const html = render(
    createElement(SupplierList, { accountsEnabled: true }),
    ['suppliers', '', undefined],
    {
      items: [
        { id: 's', name: 'Mar del Sur', active: true, balanceCents: 12300, creditCents: 4000 },
      ],
      total: 1,
    },
  );
  expect(html).toContain('A nuestro favor');
  expect(html).toContain('Por pagar');
});

it.each([
  [2, 'Desde 2 unidades o 0,002 kg'],
  [1500, 'Desde 1.500 unidades o 1,5 kg'],
])(
  'explica el umbral %i por producto en unidades y kilos sin suponer el tipo de los objetivos',
  (thresholdBase, expected) => {
    const html = render(
      createElement(PromotionPage),
      ['promotions'],
      [
        {
          id: 'quantity',
          revision: 1,
          input: {
            name: 'Precio por cantidad',
            type: 'QUANTITY_PRICE',
            status: 'ACTIVE',
            thresholdBase,
            specialPriceCents: 100000,
            startsAt: null,
            endsAt: null,
            productIds: [],
            categoryIds: ['mixed-category'],
            brandIds: [],
          },
        },
      ],
    );
    expect(html).toContain(expected);
    expect(html).toContain('según la forma de venta de cada producto');
    expect(html).toContain('por unidad o kg');
  },
);
