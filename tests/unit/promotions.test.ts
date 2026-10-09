import { describe, expect, it } from 'vitest';
import { applyPromotions, type PricingLine, type PromotionRule } from '../../src/domain/promotions';

const lines: PricingLine[] = [
  { lineId: 'a', productId: 'a', unit: 'UNIT', priceCents: 1000, quantityBase: 7 },
  { lineId: 'b', productId: 'b', unit: 'UNIT', priceCents: 2000, quantityBase: 2 },
];
const base = { name: 'Oferta', revision: 1, priority: 10, productIds: ['a'] };

describe('motor de promociones', () => {
  it('aplica X por Y repetible y deja el excedente disponible', () => {
    const rules: PromotionRule[] = [
      { ...base, id: '3x2', type: 'X_FOR_Y', buyQuantity: 3, payQuantity: 2 },
      { ...base, id: 'resto', name: '10% resto', type: 'PERCENT', basisPoints: 1000, priority: 5 },
    ];
    const result = applyPromotions(lines, rules);
    expect(result.discountCents).toBe(2100);
    expect(result.lines[0]).toMatchObject({ discountCents: 2100, netCents: 4900 });
    expect(result.applications.map((a) => [a.promotionId, a.discountCents])).toEqual([['3x2', 2000], ['resto', 100]]);
  });

  it('resuelve la misma prioridad por mayor ahorro y desempata estable', () => {
    const rules: PromotionRule[] = [
      { ...base, id: 'z-10', type: 'PERCENT', basisPoints: 1000 },
      { ...base, id: 'a-20', type: 'PERCENT', basisPoints: 2000 },
    ];
    expect(applyPromotions(lines, rules).applications.map((a) => a.promotionId)).toEqual(['a-20']);
  });

  it('prorratea un combo con suma exacta entre productos', () => {
    const rules: PromotionRule[] = [{
      id: 'combo', name: 'Combo', revision: 2, priority: 20, type: 'COMBO_PRICE', productIds: [],
      comboPriceCents: 2500, components: [{ productId: 'a', quantityBase: 1 }, { productId: 'b', quantityBase: 1 }],
    }];
    const result = applyPromotions(lines, rules);
    expect(result.discountCents).toBe(1000);
    expect(result.applications[0]?.allocations.reduce((sum, item) => sum + item.discountCents, 0)).toBe(1000);
  });

  it('aplica un precio especial desde la cantidad indicada', () => {
    const rules: PromotionRule[] = [{
      ...base,
      id: 'cantidad',
      type: 'QUANTITY_PRICE',
      thresholdBase: 5,
      specialPriceCents: 800,
    }];
    const result = applyPromotions(lines, rules);
    expect(result.lines[0]).toMatchObject({ grossCents: 7000, discountCents: 1400, netCents: 5600 });
  });
});
