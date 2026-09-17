import { describe, expect, it } from 'vitest';
import { parseArs, parseQuantity, normalizeSearch } from '../../src/domain/values';
import { ProductSaveSchema } from '../../src/shared/catalog';

describe('valores del catálogo', () => {
  it.each([
    ['12.000,50', 1200050],
    ['12000,5', 1200050],
    ['0,01', 1],
    ['2500', 250000],
  ])('convierte %s sin floats', (value, cents) => {
    expect(parseArs(value)).toBe(cents);
  });
  it.each(['12.00,50', '12,000', '12000.50', '-1', 'NaN', '1e4', '', '9007199254740991'])(
    'rechaza precio ambiguo o inválido: %s',
    (value) => {
      expect(() => parseArs(value)).toThrow();
    },
  );
  it('conserva ceros de barcode y exige revisión al editar', () => {
    const input = {
      sku: ' LAC-01 ',
      barcode: '0123456789012',
      name: 'Leche entera',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1200050,
      active: true,
      trackStock: true,
      minStockBase: 0,
    };
    expect(ProductSaveSchema.parse(input)).toMatchObject({
      sku: 'LAC-01',
      barcode: '0123456789012',
    });
    expect(
      ProductSaveSchema.safeParse({ ...input, id: 'e5c1eb04-44f3-4b1e-853f-2905df074793' }).success,
    ).toBe(false);
    expect(ProductSaveSchema.safeParse({ ...input, priceCents: 1.5 }).success).toBe(false);
  });
  it('normaliza tildes y convierte mínimos en kilos a gramos enteros', () => {
    expect(normalizeSearch('  Jamón COCIDO  ')).toBe('jamon cocido');
    expect(parseQuantity('1,250', 'KG')).toBe(1250);
    expect(() => parseQuantity('1,5', 'UNIT')).toThrow();
    expect(() => parseQuantity('1,0001', 'KG')).toThrow();
  });
});
