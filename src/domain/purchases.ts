import { MAX_MONEY } from './values';

export function purchaseLineSubtotal(
  unit: 'UNIT' | 'KG',
  quantityBase: number,
  unitCostCents: number,
): number {
  const divisor = unit === 'KG' ? 1000n : 1n;
  const numerator = BigInt(quantityBase) * BigInt(unitCostCents);
  const cents = (numerator + divisor / 2n) / divisor;
  if (cents < 0n || cents > BigInt(MAX_MONEY))
    throw new Error('El subtotal supera el máximo permitido.');
  return Number(cents);
}

export function purchaseTotal(subtotals: number[]): number {
  const total = subtotals.reduce((sum, subtotal) => sum + BigInt(subtotal), 0n);
  if (total > BigInt(MAX_MONEY)) throw new Error('El total supera el máximo permitido.');
  return Number(total);
}
