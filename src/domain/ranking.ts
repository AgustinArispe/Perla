import type { MonthlyReport, RankedProduct } from '../shared/reports';
export const RANKING_LIMITS = [5, 10, 15, 25, 50] as const;
export type RankingLimit = (typeof RANKING_LIMITS)[number];
export type ProductRanking = 'revenue' | 'units' | 'kilos';
export function rankProducts(rows: RankedProduct[], kind: ProductRanking, limit?: number) {
  const value = (row: RankedProduct) => (kind === 'revenue' ? row.netCents : row.quantityBase);
  const sorted = [...rows].sort(
    (a, b) =>
      value(b) - value(a) || a.productId.localeCompare(b.productId) || a.unit.localeCompare(b.unit),
  );
  return limit === undefined ? sorted : sorted.slice(0, limit);
}
export function rankCategories(rows: NonNullable<MonthlyReport['categorySales']>, limit?: number) {
  const sorted = [...rows].sort((a, b) => b.netCents - a.netCents || a.name.localeCompare(b.name));
  return limit === undefined ? sorted : sorted.slice(0, limit);
}
