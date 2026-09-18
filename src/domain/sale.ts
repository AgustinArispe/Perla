import { DraftBodySchema } from '../shared/catalog';
import { DomainError } from '../shared/errors';
import { MAX_MONEY, MAX_QUANTITY } from './values';
import type { z } from 'zod';
type Discount = z.infer<typeof DraftBodySchema>['discount'];
export function calculateSale(
  lines: { unit: 'UNIT' | 'KG'; priceCents: number; quantityBase: number }[],
  rawDiscount: Discount,
) {
  const discount = DraftBodySchema.shape.discount.parse(rawDiscount);
  if (!lines.length || lines.length > 200)
    throw new DomainError('VALIDATION', 'La venta requiere productos.');
  const gross = lines.map((line) => {
    if (
      !['UNIT', 'KG'].includes(line.unit) ||
      !Number.isSafeInteger(line.priceCents) ||
      line.priceCents < 1 ||
      line.priceCents > MAX_MONEY ||
      !Number.isSafeInteger(line.quantityBase) ||
      line.quantityBase < 1 ||
      line.quantityBase > MAX_QUANTITY ||
      (line.unit === 'KG' && line.quantityBase > 99999)
    )
      throw new DomainError('VALIDATION', 'Precio o cantidad inválidos.');
    const value = BigInt(line.priceCents) * BigInt(line.quantityBase);
    return line.unit === 'KG' ? (value + 500n) / 1000n : value;
  });
  const subtotal = gross.reduce((s, v) => s + v, 0n);
  if (subtotal > BigInt(MAX_MONEY))
    throw new DomainError('VALIDATION', 'El importe supera el máximo permitido.');
  const reduction =
    discount.type === 'NONE'
      ? 0n
      : discount.type === 'FIXED'
        ? BigInt(discount.amountCents)
        : (subtotal * BigInt(discount.basisPoints) + 5000n) / 10000n;
  if (reduction > subtotal) throw new DomainError('VALIDATION', 'El descuento supera el subtotal.');
  const allocations = gross.map((v) => (subtotal ? (v * reduction) / subtotal : 0n));
  let remainder = reduction - allocations.reduce((s, v) => s + v, 0n);
  const order = gross
    .map((v, i) => ({ i, fraction: subtotal ? (v * reduction) % subtotal : 0n }))
    .sort((a, b) => (a.fraction === b.fraction ? a.i - b.i : a.fraction > b.fraction ? -1 : 1));
  for (const { i } of order) {
    if (!remainder) break;
    allocations[i] = allocations[i]! + 1n;
    remainder--;
  }
  return {
    subtotalCents: Number(subtotal),
    discountCents: Number(reduction),
    totalCents: Number(subtotal - reduction),
    lines: gross.map((v, i) => ({
      grossCents: Number(v),
      discountCents: Number(allocations[i]!),
      netCents: Number(v - allocations[i]!),
    })),
  };
}
