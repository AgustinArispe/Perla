import { describe, expect, it } from 'vitest';
import {
  alignDaily,
  chartExtent,
  productShares,
} from '../../src/renderer/features/dashboard/chart-data';
import type { RankedProduct } from '../../src/shared/reports';

describe('visualización de resultados sin alterar sus cifras', () => {
  it('conserva los días reales del mes anterior cuando el elegido es más corto', () => {
    const days = (month: string, length: number) =>
      Array.from({ length }, (_, index) => ({
        date: `${month}-${String(index + 1).padStart(2, '0')}`,
        netCents: 100,
        saleCount: 1,
      }));
    const aligned = alignDaily(days('2026-02', 28), days('2026-01', 31));
    expect(aligned).toHaveLength(31);
    expect(aligned.at(-1)?.current).toBeUndefined();
    expect(aligned.at(-1)?.previous?.date).toBe('2026-01-31');
  });
  it('incluye cero, negativos y máximos positivos en una escala legible', () => {
    const extent = chartExtent([-125, 610]);
    expect(extent.min).toBeLessThanOrEqual(-125);
    expect(extent.max).toBeGreaterThanOrEqual(610);
    expect(extent.ticks).toContain(0);
    expect(extent.ticks.length).toBeLessThanOrEqual(7);
    expect(chartExtent([0, 0]).max).toBeGreaterThan(0);
  });
  const rows: RankedProduct[] = Array.from({ length: 8 }, (_, i) => ({
    productId: String(i),
    name: 'Producto ' + i,
    unit: 'UNIT',
    quantityBase: 8 - i,
    netCents: (8 - i) * 100,
  }));
  it('conserva el universo completo al agrupar Top 5 y Otros', () => {
    const share = productShares(rows, 'revenue');
    expect(share.drawable).toBe(true);
    expect(share.total).toBe(3600);
    expect(share.segments).toHaveLength(6);
    expect(share.segments.at(-1)).toMatchObject({ name: 'Otros', value: 600 });
    expect(share.segments.reduce((sum, row) => sum + row.value, 0)).toBe(share.total);
  });
  it('rechaza una dona que ocultaría devoluciones negativas', () => {
    expect(productShares([...rows, { ...rows[0]!, netCents: -30 }], 'revenue').drawable).toBe(
      false,
    );
  });
  it('mantiene cantidades independientes de los importes', () => {
    expect(productShares(rows, 'units').total).toBe(36);
    expect(productShares([], 'revenue').drawable).toBe(false);
  });
});
