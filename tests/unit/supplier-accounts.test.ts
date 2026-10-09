import { describe, expect, test } from 'vitest';
import { allocateSupplierPayment } from '../../src/domain/supplier-accounts';

describe('imputación de pagos a proveedores', () => {
  test('aplica primero a la deuda más antigua y permite un pago parcial', () => {
    expect(
      allocateSupplierPayment(12_000, [
        { purchaseId: 'primera', balanceCents: 10_000 },
        { purchaseId: 'segunda', balanceCents: 8_000 },
      ]),
    ).toEqual([
      { purchaseId: 'primera', amountCents: 10_000 },
      { purchaseId: 'segunda', amountCents: 2_000 },
    ]);
  });

  test('rechaza importe cero y pagos mayores al saldo', () => {
    expect(() => allocateSupplierPayment(0, [{ purchaseId: 'a', balanceCents: 1 }])).toThrow(
      'mayor a cero',
    );
    expect(() =>
      allocateSupplierPayment(101, [{ purchaseId: 'a', balanceCents: 100 }]),
    ).toThrow('supera');
  });
});

