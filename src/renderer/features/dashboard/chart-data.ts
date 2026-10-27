import type { RankedProduct } from '../../../shared/reports';
import type { MonthlyReport } from '../../../shared/reports';

export function alignDaily(current: MonthlyReport['daily'], previous: MonthlyReport['daily']) {
  return Array.from({ length: Math.max(current.length, previous.length) }, (_, index) => ({
    current: current[index],
    previous: previous[index],
  }));
}

export function chartExtent(values: number[]) {
  const low = Math.min(0, ...values),
    high = Math.max(0, ...values);
  const rough = (high - low || 100) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step || step;
  const ticks: number[] = [];
  for (let value = max; value >= min; value -= step) ticks.push(value);
  return { min, max, ticks };
}

export const TOP_PRODUCTS_LIMIT = 25;
export const TOP_CATEGORIES_LIMIT = 10;

function limitedShares(rows: { id: string; name: string; value: number }[], limit: number) {
  const ordered = [...rows].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const periodTotal = ordered.reduce((sum, row) => sum + row.value, 0);
  const positive = ordered.filter((row) => row.value > 0);
  const segments = positive.slice(0, limit);
  return {
    total: segments.reduce((sum, row) => sum + row.value, 0),
    periodTotal,
    omittedCount: Math.max(0, positive.length - limit),
    drawable: segments.length > 0 && ordered.every((row) => row.value >= 0),
    segments,
  };
}

export function categoryShares(rows: NonNullable<MonthlyReport['categorySales']>) {
  return limitedShares(
    rows.map((row) => ({ id: row.name, name: row.name, value: row.netCents })),
    TOP_CATEGORIES_LIMIT,
  );
}

export function productShares(rows: RankedProduct[], kind: 'revenue' | 'units' | 'kilos') {
  const value = (row: RankedProduct) => (kind === 'revenue' ? row.netCents : row.quantityBase);
  return limitedShares(
    rows.map((row) => ({
      id: row.productId + ':' + row.unit,
      name: row.name,
      value: value(row),
    })),
    TOP_PRODUCTS_LIMIT,
  );
}
