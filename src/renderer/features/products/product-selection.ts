import type { Product } from '../../../shared/catalog';

export function updateProductSelection(
  selected: Record<string, Product>,
  rows: Product[],
  checked: boolean,
): Record<string, Product> {
  const next = { ...selected };
  for (const product of rows) {
    if (checked) next[product.id] = product;
    else delete next[product.id];
  }
  return Object.keys(next).length > 5000 ? selected : next;
}

export function refreshSelectedProduct(
  selected: Record<string, Product>,
  product: Product,
): Record<string, Product> {
  return selected[product.id] ? { ...selected, [product.id]: product } : selected;
}
