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

export function productShares(rows: RankedProduct[], kind: 'revenue' | 'units' | 'kilos') {
  const value = (row: RankedProduct) => (kind === 'revenue' ? row.netCents : row.quantityBase);
  const ordered = [...rows].sort(
    (a, b) => value(b) - value(a) || a.productId.localeCompare(b.productId),
  );
  const total = ordered.reduce((sum, row) => sum + value(row), 0);
  const segments = ordered.slice(0, 5).map((row) => ({
    id: row.productId + ':' + row.unit,
    name: row.name,
    value: value(row),
  }));
  const other = ordered.slice(5).reduce((sum, row) => sum + value(row), 0);
  if (other) segments.push({ id: 'other', name: 'Otros', value: other });
  return { total, drawable: total > 0 && ordered.every((row) => value(row) >= 0), segments };
}
