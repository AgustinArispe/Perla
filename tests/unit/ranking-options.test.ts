import { expect, it } from 'vitest';
import { RANKING_LIMITS, rankProducts, rankCategories } from '../../src/domain/ranking';
import { categoryShares, productShares } from '../../src/renderer/features/dashboard/chart-data';
import { ExcelRequestSchema } from '../../src/shared/excel';
it('aplica los cinco límites sin mutar los datos y conserva los totales del período', () => {
  const products = Array.from({ length: 60 }, (_, i) => ({
    productId: String(i).padStart(3, '0'),
    name: `Producto ${i}`,
    unit: 'UNIT' as const,
    netCents: (60 - i) * 100,
    quantityBase: i + 1,
  }));
  const categories = products.map((row) => ({ name: row.name, netCents: row.netCents }));
  for (const limit of RANKING_LIMITS) {
    expect(productShares(products, 'revenue', limit).segments).toHaveLength(limit);
    expect(categoryShares(categories, limit).segments).toHaveLength(limit);
    expect(rankProducts(products, 'units', limit)[0]?.name).toBe('Producto 59');
    expect(rankCategories(categories, limit)[0]?.name).toBe('Producto 0');
    expect(productShares(products, 'revenue', limit).periodTotal).toBe(183000);
    expect(
      ExcelRequestSchema.safeParse({
        dataset: 'ranking',
        filters: { rank: 'categories', topCount: limit },
      }).success,
    ).toBe(true);
  }
  expect(products[0]?.name).toBe('Producto 0');
  expect(categoryShares([...categories, { name: 'Devolución', netCents: -1 }], 5).drawable).toBe(
    false,
  );
});
it('rechaza límites no previstos y filtros de Top en módulos ajenos', () => {
  for (const value of [-1, 0, 6, 100, 1.5, '5'])
    expect(
      ExcelRequestSchema.safeParse({ dataset: 'ranking', filters: { topCount: value } }).success,
    ).toBe(false);
  expect(
    ExcelRequestSchema.safeParse({ dataset: 'products', filters: { topCount: 5 } }).success,
  ).toBe(false);
});
