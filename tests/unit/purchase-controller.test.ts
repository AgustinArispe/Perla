import { expect, test } from 'vitest';
import {
  addPurchaseProduct,
  updatePurchaseLine,
} from '../../src/renderer/features/purchases/controller';
import type { PurchaseDraftBody } from '../../src/shared/purchases';
import type { Product } from '../../src/shared/catalog';

const draft: PurchaseDraftBody = {
  receiptKey: 'd9428888-122b-4f1d-a179-217b91bb44f9',
  supplierId: null,
  businessDate: '2026-10-02',
  lines: [],
};
const product = {
  id: '4baf9ca7-7a27-48bc-94c5-7e36771d98a7',
  name: 'Atún',
  saleUnit: 'UNIT',
  revision: 3,
} as Product;

test('agrega un producto y un nuevo escaneo incrementa la misma línea', () => {
  const first = addPurchaseProduct(
    draft,
    product,
    12000,
    () => 'eeedc048-f030-41ed-a3b2-9b50b2d09486',
  );
  const second = addPurchaseProduct(first, product, 13000, () => 'no-se-usa');
  expect(second.lines).toHaveLength(1);
  expect(second.lines[0]).toMatchObject({ quantityBase: 2, unitCostCents: 12000 });
});

test('actualiza cantidades y elimina el renglón al llevarlo a cero', () => {
  const first = addPurchaseProduct(
    draft,
    product,
    12000,
    () => 'eeedc048-f030-41ed-a3b2-9b50b2d09486',
  );
  expect(updatePurchaseLine(first, product.id, { quantityBase: 4 }).lines[0]?.quantityBase).toBe(4);
  expect(updatePurchaseLine(first, product.id, { quantityBase: 0 }).lines).toEqual([]);
});
