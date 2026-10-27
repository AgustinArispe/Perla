import { describe, expect, it } from 'vitest';
import {
  alignDaily,
  chartExtent,
  productShares,
  categoryShares,
} from '../../src/renderer/features/dashboard/chart-data';
import type { RankedProduct } from '../../src/shared/reports';

describe('visualización de resultados sin alterar sus cifras', () => {
  it('limita categorías a 10 por importe y no oculta negativos fuera del top', () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({
      name: `Categoría ${i + 1}`,
      netCents: (14 - i) * 100,
    }));
    const share = categoryShares(rows);
    expect(share.segments).toHaveLength(10);
    expect(share.segments[0]?.name).toBe('Categoría 1');
    expect(share.segments.at(-1)?.name).toBe('Categoría 10');
    expect(share.total).toBe(9500);
    expect(share.periodTotal).toBe(10500);
    expect(share.omittedCount).toBe(4);
    expect(categoryShares([...rows, { name: 'Devolución', netCents: -1 }]).drawable).toBe(false);
    expect(categoryShares([]).drawable).toBe(false);
  });
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
  it('muestra cada producto si hay menos de 25, sin agrupar Otros', () => {
    const share = productShares(rows, 'revenue');
    expect(share.drawable).toBe(true);
    expect(share.total).toBe(3600);
    expect(share.segments).toHaveLength(8);
    expect(share.segments.at(-1)).toMatchObject({ name: 'Producto 7', value: 100 });
    expect(share.segments.reduce((sum, row) => sum + row.value, 0)).toBe(share.total);
  });
  it('limita la dona a los 25 mayores sin alterar el período ni los datos originales', () => {
    const products = Array.from({ length: 40 }, (_, i) => ({
      ...rows[0]!,
      productId: String(i).padStart(2, '0'),
      name: `Artículo ${i}`,
      netCents: (40 - i) * 100,
    })).reverse();
    const original = structuredClone(products);
    const share = productShares(products, 'revenue');
    expect(share.segments).toHaveLength(25);
    expect(share.segments[0]?.name).toBe('Artículo 0');
    expect(share.segments.at(-1)?.name).toBe('Artículo 24');
    expect(share.segments.some((segment) => segment.id === 'other')).toBe(false);
    expect(share.total).toBe(70000);
    expect(share.periodTotal).toBe(82000);
    expect(share.omittedCount).toBe(15);
    expect(products).toEqual(original);
    expect(productShares([...products, { ...rows[0]!, netCents: -1 }], 'revenue').drawable).toBe(
      false,
    );
  });
  it('omite valores cero y desempata de forma estable', () => {
    const share = productShares(
      [
        { ...rows[0]!, productId: 'b', netCents: 100 },
        { ...rows[0]!, productId: 'a', netCents: 100 },
        { ...rows[0]!, netCents: 0 },
      ],
      'revenue',
    );
    expect(share.segments.map((segment) => segment.id)).toEqual(['a:UNIT', 'b:UNIT']);
    expect(share.total).toBe(200);
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
