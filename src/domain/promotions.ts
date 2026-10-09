export interface PricingLine {
  lineId: string;
  productId: string;
  unit: 'UNIT' | 'KG';
  priceCents: number;
  quantityBase: number;
}
interface RuleBase { id: string; name: string; revision: number; priority: number; productIds: string[] }
export type PromotionRule = RuleBase & (
  | { type: 'PERCENT'; basisPoints: number }
  | { type: 'X_FOR_Y'; buyQuantity: number; payQuantity: number }
  | { type: 'QUANTITY_PRICE'; thresholdBase: number; specialPriceCents: number }
  | { type: 'COMBO_PRICE'; comboPriceCents: number; components: { productId: string; quantityBase: number }[] }
);
export interface PromotionApplication {
  promotionId: string;
  name: string;
  revision: number;
  discountCents: number;
  allocations: { lineId: string; quantityBase: number; discountCents: number }[];
}

const gross = (line: PricingLine, quantity: number) =>
  line.unit === 'KG'
    ? Number((BigInt(line.priceCents) * BigInt(quantity) + 500n) / 1000n)
    : line.priceCents * quantity;

function prorate(total: number, values: { lineId: string; quantityBase: number; gross: number }[]) {
  const base = values.reduce((sum, value) => sum + value.gross, 0);
  const allocations = values.map((value) => ({ ...value, discountCents: base ? Math.floor((value.gross * total) / base) : 0 }));
  let remainder = total - allocations.reduce((sum, value) => sum + value.discountCents, 0);
  const order = allocations
    .map((value, index) => ({ index, fraction: base ? (value.gross * total) % base : 0 }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (!remainder) break;
    allocations[item.index]!.discountCents++;
    remainder--;
  }
  return allocations.map(({ lineId, quantityBase, discountCents }) => ({ lineId, quantityBase, discountCents }));
}

function candidate(rule: PromotionRule, lines: PricingLine[], available: number[]): PromotionApplication | null {
  const values: { lineId: string; quantityBase: number; gross: number }[] = [];
  if (rule.type === 'COMBO_PRICE') {
    const occurrences = Math.min(...rule.components.map((component) => {
      const index = lines.findIndex((line) => line.productId === component.productId);
      return index < 0 ? 0 : Math.floor(available[index]! / component.quantityBase);
    }));
    if (!occurrences) return null;
    for (const component of rule.components) {
      const index = lines.findIndex((line) => line.productId === component.productId);
      const quantityBase = component.quantityBase * occurrences;
      values.push({ lineId: lines[index]!.lineId, quantityBase, gross: gross(lines[index]!, quantityBase) });
    }
    const discount = values.reduce((sum, value) => sum + value.gross, 0) - rule.comboPriceCents * occurrences;
    if (discount <= 0) return null;
    return { promotionId: rule.id, name: rule.name, revision: rule.revision, discountCents: discount, allocations: prorate(discount, values) };
  }
  for (const [index, line] of lines.entries()) {
    if (!rule.productIds.includes(line.productId) || available[index] === 0) continue;
    const free = available[index]!;
    if (rule.type === 'PERCENT') {
      values.push({ lineId: line.lineId, quantityBase: free, gross: gross(line, free) });
    } else if (rule.type === 'X_FOR_Y') {
      if (line.unit !== 'UNIT') continue;
      const occurrences = Math.floor(free / rule.buyQuantity);
      if (occurrences) {
        const quantityBase = occurrences * rule.buyQuantity;
        values.push({ lineId: line.lineId, quantityBase, gross: line.priceCents * quantityBase });
      }
    } else if (free >= rule.thresholdBase) {
      values.push({ lineId: line.lineId, quantityBase: free, gross: gross(line, free) });
    }
  }
  if (!values.length) return null;
  let discount: number;
  if (rule.type === 'PERCENT')
    discount = Math.round(values.reduce((sum, value) => sum + value.gross, 0) * rule.basisPoints / 10000);
  else if (rule.type === 'X_FOR_Y')
    discount = values.reduce((sum, value) => {
      const line = lines.find((item) => item.lineId === value.lineId)!;
      return sum + (value.quantityBase / rule.buyQuantity) * (rule.buyQuantity - rule.payQuantity) * line.priceCents;
    }, 0);
  else
    discount = values.reduce((sum, value) => {
      const line = lines.find((item) => item.lineId === value.lineId)!;
      const special = line.unit === 'KG'
        ? Number((BigInt(rule.specialPriceCents) * BigInt(value.quantityBase) + 500n) / 1000n)
        : rule.specialPriceCents * value.quantityBase;
      return sum + value.gross - special;
    }, 0);
  if (discount <= 0) return null;
  return { promotionId: rule.id, name: rule.name, revision: rule.revision, discountCents: discount, allocations: prorate(discount, values) };
}

export function applyPromotions(lines: PricingLine[], rules: PromotionRule[]) {
  const available = lines.map((line) => line.quantityBase);
  const applications: PromotionApplication[] = [];
  const priorities = [...new Set(rules.map((rule) => rule.priority))].sort((a, b) => b - a);
  for (const priority of priorities) {
    const pending = new Set(rules.filter((rule) => rule.priority === priority).map((rule) => rule.id));
    while (pending.size) {
      const options = rules
        .filter((rule) => pending.has(rule.id))
        .map((rule) => ({ rule, application: candidate(rule, lines, available) }))
        .filter((item): item is { rule: PromotionRule; application: PromotionApplication } => Boolean(item.application))
        .sort((a, b) => b.application.discountCents - a.application.discountCents || a.rule.id.localeCompare(b.rule.id));
      if (!options.length) break;
      const chosen = options[0]!;
      pending.delete(chosen.rule.id);
      for (const allocation of chosen.application.allocations) {
        const index = lines.findIndex((line) => line.lineId === allocation.lineId);
        available[index] = available[index]! - allocation.quantityBase;
      }
      applications.push(chosen.application);
    }
  }
  const lineDiscounts = new Map<string, number>();
  for (const application of applications)
    for (const allocation of application.allocations)
      lineDiscounts.set(allocation.lineId, (lineDiscounts.get(allocation.lineId) ?? 0) + allocation.discountCents);
  const resultLines = lines.map((line) => {
    const grossCents = gross(line, line.quantityBase);
    const discountCents = lineDiscounts.get(line.lineId) ?? 0;
    return { lineId: line.lineId, grossCents, discountCents, netCents: grossCents - discountCents };
  });
  return {
    subtotalCents: resultLines.reduce((sum, line) => sum + line.grossCents, 0),
    discountCents: applications.reduce((sum, item) => sum + item.discountCents, 0),
    totalCents: resultLines.reduce((sum, line) => sum + line.netCents, 0),
    lines: resultLines,
    applications,
  };
}
