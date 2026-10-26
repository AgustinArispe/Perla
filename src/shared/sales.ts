import { z } from 'zod';
import { DraftBodySchema, IdSchema } from './catalog';
import { MAX_MONEY } from '../domain/values';
export const PaymentSchema = z.strictObject({
  method: z.enum(['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'OTHER']),
  amountCents: z.number().int().min(1).max(MAX_MONEY),
  tenderedCents: z.number().int().min(1).max(MAX_MONEY).optional(),
});
export type PaymentInput = z.infer<typeof PaymentSchema>;
export const CheckoutSchema = DraftBodySchema.extend({
  payments: z.array(PaymentSchema).max(20),
  customerId: IdSchema.nullable().optional(),
  onAccountCents: z.number().int().min(0).max(MAX_MONEY).default(0),
  expectedQuoteHash: z.string().length(64).optional(),
  expectedDraftRevision: z.number().int().positive().optional(),
  negativeStockOverride: z.strictObject({ reason: z.string().trim().min(3).max(240) }).optional(),
  locationId: IdSchema.optional(),
  preparedOrderId: IdSchema.optional(),
}).refine(
  (v) => v.lines.length > 0 && new Set(v.lines.map((l) => l.lineId)).size === v.lines.length,
  {
    message: 'La venta requiere productos con identificadores únicos.',
  },
);
export type CheckoutInput = z.input<typeof CheckoutSchema>;
export const SaleQuoteSchema = DraftBodySchema;
export interface SaleQuote {
  quoteHash: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  lines: { lineId: string; grossCents: number; discountCents: number; netCents: number }[];
  promotions: {
    promotionId: string;
    name: string;
    revision: number;
    discountCents: number;
    allocations: { lineId: string; quantityBase: number; discountCents: number }[];
  }[];
}
export const VoidSchema = z.strictObject({
  saleId: IdSchema,
  operationKey: IdSchema,
  reason: z.string().trim().min(3).max(240),
  acknowledgeRecount: z.boolean().optional(),
});
export type VoidInput = z.infer<typeof VoidSchema>;
const date = z.iso.date();
export const SalesSearchSchema = z
  .strictObject({
    fromDate: date.optional(),
    toDate: date.optional(),
    status: z.enum(['ALL', 'COMPLETED', 'VOIDED']).default('ALL'),
    limit: z.number().int().min(1).max(100),
    cursor: z.string().max(1200).optional(),
    businessUnitId: z.uuid().optional(),
  })
  .refine((v) => !v.fromDate || !v.toDate || v.fromDate <= v.toDate, {
    message: 'El rango de fechas no es válido.',
  });
export type SalesSearchInput = z.input<typeof SalesSearchSchema>;
export interface SaleSummary {
  businessUnitId?: string;
  businessUnitName?: string;
  id: string;
  number: number;
  checkoutKey: string;
  status: 'COMPLETED' | 'VOIDED';
  createdAt: string;
  businessDate: string;
  localMonth: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}
export interface SaleDetail extends SaleSummary {
  customerId?: string | null;
  customerName?: string | null;
  onAccountCents?: number;
  actorUserId: string | null;
  actorName: string | null;
  discount: z.infer<typeof DraftBodySchema>['discount'];
  promotions?: SaleQuote['promotions'];
  items: {
    id: string;
    lineId: string;
    productId: string;
    sku: string;
    barcode: string | null;
    name: string;
    unit: 'UNIT' | 'KG';
    unitPriceCents: number;
    quantityBase: number;
    grossCents: number;
    discountCents: number;
    promotionDiscountCents?: number;
    manualDiscountCents?: number;
    netCents: number;
    costMethod: 'WEIGHTED_AVERAGE' | 'REFERENCE' | null;
    costRateMicrosPerBase: number | null;
    costCents: number | null;
    costEffectiveAt: string | null;
    categoryName: string | null;
  }[];
  payments: (PaymentInput & { changeCents: number })[];
  events: {
    kind: 'COMPLETED' | 'VOIDED';
    reason: string;
    createdAt: string;
    clockWarning: string | null;
  }[];
}
export interface SalePage {
  items: SaleSummary[];
  total: number;
  nextCursor: string | null;
}
export interface VoidPreview {
  countedAfterSale: { productId: string; name: string }[];
}
