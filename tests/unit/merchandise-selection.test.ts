import { describe, expect, it } from 'vitest';
import type { Product } from '../../src/shared/catalog';
import {
  refreshSelectedProduct,
  updateProductSelection,
} from '../../src/renderer/features/products/product-selection';

const product = (id: string, revision = 1) =>
  ({ id, name: id, revision, priceCents: revision * 100 }) as Product;

describe('catalog selection across searches and pages', () => {
  it('keeps A when selecting B and removes only the current page', () => {
    const a = product('A');
    const b = product('B');
    const first = updateProductSelection({}, [a], true);
    const second = updateProductSelection(first, [b], true);
    expect(Object.keys(second)).toEqual(['A', 'B']);
    expect(updateProductSelection(second, [b], false)).toEqual({ A: a });
    expect(first).toEqual({ A: a });
  });
  it('refreshes selected revisions after a mutation without losing other pages', () => {
    const a = product('A');
    const b = product('B');
    const edited = product('A', 2);
    expect(refreshSelectedProduct({ A: a, B: b }, edited)).toEqual({ A: edited, B: b });
    const original = { B: b };
    expect(refreshSelectedProduct(original, edited)).toBe(original);
  });
  it('keeps the existing selection when a page would exceed the export limit', () => {
    const selected = Object.fromEntries(
      Array.from({ length: 5000 }, (_, index) => [String(index), product(String(index))]),
    );
    expect(updateProductSelection(selected, [product('extra')], true)).toBe(selected);
  });
});
