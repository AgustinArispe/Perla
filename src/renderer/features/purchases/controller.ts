import type { Product } from '../../../shared/catalog';
import type { PurchaseDraftBody } from '../../../shared/purchases';

export function addPurchaseProduct(
  draft: PurchaseDraftBody,
  product: Product,
  unitCostCents: number,
  createId: () => string = () => crypto.randomUUID(),
): PurchaseDraftBody {
  const existing = draft.lines.find((line) => line.productId === product.id);
  if (existing)
    return {
      ...draft,
      lines: draft.lines.map((line) =>
        line.productId === product.id
          ? { ...line, quantityBase: line.quantityBase + (product.saleUnit === 'KG' ? 1000 : 1) }
          : line,
      ),
    };
  return {
    ...draft,
    lines: [
      ...draft.lines,
      {
        lineId: createId(),
        productId: product.id,
        quantityBase: product.saleUnit === 'KG' ? 1000 : 1,
        unitCostCents,
        expectedProductRevision: product.revision,
      },
    ],
  };
}

export function updatePurchaseLine(
  draft: PurchaseDraftBody,
  productId: string,
  patch: {
    quantityBase?: number;
    unitCostCents?: number;
    lotCode?: string | undefined;
    expiresOn?: string | null | undefined;
  },
): PurchaseDraftBody {
  if (patch.quantityBase !== undefined && patch.quantityBase <= 0)
    return { ...draft, lines: draft.lines.filter((line) => line.productId !== productId) };
  return {
    ...draft,
    lines: draft.lines.map((line) => (line.productId === productId ? { ...line, ...patch } : line)),
  };
}
