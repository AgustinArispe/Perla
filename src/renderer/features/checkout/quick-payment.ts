import { MAX_MONEY } from '../../../domain/values';

/** Suggestions are tendered cash, never amounts applied to the sale. */
export function cashSuggestions(amountCents: number): number[] {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_MONEY) return [];
  return [
    ...new Set([
      amountCents,
      ...[100000, 500000, 1000000, 2000000].map((step) => Math.ceil(amountCents / step) * step),
    ]),
  ]
    .filter((value) => value <= MAX_MONEY)
    .slice(0, 4);
}
