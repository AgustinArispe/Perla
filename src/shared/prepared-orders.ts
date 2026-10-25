import { z } from 'zod';
import { DraftBodySchema } from './catalog';
import type { SaleQuote } from './sales';
export const PreparedOrderCreateSchema = z.strictObject({
  operationKey: z.uuid(),
  customerName: z.string().trim().min(2).max(160),
  note: z.string().trim().max(1000).default(''),
  body: DraftBodySchema.refine((v) => v.lines.length > 0, 'Agregá productos a la orden.'),
});
export const PreparedOrderListSchema = z.strictObject({
  status: z.enum(['READY', 'PAID', 'CANCELLED']).optional(),
  number: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).max(1000000).default(0),
});
export const PreparedOrderNumberSchema = z.strictObject({ number: z.number().int().positive() });
export const PreparedOrderCancelSchema = z.strictObject({
  orderId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  operationKey: z.uuid(),
  reason: z.string().trim().min(3).max(240),
});
export interface PreparedOrder {
  id: string;
  number: number;
  status: 'READY' | 'PAID' | 'CANCELLED';
  revision: number;
  customerName: string;
  note: string;
  createdAt: string;
  preparedBy: string;
  locationId: string;
  locationName: string;
  body: z.infer<typeof DraftBodySchema>;
  quote: SaleQuote;
  items: {
    productId: string;
    name: string;
    sku: string;
    unit: 'UNIT' | 'KG';
    quantityBase: number;
    unitPriceCents: number;
  }[];
  saleId: string | null;
  saleNumber: number | null;
  paidAt: string | null;
  paidBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
}
export type PreparedOrderCreate = z.input<typeof PreparedOrderCreateSchema>;
export type PreparedOrderList = z.input<typeof PreparedOrderListSchema>;
export type PreparedOrderCancel = z.infer<typeof PreparedOrderCancelSchema>;
