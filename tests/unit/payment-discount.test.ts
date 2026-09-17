import { expect, it } from 'vitest';
import { calculateSale } from '../../src/domain/sale';
import { validatePayments } from '../../src/domain/payment';
it('calcula gramos, redondea y reparte el descuento conservando cada centavo', () => {
  const result = calculateSale(
    [
      { unit: 'KG', priceCents: 12345, quantityBase: 333 },
      { unit: 'UNIT', priceCents: 100, quantityBase: 1 },
    ],
    { type: 'FIXED', amountCents: 3 },
  );
  expect(result.subtotalCents).toBe(4211);
  expect(result.totalCents).toBe(4208);
  expect(result.lines.reduce((sum, line) => sum + line.netCents, 0)).toBe(result.totalCents);
  expect(
    calculateSale(
      Array.from({ length: 3 }, () => ({ unit: 'UNIT' as const, priceCents: 1, quantityBase: 1 })),
      { type: 'FIXED', amountCents: 1 },
    ).lines.map((line) => line.discountCents),
  ).toEqual([1, 0, 0]);
});
it('conciliación de pagos mixtos usa aplicado y calcula vuelto', () => {
  const payments = validatePayments(
    [
      { method: 'DEBIT', amountCents: 600000 },
      { method: 'CASH', amountCents: 400000, tenderedCents: 500000 },
    ],
    1000000,
  );
  expect(payments[1]?.changeCents).toBe(100000);
  expect(() =>
    validatePayments([{ method: 'CASH', amountCents: 400000, tenderedCents: 300000 }], 400000),
  ).toThrow();
  expect(() =>
    validatePayments([{ method: 'DEBIT', amountCents: 1, tenderedCents: 2 }], 1),
  ).toThrow();
});
it('rechaza excesos, descuento mayor al subtotal y admite venta bonificada sin pagos', () => {
  expect(() =>
    calculateSale([{ unit: 'UNIT', priceCents: 9999999999, quantityBase: 1000000000 }], {
      type: 'NONE',
    }),
  ).toThrow();
  expect(() =>
    calculateSale([{ unit: 'UNIT', priceCents: 100, quantityBase: 1 }], {
      type: 'FIXED',
      amountCents: 101,
    }),
  ).toThrow();
  expect(
    calculateSale([{ unit: 'UNIT', priceCents: 100, quantityBase: 1 }], {
      type: 'PERCENT',
      basisPoints: 10000,
    }).totalCents,
  ).toBe(0);
  expect(validatePayments([], 0)).toEqual([]);
  expect(() => validatePayments([{ method: 'CASH', amountCents: 1 }], 0)).toThrow();
});
