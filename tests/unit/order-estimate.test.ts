import { expect, it } from 'vitest';
import { estimateOrder } from '../../src/renderer/features/prepared-orders/order-estimate';
it('estima unidades y kilos con el redondeo de las ventas', () => {
  expect(
    estimateOrder([
      { product: { saleUnit: 'UNIT', priceCents: 1000 }, quantity: '3' },
      { product: { saleUnit: 'KG', priceCents: 12345 }, quantity: '0,333' },
    ]),
  ).toEqual({ totalCents: 7111, lineTotals: [3000, 4111] });
  expect(estimateOrder([])).toEqual({ totalCents: 0, lineTotals: [] });
});
it('no muestra un total engañoso con cantidades inválidas', () => {
  for (const quantity of ['', 'abc', '-1', '0', '1,5', '9999999999999999999'])
    expect(
      estimateOrder([{ product: { saleUnit: 'UNIT', priceCents: 1000 }, quantity }]),
    ).toBeNull();
});
