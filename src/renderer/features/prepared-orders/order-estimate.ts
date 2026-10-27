import type { Product } from '../../../shared/catalog';
import { calculateSale } from '../../../domain/sale';
import { parseQuantity } from '../../../domain/values';
export function estimateOrder(
  lines: { product: Pick<Product, 'saleUnit' | 'priceCents'>; quantity: string }[],
) {
  if (!lines.length) return { totalCents: 0, lineTotals: [] as number[] };
  try {
    const result = calculateSale(
      lines.map((line) => ({
        unit: line.product.saleUnit,
        priceCents: line.product.priceCents,
        quantityBase: parseQuantity(line.quantity, line.product.saleUnit),
      })),
      { type: 'NONE' },
    );
    return { totalCents: result.totalCents, lineTotals: result.lines.map((line) => line.netCents) };
  } catch {
    return null;
  }
}
