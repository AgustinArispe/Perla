import { expect, test } from 'vitest';
import {
  PurchaseDraftBodySchema,
  PurchaseReceiveSchema,
  SupplierSaveSchema,
} from '../../src/shared/purchases';
import { purchaseLineSubtotal, purchaseTotal } from '../../src/domain/purchases';
import { purchasePayloadHash } from '../../src/worker/purchases/hash';

const id = 'd9428888-122b-4f1d-a179-217b91bb44f9';

test('el proveedor requiere solo nombre y agrupa datos opcionales limitados', () => {
  expect(SupplierSaveSchema.parse({ name: 'Puerto Fresco' })).toMatchObject({
    name: 'Puerto Fresco',
  });
  expect(() => SupplierSaveSchema.parse({ name: 'A' })).toThrow();
  expect(() => SupplierSaveSchema.parse({ name: 'Puerto', notes: 'x'.repeat(1001) })).toThrow();
});

test('el borrador rechaza productos repetidos y cantidades no enteras', () => {
  const line = {
    lineId: id,
    productId: id,
    quantityBase: 1,
    unitCostCents: 100,
    expectedProductRevision: 1,
  };
  const base = {
    receiptKey: id,
    supplierId: id,
    businessDate: '2026-10-02',
  };
  expect(() => PurchaseDraftBodySchema.parse({ ...base, lines: [line, line] })).toThrow();
  expect(() =>
    PurchaseDraftBodySchema.parse({ ...base, lines: [{ ...line, quantityBase: 1.5 }] }),
  ).toThrow();
});

test('permite preparar un costo pendiente pero no confirmar la compra', () => {
  const line = {
    lineId: id,
    productId: id,
    quantityBase: 1,
    unitCostCents: 0,
    expectedProductRevision: 1,
  };
  const body = { receiptKey: id, supplierId: id, businessDate: '2026-10-02', lines: [line] };
  expect(PurchaseDraftBodySchema.parse(body).lines[0]?.unitCostCents).toBe(0);
  expect(() => PurchaseReceiveSchema.parse(body)).toThrow('Ingresá el costo');
});

test('calcula costos exactos por unidad y kilogramo sin floats persistidos', () => {
  expect(purchaseLineSubtotal('UNIT', 3, 12550)).toBe(37650);
  expect(purchaseLineSubtotal('KG', 250, 1001)).toBe(250);
  expect(purchaseLineSubtotal('KG', 999, 1001)).toBe(1000);
  expect(() => purchaseTotal([9_999_999_999, 1])).toThrow('máximo');
});

test('el hash canónico no depende del orden de propiedades', () => {
  expect(purchasePayloadHash({ a: 1, b: { c: 2 } })).toBe(
    purchasePayloadHash({ b: { c: 2 }, a: 1 }),
  );
  expect(purchasePayloadHash({ a: 1 })).not.toBe(purchasePayloadHash({ a: 2 }));
});
