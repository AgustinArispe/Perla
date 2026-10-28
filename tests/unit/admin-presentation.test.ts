import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { ControlHome as HomeData } from '../../src/shared/control';
import { ControlHome } from '../../src/renderer/features/control/ControlHome';

function home(todayNet = 0, lastSaleDate: string | null = null): HomeData {
  const totals = {
    grossCents: 0,
    discountCents: 0,
    netCents: todayNet,
    saleCount: 0,
    averageCents: 0,
    voidedCount: 0,
    voidedCents: 0,
  };
  return {
    generatedAt: '2026-10-12T12:00:00Z',
    overview: {
      businessDate: '2026-10-12',
      weekFrom: '2026-10-12',
      today: totals,
      week: totals,
      lastSaleDate,
    },
    registers: [],
    accounts: null,
    groups: [],
  };
}
function render(data: HomeData) {
  const client = new QueryClient();
  client.setQueryData(['control-home'], data);
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(ControlHome, { onOpen: () => {}, owner: true, stockEnabled: true }),
    ),
  );
  client.clear();
  return html;
}

describe('Inicio con actividad real y pendientes', () => {
  it('distingue el primer uso de un día sin ventas después de actividad previa', () => {
    expect(render(home())).toContain('registrar tu primera venta');
    expect(render(home(0, '2026-10-09'))).toContain('Todavía no hubo ventas hoy');
    expect(render(home(0, '2026-10-09'))).not.toContain('registrar tu primera venta');
  });
  it('explica un neto negativo sin ventas como devoluciones y conserva el importe', () => {
    const html = render(home(-12345, '2026-10-09'));
    expect(html).toContain('El neto refleja devoluciones registradas hoy');
    expect(html).toMatch(/-\$\s*123,45/);
    expect(html).not.toContain('registrar tu primera venta');
  });
  it('prioriza vencimientos y diferencias reales sin inventar urgencia ni alterar los datos', () => {
    const data = home();
    data.groups = [
      {
        key: 'price',
        title: 'Precios pendientes',
        total: 120,
        area: 'commercial',
        action: 'prices',
        sample: [],
      },
      {
        key: 'cash',
        title: 'Diferencias pendientes',
        total: 2,
        area: 'operations',
        action: 'cashDifferences',
        sample: [],
      },
      {
        key: 'expiry',
        title: 'Lotes para revisar',
        total: 1,
        area: 'operations',
        action: 'expiries',
        sample: [],
      },
      {
        key: 'empty',
        title: 'Sin pendientes',
        total: 0,
        area: 'commercial',
        action: 'costs',
        sample: [],
      },
    ];
    const before = structuredClone(data.groups);
    const html = render(data);
    expect(html.indexOf('Lotes para revisar')).toBeLessThan(html.indexOf('Diferencias pendientes'));
    expect(html.indexOf('Diferencias pendientes')).toBeLessThan(html.indexOf('Precios pendientes'));
    expect(html).not.toContain('Sin pendientes</strong>');
    expect(html).not.toMatch(/urgente|crítico/i);
    expect(data.groups).toEqual(before);
  });
});
