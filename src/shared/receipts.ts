import { z } from 'zod';
import { IdSchema } from './catalog';
import type { SaleDetail } from './sales';

export const ReceiptFormatSchema = z.enum(['THERMAL_58', 'THERMAL_80', 'A4']);
export const ReceiptStatusSchema = z.enum(['PENDING', 'PRINTED']);
export const ReceiptCreateSchema = z.strictObject({
  saleId: IdSchema,
  format: ReceiptFormatSchema.default('THERMAL_80'),
  reprintReason: z.string().trim().min(2).max(160).optional(),
});
export const ReceiptListSchema = z.strictObject({ status: ReceiptStatusSchema.optional() });
export const ReceiptMarkPrintedSchema = z.strictObject({ receiptId: IdSchema });
export type ReceiptCreateInput = z.infer<typeof ReceiptCreateSchema>;
export interface ReceiptSnapshot {
  title: 'COMPROBANTE DE VENTA — NO FISCAL';
  businessName: string;
  sale: SaleDetail;
}
export interface SaleReceipt {
  id: string;
  saleId: string;
  saleNumber: number;
  format: z.infer<typeof ReceiptFormatSchema>;
  status: z.infer<typeof ReceiptStatusSchema>;
  snapshot: ReceiptSnapshot;
  reprintReason: string | null;
  createdAt: string;
  printedAt: string | null;
}
export interface ReceiptPage { items: SaleReceipt[]; total: number; }
