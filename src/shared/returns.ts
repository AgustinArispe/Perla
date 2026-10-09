import { z } from 'zod';
import { IdSchema } from './catalog';
import { MAX_QUANTITY } from '../domain/values';

export const ReturnItemSchema = z.strictObject({
  saleItemId: IdSchema,
  quantityBase: z.number().int().min(1).max(MAX_QUANTITY),
  disposition: z.enum(['RESTOCK', 'WASTE', 'NONE']),
});

export const ReturnConfirmSchema = z
  .strictObject({
    saleId: IdSchema,
    operationKey: IdSchema,
    reason: z.string().trim().min(3).max(240),
    refundMethod: z.enum(['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'OTHER']),
    items: z.array(ReturnItemSchema).min(1).max(100),
  })
  .refine((value) => new Set(value.items.map((item) => item.saleItemId)).size === value.items.length, {
    message: 'Cada producto puede aparecer una sola vez en la devolución.',
  });

export type ReturnConfirmInput = z.infer<typeof ReturnConfirmSchema>;

export interface ReturnPreview {
  saleId: string;
  saleNumber: number;
  items: {
    saleItemId: string;
    productId: string;
    name: string;
    unit: 'UNIT' | 'KG';
    soldQuantityBase: number;
    returnedQuantityBase: number;
    availableQuantityBase: number;
    refundableCents: number;
    soldNetCents: number;
    returnedNetCents: number;
    trackableReturn: boolean;
  }[];
}

export interface SaleReturnDetail {
  id: string;
  number: number;
  saleId: string;
  saleNumber: number;
  status: 'CONFIRMED';
  reason: string;
  totalCents: number;
  accountOffsetCents: number;
  refundCents: number;
  costCents: number | null;
  refundMethod: ReturnConfirmInput['refundMethod'];
  actorUserId: string;
  actorName: string;
  createdAt: string;
  input: ReturnConfirmInput;
  items: (ReturnConfirmInput['items'][number] & {
    id: string;
    productId: string;
    name: string;
    unit: 'UNIT' | 'KG';
    netCents: number;
    costCents: number | null;
  })[];
}
